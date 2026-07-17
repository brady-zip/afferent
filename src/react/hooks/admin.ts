import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useMemo } from "react";

import type {
  AfferentErrorDto,
  BoardId,
  FeedbackPostDto,
  PostActivityDto,
  PostId,
  PostStatusKey,
  TagDeleteResultDto,
  TagDto,
  TagId,
  TagListDto,
  MergePostResult,
} from "../../client/contracts.js";
import type { AdminBindings } from "../bindings.js";
import { useAfferentContext } from "../provider.js";
import { useDirectWatchQuery, usePaginatedWatchQuery } from "../query.js";
import { mapAfferentError, useMutationController } from "./mutations.js";

const UNCONFIGURED_ADMIN_MUTATION = makeFunctionReference<"mutation">(
  "__afferent:unconfiguredAdminMutation",
);
export type AdminCapabilityState =
  | Readonly<{ status: "unsupported" | "loading" | "not-authorized" }>
  | Readonly<{ status: "error"; error: ModerationError }>
  | Readonly<{ status: "ready" }>;

export function mapAdminCapabilityState(
  value: boolean | undefined,
  configured: boolean,
): AdminCapabilityState {
  if (!configured) return { status: "unsupported" };
  if (value === undefined) return { status: "loading" };
  return value ? { status: "ready" } : { status: "not-authorized" };
}

export function useAdminCapability(): AdminCapabilityState {
  const { bindings, auth, client, generation } = useAfferentContext();
  const configured = bindings.admin !== undefined;
  const enabled = configured && auth.status === "authenticated";
  const query = useDirectWatchQuery({
    client,
    query: bindings.admin?.capability,
    args: enabled ? { sessionGeneration: generation } : undefined,
    generation,
  });
  if (!configured) return { status: "unsupported" };
  if (auth.status === "loading") return { status: "loading" };
  if (auth.status === "unauthenticated") return { status: "not-authorized" };
  if (query.status === "error") return query;
  return mapAdminCapabilityState(
    query.status === "ready" ? query.value : undefined,
    true,
  );
}

export type ModerationAction =
  "edit" | "move" | "status" | "lock" | "archive" | "merge";

export function moderationActionKey(postId: string, action: ModerationAction) {
  return `${postId}:${action}`;
}

export type ModerationError = AfferentErrorDto & { retryAt?: number };

export function mapModerationError(error: unknown): ModerationError {
  return mapAfferentError(error);
}

function unavailableAdminError(message: string): ModerationError {
  return {
    contractVersion: 1,
    code: "NOT_AUTHORIZED",
    message,
  };
}

type ModerationResult =
  | Readonly<{ ok: true; data: FeedbackPostDto }>
  | Readonly<{ ok: false; error: ModerationError }>;

