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
  error?: AfferentError;
  watch?: Watch<PageResult<T>>;
  stop?: () => void;
  split?: {
    signature: string;
    left: PageDescriptor<T>;
    right: PageDescriptor<T>;
  };
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
  const loadedCursors = new Set<string>();
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

  function publish(next: PaginatedWatchSnapshot<Item>) {
    if (disposed) return;
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function stopTree(page: PageDescriptor<Item>) {
    page.stop?.();
    page.stop = undefined;
    page.watch = undefined;
    if (page.split) {
      stopTree(page.split.left);
      stopTree(page.split.right);
      page.split = undefined;
    }
  }

  function firstTreeError(
    page: PageDescriptor<Item>,
  ): AfferentError | undefined {
    if (page.error) return page.error;
    if (!page.split) return undefined;
    return firstTreeError(page.split.left) ?? firstTreeError(page.split.right);
  }

  function replacementPages(
    page: PageDescriptor<Item>,
  ): PageDescriptor<Item>[] | undefined {
    if (page.error) return undefined;
    if (page.split) {
      const left = replacementPages(page.split.left);
      const right = replacementPages(page.split.right);
      return left && right ? [...left, ...right] : undefined;
    }
    return page.result ? [page] : undefined;
  }

  function treePending(page: PageDescriptor<Item>): boolean {
    if (page.error) return false;
    if (page.split) return replacementPages(page) === undefined;
    return page.result === undefined;
  }

  function reconcileSplits() {
    let changed = false;
    for (let index = 0; index < pages.length; index += 1) {
      const original = pages[index];
      if (!original.split) continue;
      const replacements = replacementPages(original);
      if (!replacements) continue;
      original.stop?.();
      original.stop = undefined;
      original.watch = undefined;
      original.split = undefined;
      pages.splice(index, 1, ...replacements);
      index += replacements.length - 1;
      changed = true;
    }
    return changed;
  }

  function visibleResults() {
    const visible = pages.flatMap((page) => page.result?.page ?? []);
    return visible.length > 0 || pages[0]?.result !== undefined
      ? visible
      : retainedResults;
  }

  function refreshSnapshot() {
    if (disposed) return;
    reconcileSplits();
    const results = visibleResults();
    const error = pages
      .map(firstTreeError)
      .find((candidate): candidate is AfferentError => candidate !== undefined);
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
    retainedResults = [];
    if (pages.some(treePending)) {
      publish({ results, status: "LoadingMore", loadMore, retry });
      return;
    }
    const last = pages.at(-1)?.result;
    publish({
      results,
      status: last?.isDone ? "Exhausted" : "CanLoadMore",
      loadMore,
      retry,
    });
  }

  function cancelSplit(page: PageDescriptor<Item>) {
    if (!page.split) return;
    stopTree(page.split.left);
    stopTree(page.split.right);
    page.split = undefined;
  }

  function beginSplit(page: PageDescriptor<Item>, result: PageResult<Item>) {
    const splitCursor = result.splitCursor;
    if (!splitCursor) return;
    const signature = `${page.cursor ?? ""}:${splitCursor}:${result.continueCursor}`;
    if (page.split?.signature === signature) return;
    cancelSplit(page);
    const left = descriptor({
      cursor: page.cursor,
      endCursor: splitCursor,
      numItems: page.numItems,
      epoch: page.epoch,
    });
    const right = descriptor({
      cursor: splitCursor,
      endCursor: result.continueCursor,
      numItems: page.numItems,
      epoch: page.epoch,
    });
    page.split = { signature, left, right };
    attach(left);
    attach(right);
  }

  function read(page: PageDescriptor<Item>) {
    if (disposed || page.epoch !== storeEpoch || page.watch === undefined) {
      return;
    }
    try {
      const result = page.watch.localQueryResult();
      if (result === undefined) return;
      page.error = undefined;
      const needsSplit =
        result.splitCursor !== undefined &&
        result.splitCursor !== null &&
        (result.pageStatus === "SplitRecommended" ||
          result.pageStatus === "SplitRequired" ||
          result.page.length > options.initialNumItems * 2);
      if (result.pageStatus !== "SplitRequired") page.result = result;
      if (needsSplit) beginSplit(page, result);
      else cancelSplit(page);
    } catch (error) {
      if (isInvalidCursorError(error)) {
        const capturedEpoch = storeEpoch;
        queueMicrotask(() => {
          if (!disposed && capturedEpoch === storeEpoch) restart(true);
        });
        return;
      }
      page.error = mapAfferentError(error);
    }
    refreshSnapshot();
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

  function attach(page: PageDescriptor<Item>) {
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
    page.stop = page.watch.onUpdate(() => read(page));
    read(page);
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
    if (disposed || snapshot.status !== "CanLoadMore") return;
    const last = pages.at(-1);
    const result = last?.result;
    if (!result || result.isDone || last?.split) return;
    const cursor = result.continueCursor;
    if (loadedCursors.has(cursor)) return;
    loadedCursors.add(cursor);
    const next = descriptor({
      cursor,
      numItems: Math.max(1, count),
      epoch: storeEpoch,
    });
    pages.push(next);
    attach(next);
    refreshSnapshot();
  }

  function restart(retain: boolean) {
    if (disposed) return;
    if (retain) retainedResults = visibleResults();
    for (const page of pages) stopTree(page);
    pages = [];
    loadedCursors.clear();
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
          for (const page of pages) stopTree(page);
          pages = [];
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
      for (const page of pages) stopTree(page);
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
