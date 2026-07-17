import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AdminChangelogEntryDto,
  AfferentError,
  AfferentErrorDto,
  ChangelogId,
  PostId,
  PublicChangelogEntryDto,
  PublishedChangelogLookupDto,
} from "../../client/contracts.js";
import type {
  AdminBindings,
  ChangelogFeedQueryReference,
} from "../bindings.js";
import { useAfferentContext } from "../provider.js";
import { useDirectWatchQuery, usePaginatedWatchQuery } from "../query.js";
import { mapModerationError } from "./admin.js";

const DEFAULT_CHANGELOG_PAGE_SIZE = 20;
const UNCONFIGURED_CHANGELOG_MUTATION = makeFunctionReference<"mutation">(
  "__afferent:unconfiguredChangelogMutation",
);

export interface ChangelogPaginationState {
  results: PublicChangelogEntryDto[];
  status:
    "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: AfferentError;
  loadMore: (count: number) => void;
}

export type ChangelogFeedState =
  | Readonly<{
      status: "unsupported" | "loading" | "empty";
      items: PublicChangelogEntryDto[];
      isLoadingMore: false;
      canLoadMore: false;
      error?: undefined;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "ready";
      items: PublicChangelogEntryDto[];
      isLoadingMore: boolean;
      canLoadMore: boolean;
      error?: undefined;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "error";
      items: PublicChangelogEntryDto[];
      isLoadingMore: false;
      canLoadMore: false;
      error: AfferentError;
      loadMore: () => void;
    }>;