export function usePostModeration() {
  const { bindings, generation } = useAfferentContext();
  const admin = bindings.admin;
  const edit = useMutation(
    (admin?.editPost ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["editPost"],
  );
  const move = useMutation(
    (admin?.movePost ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["movePost"],
  );
  const status = useMutation(
    (admin?.setPostStatus ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["setPostStatus"],
  );
  const lock = useMutation(
    (admin?.setDiscussionLock ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["setDiscussionLock"],
  );
  const archive = useMutation(
    (admin?.setArchived ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["setArchived"],
  );
  const controller = useMutationController(generation);
  const unavailable = admin
    ? undefined
    : unavailableAdminError("Admin capabilities are not configured");

  async function run(
    postId: PostId,
    action: ModerationAction,
    invoke: () => Promise<FeedbackPostDto>,
  ): Promise<ModerationResult> {
    const key = moderationActionKey(postId, action);
    return await controller.run(key, invoke, unavailable);
  }

  return useMemo(
    () => ({
      status:
        admin === undefined ? ("unsupported" as const) : ("ready" as const),
      pending: controller.pending,
      errors: controller.errors,
      reset(postId: PostId, action: ModerationAction) {
        controller.reset(moderationActionKey(postId, action));
      },
      editPost: (args: { postId: PostId; title?: string; body?: string }) =>
        run(args.postId, "edit", () => edit(args)),
      movePost: (args: { postId: PostId; boardId: BoardId }) =>
        run(args.postId, "move", () => move(args)),
      setPostStatus: (args: { postId: PostId; status: PostStatusKey }) =>
        run(args.postId, "status", () => status(args)),
      setDiscussionLock: (args: { postId: PostId; locked: boolean }) =>
        run(args.postId, "lock", () => lock(args)),
      setArchived: (args: { postId: PostId; archived: boolean }) =>
        run(args.postId, "archive", () => archive(args)),
    }),
    [admin, archive, controller, edit, lock, move, status],
  );
}

export type PostActivityState = Readonly<{
  status: "unsupported" | "loading" | "ready" | "empty" | "error";
  items: PostActivityDto[];
  isLoadingMore: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
  error?: ModerationError;
}>;

export function usePostActivity(postId: PostId): PostActivityState {
  const { bindings, auth, client, generation } = useAfferentContext();
  const binding = bindings.admin?.listPostActivity;
  const page = usePaginatedWatchQuery<
    PostActivityDto,
    AdminBindings["listPostActivity"]
  >({
    client,
    query: binding,
    args: binding && auth.status === "authenticated"
      ? { postId, sessionGeneration: generation }
      : undefined,
    generation,
    initialNumItems: 20,
  });
  const loadMore = () => page.loadMore(20);
  if (!binding)
    return {
      status: "unsupported",
      items: [],
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  if (page.status === "LoadingFirstPage")
    return {
      status: "loading",
      items: page.results,
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  if (page.status === "Error")
    return {
      status: "error",
      items: page.results,
      error: page.error,
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  if (page.status === "Exhausted" && page.results.length === 0)
    return {
      status: "empty",
      items: [],
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  return {
    status: "ready",
    items: page.results,
    isLoadingMore: page.status === "LoadingMore",
    canLoadMore: page.status === "CanLoadMore" || page.status === "LoadingMore",
    loadMore,
  };
}

export type TagListState = Readonly<{
  status:
    "unsupported" | "loading" | "not-authorized" | "empty" | "ready" | "error";
  items: TagDto[];
  error?: ModerationError;
}>;

export function mapTagListState(
  value: TagListDto | undefined,
  configured: boolean,
): TagListState {
  if (!configured) return { status: "unsupported", items: [] };
  if (value === undefined) return { status: "loading", items: [] };
  if (value.tags.length === 0) return { status: "empty", items: [] };
  return { status: "ready", items: value.tags };
}

export function useTags(): TagListState {
  const { bindings, auth, client, generation } = useAfferentContext();
  const binding = bindings.admin?.listTags;
  const query = useDirectWatchQuery({
    client,
    query: binding,
    args: binding && auth.status === "authenticated"
      ? { sessionGeneration: generation }
      : undefined,
    generation,
  });
  if (!binding) return { status: "unsupported", items: [] };
  if (auth.status === "loading") return { status: "loading", items: [] };
  if (auth.status === "unauthenticated") {
    return { status: "not-authorized", items: [] };
  }
  if (query.status === "error") {
    return { status: "error", items: [], error: query.error };
  }
  return mapTagListState(
    query.status === "ready" ? query.value : undefined,
    true,
  );
}

export type TagManagementAction =
  "create" | "rename" | "assign" | "remove" | "delete";

export function tagActionKey(entityId: string, action: TagManagementAction) {
  return `${entityId}:${action}`;
}

type TagManagementResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: ModerationError }>;

export function useTagManagement() {
  const { bindings, generation } = useAfferentContext();
  const admin = bindings.admin;
  const createTag = useMutation(
    (admin?.createTag ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["createTag"],
  );
  const renameTag = useMutation(
    (admin?.renameTag ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["renameTag"],
  );
  const setPostTag = useMutation(
    (admin?.setPostTag ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["setPostTag"],
  );
  const deleteTag = useMutation(
    (admin?.deleteTag ??
      UNCONFIGURED_ADMIN_MUTATION) as AdminBindings["deleteTag"],
  );
  const controller = useMutationController(generation);
  const unavailable = admin
    ? undefined
    : unavailableAdminError("Admin capabilities are not configured");

  async function run<T>(
    key: string,
    invoke: () => Promise<T>,
  ): Promise<TagManagementResult<T>> {
    return await controller.run(key, invoke, unavailable);
  }

  return useMemo(
    () => ({
      status:
        admin === undefined ? ("unsupported" as const) : ("ready" as const),
      pending: controller.pending,
      errors: controller.errors,
      reset(entityId: string, action: TagManagementAction) {
        controller.reset(tagActionKey(entityId, action));
      },
      createTag: (args: { name: string }) =>
        run<TagDto>(tagActionKey("tag", "create"), () => createTag(args)),
      renameTag: (args: { tagId: TagId; name: string }) =>
        run<TagDto>(tagActionKey(args.tagId, "rename"), () => renameTag(args)),
      setPostTag: (args: { postId: PostId; tagId: TagId; desired: boolean }) =>
        run<FeedbackPostDto>(
          tagActionKey(
            `${args.postId}:${args.tagId}`,
            args.desired ? "assign" : "remove",
          ),
          () => setPostTag(args),
        ),
      deleteTag: (args: { tagId: TagId }) =>
        run<TagDeleteResultDto>(tagActionKey(args.tagId, "delete"), () =>
          deleteTag(args),
        ),
    }),
    [admin, controller, createTag, deleteTag, renameTag, setPostTag],
  );
}

type MergeActionResult =
  | Readonly<{ ok: true; data: MergePostResult }>
  | Readonly<{ ok: false; error: ModerationError }>;

export function useMergePost() {
  const { bindings, generation } = useAfferentContext();
  const binding = bindings.admin?.mergePost;
  const mutate = useMutation(
    (binding ?? UNCONFIGURED_ADMIN_MUTATION) as NonNullable<
      AdminBindings["mergePost"]
    >,
  );
  const controller = useMutationController(generation);

  async function merge(args: {
    sourcePostId: PostId;
    canonicalPostId: PostId;
  }): Promise<MergeActionResult> {
    const key = moderationActionKey(
      args.sourcePostId,
      "merge" as ModerationAction,
    );
    return await controller.run(
      key,
      () => mutate(args),
      binding
        ? undefined
        : unavailableAdminError("Merge capability is not configured"),
    );
  }

  return {
    status: binding ? ("ready" as const) : ("unsupported" as const),
    pending: controller.pending,
    errors: controller.errors,
    merge,
    reset(sourcePostId: PostId) {
      const key = moderationActionKey(
        sourcePostId,
        "merge" as ModerationAction,
      );
      controller.reset(key);
    },
  };
}
