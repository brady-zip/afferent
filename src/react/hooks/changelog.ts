import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useMemo } from "react";

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
  AdminChangelogQueryReference,
  AdminBindings,
  ChangelogFeedQueryReference,
} from "../bindings.js";
import { useAfferentContext } from "../provider.js";
import { useDirectWatchQuery, usePaginatedWatchQuery } from "../query.js";
import { useMutationController } from "./mutations.js";

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
  value: PublishedChangelogLookupDto | undefined,
  configured: boolean,
): ChangelogEntryState {
  if (!configured) return { status: "unsupported" };
  if (value === undefined) return { status: "loading" };
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

export interface AdminChangelogPaginationState {
  results: AdminChangelogEntryDto[];
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: AfferentError;
  loadMore: (count: number) => void;
}

export type AdminChangelogState = Readonly<{
  status: "unsupported" | "loading" | "not-authorized" | "empty" | "ready" | "loading-more" | "error";
  items: AdminChangelogEntryDto[];
  canLoadMore: boolean;
  loadMore: () => void;
  error?: AfferentError;
}>;

export function mapAdminChangelogState(
  pagination: AdminChangelogPaginationState,
  unsupported = false,
): AdminChangelogState {
  const loadMore = () => pagination.loadMore(DEFAULT_CHANGELOG_PAGE_SIZE);
  if (unsupported) return { status: "unsupported", items: [], canLoadMore: false, loadMore };
  if (pagination.status === "LoadingFirstPage") return { status: "loading", items: pagination.results, canLoadMore: false, loadMore };
  if (pagination.status === "Error") return { status: "error", items: pagination.results, canLoadMore: false, loadMore, error: pagination.error };
  if (pagination.status === "Exhausted" && pagination.results.length === 0) return { status: "empty", items: [], canLoadMore: false, loadMore };
  return {
    status: pagination.status === "LoadingMore" ? "loading-more" : "ready",
    items: pagination.results,
    canLoadMore: pagination.status === "CanLoadMore" || pagination.status === "LoadingMore",
    loadMore,
  };
}

export function useAdminChangelog(): AdminChangelogState {
  const { bindings, auth, client, generation } = useAfferentContext();
  const binding = bindings.admin?.listAdminChangelog;
  const page = usePaginatedWatchQuery<AdminChangelogEntryDto, AdminChangelogQueryReference>({
    client,
    query: binding,
    args: binding && auth.status === "authenticated"
      ? { sessionGeneration: generation }
      : undefined,
    generation,
    initialNumItems: DEFAULT_CHANGELOG_PAGE_SIZE,
  });
  if (!binding) return mapAdminChangelogState(page, true);
  if (auth.status === "loading") return { status: "loading", items: [], canLoadMore: false, loadMore: () => page.loadMore(DEFAULT_CHANGELOG_PAGE_SIZE) };
  if (auth.status === "unauthenticated") return { status: "not-authorized", items: [], canLoadMore: false, loadMore: () => page.loadMore(DEFAULT_CHANGELOG_PAGE_SIZE) };
  return mapAdminChangelogState(page);
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
  const { bindings, auth, generation } = useAfferentContext();
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
  const controller = useMutationController(generation);
  const unavailable =
    configured && auth.status === "authenticated"
      ? undefined
      : ({
          contractVersion: 1,
          code:
            auth.status === "authenticated"
              ? "NOT_AUTHORIZED"
              : "AUTHENTICATION_REQUIRED",
          message: "Changelog editorial capabilities are unavailable",
        } as const);

  async function run(
    key: string,
    invoke: () => Promise<AdminChangelogEntryDto>,
  ): Promise<ChangelogEditorResult> {
    return await controller.run(key, invoke, unavailable);
  }

  return useMemo(
    () => ({
      status: changelogEditorStatus(configured, auth.status),
      pending: controller.pending,
      errors: controller.errors,
      reset(entryId: ChangelogId | "new", action: ChangelogEditorAction) {
        controller.reset(changelogActionKey(entryId, action));
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
      controller,
      publish,
      setLinks,
      unpublish,
    ],
  );
}