export function mapChangelogFeedState(
  pagination: ChangelogPaginationState,
  unsupported = false,
): ChangelogFeedState {
  const loadMore = () => pagination.loadMore(DEFAULT_CHANGELOG_PAGE_SIZE);
  if (unsupported) {
    return {
      status: "unsupported",
      items: [],
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  }
  if (pagination.status === "LoadingFirstPage") {
    return {
      status: "loading",
      items: pagination.results,
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  }
  if (pagination.status === "Error") {
    return {
      status: "error",
      items: pagination.results,
      isLoadingMore: false,
      canLoadMore: false,
      error: pagination.error!,
      loadMore,
    };
  }
  if (pagination.status === "Exhausted" && pagination.results.length === 0) {
    return {
      status: "empty",
      items: pagination.results,
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  }
  return {
    status: "ready",
    items: pagination.results,
    isLoadingMore: pagination.status === "LoadingMore",
    canLoadMore:
      pagination.status === "CanLoadMore" ||
      pagination.status === "LoadingMore",
    loadMore,
  };
}

export function useChangelogFeed(): ChangelogFeedState {
  const { bindings, client, generation } = useAfferentContext();
  const binding = bindings.changelog?.listPublished;
  const pagination = usePaginatedWatchQuery<
    PublicChangelogEntryDto,
    ChangelogFeedQueryReference
  >({
    client,
    query: binding,
    args: binding ? { sessionGeneration: generation } : undefined,
    generation,
    initialNumItems: DEFAULT_CHANGELOG_PAGE_SIZE,
  });
  return mapChangelogFeedState(pagination, binding === undefined);
}

export type ChangelogEntryState =
  | Readonly<{ status: "unsupported" | "loading" | "notFound" }>
  | Readonly<{ status: "ready"; entry: PublicChangelogEntryDto }>
  | Readonly<{ status: "error"; error: AfferentError }>;

export function mapChangelogEntryState(
  value: PublishedChangelogLookupDto | Error | undefined,
  configured: boolean,
): ChangelogEntryState {
  if (!configured) return { status: "unsupported" };
  if (value === undefined) return { status: "loading" };
  if (value instanceof Error) {
    return { status: "error", error: mapModerationError(value) };
  }
  if (value.status === "notFound") return { status: "notFound" };
  return { status: "ready", entry: value.entry };
}

export function useChangelogEntry(slug: string): ChangelogEntryState {
  const { bindings, client, generation } = useAfferentContext();
  const binding = bindings.changelog?.getPublishedBySlug;
  const value = useDirectWatchQuery({
    client,
    query: binding,
    args: binding ? { slug, sessionGeneration: generation } : undefined,
    generation,
  });
  if (value.status === "error") return value;
  return mapChangelogEntryState(
    value.status === "ready" ? value.value : undefined,
    binding !== undefined,
  );
}

export type ChangelogEditorAction =
  "create" | "edit" | "links" | "publish" | "unpublish";

export function changelogActionKey(
  entryId: ChangelogId | "new",
  action: ChangelogEditorAction,
) {
  return `${entryId}:${action}`;
}

type ChangelogEditorResult =
  | Readonly<{ ok: true; data: AdminChangelogEntryDto }>
  | Readonly<{ ok: false; error: AfferentErrorDto }>;

function changelogEditorStatus(
  configured: boolean,
  authStatus: "loading" | "authenticated" | "unauthenticated",
) {
  if (!configured) return "unsupported" as const;
  if (authStatus === "loading") return "loading" as const;
  if (authStatus === "unauthenticated") return "not-authorized" as const;
  return "ready" as const;
}

export function useChangelogEditor() {
  const { bindings, auth, sessionKey } = useAfferentContext();
  const admin = bindings.admin;
  const configured =
    admin?.createChangelogDraft !== undefined &&
    admin.editChangelog !== undefined &&
    admin.setChangelogLinks !== undefined &&
    admin.publishChangelog !== undefined &&
    admin.unpublishChangelog !== undefined;
  const createDraft = useMutation(
    (admin?.createChangelogDraft ??
      UNCONFIGURED_CHANGELOG_MUTATION) as NonNullable<
      AdminBindings["createChangelogDraft"]
    >,
  );
  const edit = useMutation(
    (admin?.editChangelog ?? UNCONFIGURED_CHANGELOG_MUTATION) as NonNullable<
      AdminBindings["editChangelog"]
    >,
  );
  const setLinks = useMutation(
    (admin?.setChangelogLinks ??
      UNCONFIGURED_CHANGELOG_MUTATION) as NonNullable<
      AdminBindings["setChangelogLinks"]
    >,
  );
  const publish = useMutation(
    (admin?.publishChangelog ?? UNCONFIGURED_CHANGELOG_MUTATION) as NonNullable<
      AdminBindings["publishChangelog"]
    >,
  );
  const unpublish = useMutation(
    (admin?.unpublishChangelog ??
      UNCONFIGURED_CHANGELOG_MUTATION) as NonNullable<
      AdminBindings["unpublishChangelog"]
    >,
  );
  const [pending, setPending] = useState({} as Record<string, boolean>);
  const [errors, setErrors] = useState(
    {} as Record<string, AfferentErrorDto | undefined>,
  );
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    inFlight.current.clear();
    setPending({});
    setErrors({});
  }, [sessionKey]);

  async function run(
    key: string,
    invoke: () => Promise<AdminChangelogEntryDto>,
  ): Promise<ChangelogEditorResult> {
    if (inFlight.current.has(key)) {
      return {
        ok: false,
        error: {
          contractVersion: 1,
          code: "VALIDATION",
          message: "Request already pending",
        },
      };
    }
    if (!configured || auth.status !== "authenticated") {
      return {
        ok: false,
        error: {
          contractVersion: 1,
          code:
            auth.status === "authenticated"
              ? "NOT_AUTHORIZED"
              : "AUTHENTICATION_REQUIRED",
          message: "Changelog editorial capabilities are unavailable",
        },
      };
    }
    inFlight.current.add(key);
    setPending((current: Record<string, boolean>) => ({
      ...current,
      [key]: true,
    }));
    setErrors((current: Record<string, AfferentErrorDto | undefined>) => ({
      ...current,
      [key]: undefined,
    }));
    try {
      return { ok: true, data: await invoke() };
    } catch (error) {
      const mapped = mapModerationError(
        (error as { data?: unknown }).data ?? error,
      );
      setErrors((current: Record<string, AfferentErrorDto | undefined>) => ({
        ...current,
        [key]: mapped,
      }));
      return { ok: false, error: mapped };
    } finally {
      inFlight.current.delete(key);
      setPending((current: Record<string, boolean>) => ({
        ...current,
        [key]: false,
      }));
    }
  }

  return useMemo(
    () => ({
      status: changelogEditorStatus(configured, auth.status),
      pending,
      errors,
      reset(entryId: ChangelogId | "new", action: ChangelogEditorAction) {
        const key = changelogActionKey(entryId, action);
        setErrors((current: Record<string, AfferentErrorDto | undefined>) => ({
          ...current,
          [key]: undefined,
        }));
      },
      createDraft: (args: { title: string; body: string; slug?: string }) =>
        run(changelogActionKey("new", "create"), () => createDraft(args)),
      edit: (args: {
        entryId: ChangelogId;
        title?: string;
        body?: string;
        slug?: string;
      }) => run(changelogActionKey(args.entryId, "edit"), () => edit(args)),
      setLinks: (args: { entryId: ChangelogId; postIds: PostId[] }) =>
        run(changelogActionKey(args.entryId, "links"), () => setLinks(args)),
      publish: (entryId: ChangelogId) =>
        run(changelogActionKey(entryId, "publish"), () => publish({ entryId })),
      unpublish: (entryId: ChangelogId) =>
        run(changelogActionKey(entryId, "unpublish"), () =>
          unpublish({ entryId }),
        ),
    }),
    [
      admin,
      auth.status,
      configured,
      createDraft,
      edit,
      errors,
      pending,
      publish,
      setLinks,
      unpublish,
    ],
  );
}
