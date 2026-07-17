import type { ConvexReactClient } from "convex/react";
import {
  getFunctionName,
  type FunctionReference,
  type FunctionReturnType,
  type PaginationResult,
} from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { AfferentError } from "../client/contracts.js";
import { mapAfferentError } from "./hooks/mutations.js";

export type AfferentWatchClient = Pick<ConvexReactClient, "watchQuery">;

export type DirectWatchSnapshot<T> =
  | Readonly<{ status: "loading"; retry: () => void }>
  | Readonly<{ status: "ready"; value: T; retry: () => void }>
  | Readonly<{
      status: "error";
      error: AfferentError;
      retry: () => void;
    }>;

export interface DirectWatchStore<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): DirectWatchSnapshot<T>;
  getServerSnapshot(): DirectWatchSnapshot<T>;
  retry(): void;
  dispose(): void;
}

export type PaginatedWatchStatus =
  "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";

export type PaginatedWatchSnapshot<T> = Readonly<{
  results: T[];
  status: PaginatedWatchStatus;
  error?: AfferentError;
  loadMore: (count: number) => void;
  retry: () => void;
}>;

export interface PaginatedWatchStore<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PaginatedWatchSnapshot<T>;
  getServerSnapshot(): PaginatedWatchSnapshot<T>;
  loadMore(count: number): void;
  retry(): void;
  dispose(): void;
}

interface Watch<T> {
  onUpdate(listener: () => void): () => void;
  localQueryResult(): T | undefined;
}

function isInvalidCursorError(error: unknown): boolean {
  let message = String(error);
  if (error instanceof Error) message = error.message;
  else if (typeof error === "object" && error !== null && "message" in error) {
    message = String((error as { message?: unknown }).message);
  }
  return /invalid[ _-]?cursor/i.test(message);
}

interface DirectStoreOptions<Query extends FunctionReference<"query">> {
  client: AfferentWatchClient;
  query: Query;
  args: Query["_args"];
  generation: number;
}

export function createDirectWatchStore<
  Query extends FunctionReference<"query">,
>(
  options: DirectStoreOptions<Query>,
): DirectWatchStore<FunctionReturnType<Query>> {
  type Result = FunctionReturnType<Query>;
  const listeners = new Set<() => void>();
  const loading = { status: "loading" as const, retry };
  let snapshot: DirectWatchSnapshot<Result> = loading;
  let watch: Watch<Result> | undefined;
  let stopWatch: (() => void) | undefined;
  let disposed = false;
  let epoch = 0;

  function publish(next: DirectWatchSnapshot<Result>) {
    if (disposed) return;
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function read(capturedEpoch: number) {
    if (disposed || capturedEpoch !== epoch || watch === undefined) return;
    try {
      const value = watch.localQueryResult();
      if (value === undefined) {
        if (snapshot.status !== "loading") publish(loading);
        return;
      }
      if (snapshot.status !== "ready" || snapshot.value !== value) {
        publish({ status: "ready", value, retry });
      }
    } catch (error) {
      publish({ status: "error", error: mapAfferentError(error), retry });
    }
  }

  function start() {
    if (disposed || watch !== undefined || listeners.size === 0) return;
    const capturedEpoch = epoch;
    watch = options.client.watchQuery(
      options.query,
      options.args,
    ) as unknown as Watch<Result>;
    // Subscribe before the first local read. A cached failure is therefore
    // Observed without a render-time throw and no server update can be missed.
    stopWatch = watch.onUpdate(() => read(capturedEpoch));
    read(capturedEpoch);
  }

  function stop() {
    stopWatch?.();
    stopWatch = undefined;
    watch = undefined;
  }

  function retry() {
    if (disposed) return;
    epoch += 1;
    stop();
    publish(loading);
    start();
  }

  return {
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      start();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => loading,
    retry,
    dispose() {
      if (disposed) return;
      disposed = true;
      epoch += 1;
      stop();
      listeners.clear();
    },
  };
}

type PageResult<T> = PaginationResult<T> & {
  contractVersion?: number;
  posts?: T[];
};

interface PageDescriptor<T> {
  key: number;
  cursor: string | null;
  endCursor?: string | null;
  numItems: number;
  epoch: number;
  result?: PageResult<T>;
  splitResult?: PageResult<T>;
  error?: AfferentError;
  watch?: Watch<PageResult<T>>;
  stop?: () => void;
}

type StructuralOperationKind = "append" | "split" | "collapse";

interface StructuralOperation<T> {
  epoch: number;
  kind: StructuralOperationKind;
  originals: PageDescriptor<T>[];
  replacements: PageDescriptor<T>[];
  error?: AfferentError;
}

interface PaginatedStoreOptions<
  Item,
  Query extends FunctionReference<"query", "public", any, PageResult<Item>>,
> {
  client: AfferentWatchClient;
  query: Query;
  args: Omit<Query["_args"], "paginationOpts">;
  generation: number;
  initialNumItems: number;
}

let paginationSessionId = 0;

export function createPaginatedWatchStore<
  Item,
  Query extends FunctionReference<"query", "public", any, PageResult<Item>>,
>(options: PaginatedStoreOptions<Item, Query>): PaginatedWatchStore<Item> {
  const listeners = new Set<() => void>();
  const loadMore = (count: number) => requestMore(count);
  const retry = () => restart(true);
  let snapshot: PaginatedWatchSnapshot<Item> = {
    results: [],
    status: "LoadingFirstPage",
    loadMore,
    retry,
  };
  const serverSnapshot = snapshot;
  let pages: PageDescriptor<Item>[] = [];
  let retainedResults: Item[] = [];
  let disposed = false;
  let storeEpoch = 0;
  let nextPageKey = 0;
  let sessionId = 0;
  let operation: StructuralOperation<Item> | undefined;
  let structuralScanQueued = false;

  function publish(next: PaginatedWatchSnapshot<Item>) {
    if (disposed) return;
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function stopPage(page: PageDescriptor<Item>) {
    page.stop?.();
    page.stop = undefined;
    page.watch = undefined;
  }

  function invariantError(message: string): AfferentError {
    return {
      contractVersion: 1,
      code: "UNKNOWN",
      message: `Pagination invariant failed: ${message}`,
    };
  }

  function sameBoundary(
    left: string | null | undefined,
    right: string | null | undefined,
  ) {
    return left === right;
  }

  function chainError(
    chain: PageDescriptor<Item>[],
    operationKind?: StructuralOperationKind,
  ): AfferentError | undefined {
    const context = operationKind ? `${operationKind} ` : "";
    for (let index = 0; index < chain.length - 1; index += 1) {
      const current = chain[index];
      const next = chain[index + 1];
      if (current.endCursor === undefined) {
        return invariantError(
          `${context}boundary ${current.key}->${next.key}: non-tail window is unbounded`,
        );
      }
      if (!sameBoundary(current.endCursor, next.cursor)) {
        return invariantError(
          `${context}boundary ${current.key}->${next.key}: ${String(current.endCursor)} != ${String(next.cursor)}`,
        );
      }
    }
    return undefined;
  }

  function coherentPrefix() {
    const results: Item[] = [];
    const boundaryError = chainError(pages);
    if (boundaryError) return { results, error: boundaryError, pending: false };
    for (const page of pages) {
      if (page.error) {
        return { results, error: page.error, pending: false };
      }
      if (!page.result || page.result.pageStatus === "SplitRequired") {
        return { results, pending: true };
      }
      results.push(...page.result.page);
    }
    return { results, pending: false };
  }

  function visibleResults() {
    const coherent = coherentPrefix();
    return coherent.results.length > 0 || pages[0]?.result !== undefined
      ? coherent.results
      : retainedResults;
  }

  function refreshSnapshot() {
    if (disposed) return;
    const coherent = coherentPrefix();
    const results =
      coherent.results.length > 0 || pages[0]?.result !== undefined
        ? coherent.results
        : retainedResults;
    const error = coherent.error ?? operation?.error;
    if (error) {
      publish({ results, status: "Error", error, loadMore, retry });
      return;
    }
    const first = pages[0];
    if (!first || first.result === undefined) {
      publish({
        results,
        status: pages.length > 1 ? "LoadingMore" : "LoadingFirstPage",
        loadMore,
        retry,
      });
      return;
    }
    if (coherent.pending || operation) {
      publish({ results, status: "LoadingMore", loadMore, retry });
      return;
    }
    retainedResults = [];
    const last = pages.at(-1)?.result;
    publish({
      results,
      status: last?.isDone ? "Exhausted" : "CanLoadMore",
      loadMore,
      retry,
    });
  }

  function splitDescriptors(page: PageDescriptor<Item>, splitCursor: string) {
    return [
      descriptor({
        cursor: page.cursor,
        endCursor: splitCursor,
        numItems: page.numItems,
        epoch: page.epoch,
      }),
      descriptor({
        cursor: splitCursor,
        ...(page.endCursor === undefined
          ? {}
          : { endCursor: page.endCursor }),
        numItems: page.numItems,
        epoch: page.epoch,
      }),
    ];
  }

  function stopOperation() {
    if (!operation) return;
    for (const replacement of operation.replacements) stopPage(replacement);
    operation = undefined;
  }

  function validateReplacement(current: StructuralOperation<Item>) {
    const firstOriginal = current.originals[0];
    const lastOriginal = current.originals.at(-1);
    const firstReplacement = current.replacements[0];
    const lastReplacement = current.replacements.at(-1);
    if (!firstOriginal || !lastOriginal || !firstReplacement || !lastReplacement) {
      return invariantError(`${current.kind} replacement is empty`);
    }
    if (!sameBoundary(firstOriginal.cursor, firstReplacement.cursor)) {
      return invariantError(`${current.kind} replacement changed its start`);
    }
    if (!sameBoundary(lastOriginal.endCursor, lastReplacement.endCursor)) {
      return invariantError(`${current.kind} replacement changed its end`);
    }
    return chainError(current.replacements, current.kind);
  }

  function commitOperation(current: StructuralOperation<Item>) {
    if (
      disposed ||
      operation !== current ||
      current.epoch !== storeEpoch ||
      current.error ||
      current.replacements.some((page) => !page.result || page.error)
    ) {
      return;
    }
    const validationError = validateReplacement(current);
    if (validationError) {
      current.error = validationError;
      refreshSnapshot();
      return;
    }
    const firstIndex = pages.indexOf(current.originals[0]);
    if (
      firstIndex === -1 ||
      current.originals.some(
        (page, offset) => pages[firstIndex + offset] !== page,
      )
    ) {
      return;
    }
    for (const original of current.originals) stopPage(original);
    pages.splice(
      firstIndex,
      current.originals.length,
      ...current.replacements,
    );
    operation = undefined;
    refreshSnapshot();
    queueStructuralScan();
  }

  function replaceCandidate(
    current: StructuralOperation<Item>,
    page: PageDescriptor<Item>,
    splitCursor: string,
  ) {
    const index = current.replacements.indexOf(page);
    if (index === -1) return;
    const children = splitDescriptors(page, splitCursor);
    stopPage(page);
    current.replacements.splice(index, 1, ...children);
    for (const child of children) attach(child, true);
  }

  function read(page: PageDescriptor<Item>, candidate = false) {
    if (disposed || page.epoch !== storeEpoch || page.watch === undefined) {
      return;
    }
    try {
      const result = page.watch.localQueryResult();
      if (result === undefined) return;
      page.error = undefined;
      const splitRequested =
        result.pageStatus === "SplitRecommended" ||
        result.pageStatus === "SplitRequired" ||
        result.page.length > options.initialNumItems * 2;
      if (result.pageStatus === "SplitRequired" && !result.splitCursor) {
        const error = invariantError("SplitRequired omitted splitCursor");
        if (candidate && operation) operation.error = error;
        else page.error = error;
        refreshSnapshot();
        return;
      }
      const pendingCandidate =
        candidate && operation?.replacements.includes(page) === true;
      if (candidate && !pendingCandidate && !pages.includes(page)) return;
      if (pendingCandidate) {
        if (splitRequested && result.splitCursor) {
          replaceCandidate(operation!, page, result.splitCursor);
          refreshSnapshot();
          return;
        }
        page.result = result;
        operation!.error = operation!.replacements
          .map((replacement) => replacement.error)
          .find((error): error is AfferentError => error !== undefined);
        commitOperation(operation!);
        refreshSnapshot();
        return;
      }
      if (result.pageStatus === "SplitRequired") page.splitResult = result;
      else {
        page.result = result;
        page.splitResult = undefined;
      }
      if (splitRequested && result.splitCursor) queueStructuralScan();
    } catch (error) {
      if (isInvalidCursorError(error)) {
        const capturedEpoch = storeEpoch;
        queueMicrotask(() => {
          if (!disposed && capturedEpoch === storeEpoch) restart(true);
        });
        return;
      }
      const mapped = mapAfferentError(error);
      if (candidate && operation?.replacements.includes(page)) {
        page.error = mapped;
        operation.error = mapped;
      } else {
        page.error = mapped;
      }
    }
    refreshSnapshot();
    queueStructuralScan();
  }

  function descriptor(input: {
    cursor: string | null;
    endCursor?: string | null;
    numItems: number;
    epoch: number;
  }): PageDescriptor<Item> {
    return {
      key: nextPageKey++,
      cursor: input.cursor,
      ...(input.endCursor === undefined ? {} : { endCursor: input.endCursor }),
      numItems: input.numItems,
      epoch: input.epoch,
    };
  }

  function attach(page: PageDescriptor<Item>, candidate = false) {
    if (disposed || page.epoch !== storeEpoch || page.watch) return;
    const paginationOpts = {
      numItems: page.numItems,
      cursor: page.cursor,
      id: sessionId,
      ...(page.endCursor === undefined ? {} : { endCursor: page.endCursor }),
    };
    page.watch = options.client.watchQuery(options.query, {
      ...options.args,
      paginationOpts,
    } as Query["_args"]) as unknown as Watch<PageResult<Item>>;
    page.stop = page.watch.onUpdate(() => read(page, candidate));
    read(page, candidate);
  }

  function beginOperation(
    kind: StructuralOperationKind,
    originals: PageDescriptor<Item>[],
    replacements: PageDescriptor<Item>[],
  ) {
    if (disposed || operation || originals.length === 0) return false;
    const current: StructuralOperation<Item> = {
      epoch: storeEpoch,
      kind,
      originals,
      replacements,
    };
    operation = current;
    refreshSnapshot();
    for (const replacement of replacements) attach(replacement, true);
    commitOperation(current);
    return true;
  }

  function queueStructuralScan() {
    if (disposed || structuralScanQueued) return;
    structuralScanQueued = true;
    const capturedEpoch = storeEpoch;
    queueMicrotask(() => {
      structuralScanQueued = false;
      if (disposed || capturedEpoch !== storeEpoch || operation) return;
      scanStructuralWork();
    });
  }

  function scanStructuralWork() {
    if (disposed || operation) return;
    const splitPage = pages.find((page) => {
      const result = page.splitResult ?? page.result;
      return (
        result !== undefined &&
        result.splitCursor !== undefined &&
        result.splitCursor !== null &&
        (result.pageStatus === "SplitRecommended" ||
          result.pageStatus === "SplitRequired" ||
          result.page.length > options.initialNumItems * 2)
      );
    });
    const splitResult = splitPage?.splitResult ?? splitPage?.result;
    if (splitPage && splitResult?.splitCursor) {
      beginOperation(
        "split",
        [splitPage],
        splitDescriptors(splitPage, splitResult.splitCursor),
      );
      return;
    }

    const emptyIndex = pages.findIndex(
      (page) => page.result !== undefined && page.result.page.length === 0,
    );
    if (emptyIndex === -1 || pages.length === 1) return;
    if (emptyIndex > 0) {
      const left = pages[emptyIndex - 1];
      const empty = pages[emptyIndex];
      beginOperation(
        "collapse",
        [left, empty],
        [
          descriptor({
            cursor: left.cursor,
            ...(empty.endCursor === undefined
              ? {}
              : { endCursor: empty.endCursor }),
            numItems: left.numItems + empty.numItems,
            epoch: storeEpoch,
          }),
        ],
      );
      return;
    }
    const empty = pages[0];
    const right = pages[1];
    beginOperation(
      "collapse",
      [empty, right],
      [
        descriptor({
          cursor: null,
          ...(right.endCursor === undefined
            ? {}
            : { endCursor: right.endCursor }),
          numItems: empty.numItems + right.numItems,
          epoch: storeEpoch,
        }),
      ],
    );
  }

  function start() {
    if (disposed || listeners.size === 0 || pages.length > 0) return;
    sessionId = ++paginationSessionId;
    const first = descriptor({
      cursor: null,
      numItems: options.initialNumItems,
      epoch: storeEpoch,
    });
    pages = [first];
    attach(first);
    refreshSnapshot();
  }

  function requestMore(count: number) {
    if (disposed || operation || snapshot.status !== "CanLoadMore") return;
    const last = pages.at(-1);
    const result = last?.result;
    if (!last || !result || result.isDone) return;
    const cursor = result.continueCursor;
    const pinned = descriptor({
      cursor: last.cursor,
      endCursor: cursor,
      numItems: last.numItems,
      epoch: storeEpoch,
    });
    const next = descriptor({
      cursor,
      numItems: Math.max(1, count),
      epoch: storeEpoch,
    });
    beginOperation("append", [last], [pinned, next]);
  }

  function restart(retain: boolean) {
    if (disposed) return;
    if (retain) retainedResults = visibleResults();
    for (const page of pages) stopPage(page);
    stopOperation();
    pages = [];
    storeEpoch += 1;
    publish({
      results: retainedResults,
      status: "LoadingFirstPage",
      loadMore,
      retry,
    });
    start();
  }

  return {
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      start();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          for (const page of pages) stopPage(page);
          stopOperation();
          pages = [];
          storeEpoch += 1;
        }
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    loadMore,
    retry,
    dispose() {
      if (disposed) return;
      disposed = true;
      storeEpoch += 1;
      for (const page of pages) stopPage(page);
      stopOperation();
      pages = [];
      listeners.clear();
    },
  };
}

function stableArgs(args: unknown) {
  return JSON.stringify(args);
}

interface DirectWatchHookOptions<Query extends FunctionReference<"query">> {
  client: AfferentWatchClient;
  query: Query | undefined;
  args: Query["_args"] | undefined;
  generation: number;
}

export function useDirectWatchQuery<Query extends FunctionReference<"query">>({
  client,
  query,
  args,
  generation,
}: DirectWatchHookOptions<Query>): DirectWatchSnapshot<FunctionReturnType<Query>> {
  const queryName = query ? getFunctionName(query) : "skip";
  const serialized = stableArgs(args);
  const store = useMemo(
    () =>
      query && args
        ? createDirectWatchStore({ client, query, args, generation })
        : undefined,
    // Semantic argument equality is required because every domain hook creates
    // A fresh object literal on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, queryName, serialized, generation],
  );
  useEffect(() => () => store?.dispose(), [store]);
  const skipped = useMemo(
    () => ({ status: "loading" as const, retry: () => {} }),
    [],
  );
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => skipped),
    store?.getServerSnapshot ?? (() => skipped),
  );
}

export function usePaginatedWatchQuery<
  Item,
  Query extends FunctionReference<"query", "public", any, PageResult<Item>>,
>({
  client,
  query,
  args,
  generation,
  initialNumItems,
}: {
  client: AfferentWatchClient;
  query: Query | undefined;
  args: Omit<Query["_args"], "paginationOpts"> | undefined;
  generation: number;
  initialNumItems: number;
}): PaginatedWatchSnapshot<Item> {
  const queryName = query ? getFunctionName(query) : "skip";
  const serialized = stableArgs(args);
  const store = useMemo(
    () =>
      query && args
        ? createPaginatedWatchStore({
            client,
            query,
            args,
            generation,
            initialNumItems,
          })
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, queryName, serialized, generation, initialNumItems],
  );
  useEffect(() => () => store?.dispose(), [store]);
  const skipped = useMemo(
    () => ({
      results: [] as Item[],
      status: "LoadingFirstPage" as const,
      loadMore: () => {},
      retry: () => {},
    }),
    [],
  );
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => skipped),
    store?.getServerSnapshot ?? (() => skipped),
  );
}
