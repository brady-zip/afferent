import { usePaginatedQuery } from "convex-helpers/react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useMemo, useRef, useState } from "react";

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
} from "../../client/contracts.js";
import type { AdminBindings } from "../bindings.js";
import { useAfferentContext } from "../provider.js";

const UNCONFIGURED_ADMIN_QUERY = makeFunctionReference<"query">(
  "__afferent:unconfiguredAdminCapability",
);
const UNCONFIGURED_ADMIN_MUTATION = makeFunctionReference<"mutation">(
  "__afferent:unconfiguredAdminMutation",
);
const UNCONFIGURED_ACTIVITY_QUERY = makeFunctionReference<"query">(
  "__afferent:unconfiguredPostActivity",
);
const UNCONFIGURED_TAG_QUERY = makeFunctionReference<"query">(
  "__afferent:unconfiguredTags",
);

export type AdminCapabilityState =
  | Readonly<{ status: "unsupported" | "loading" | "not-authorized" }>
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
  const { bindings, auth } = useAfferentContext();
  const configured = bindings.admin !== undefined;
  const enabled = configured && auth.status === "authenticated";
  const value = useQuery(
    bindings.admin?.capability ?? UNCONFIGURED_ADMIN_QUERY,
    enabled ? {} : "skip",
  );
  if (!configured) return { status: "unsupported" };
  if (auth.status === "loading") return { status: "loading" };
  if (auth.status === "unauthenticated") return { status: "not-authorized" };
  return mapAdminCapabilityState(value, true);
}

export type ModerationAction = "edit" | "move" | "status" | "lock" | "archive";

export function moderationActionKey(postId: string, action: ModerationAction) {
  return `${postId}:${action}`;
}

export type ModerationError = AfferentErrorDto & { retryAt?: number };

export function mapModerationError(error: unknown): ModerationError {
  const value = error as Partial<AfferentErrorDto> & { message?: string };
  if (value.code === "RATE_LIMITED") {
    const retryAfterMs = Math.max(0, Number(value.retryAfterMs ?? 0));
    return {
      contractVersion: 1,
      code: "RATE_LIMITED",
      operation: value.operation ?? "edit_post",
      retryAfterMs,
      retryAt: Date.now() + retryAfterMs,
    };
  }
  return {
    contractVersion: 1,
    code: [
      "AUTHENTICATION_REQUIRED",
      "NOT_FOUND",
      "DISCUSSION_LOCKED",
      "NOT_AUTHORIZED",
      "VALIDATION",
      "CONFLICT",
      "TRANSIENT",
      "UNKNOWN",
    ].includes(String(value.code))
      ? (value.code as Exclude<AfferentErrorDto["code"], "RATE_LIMITED">)
      : "UNKNOWN",
    message: value.message ?? "Moderation request failed",
    ...("field" in value && typeof value.field === "string"
      ? { field: value.field }
      : {}),
  };
}

type ModerationResult =
  | Readonly<{ ok: true; data: FeedbackPostDto }>
  | Readonly<{ ok: false; error: ModerationError }>;

export function usePostModeration() {
  const { bindings } = useAfferentContext();
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
  const [pending, setPending] = useState({} as Record<string, boolean>);
  const [errors, setErrors] = useState(
    {} as Record<string, ModerationError | undefined>,
  );
  const inFlight = useRef(new Set<string>());

  async function run(
    postId: PostId,
    action: ModerationAction,
    invoke: () => Promise<FeedbackPostDto>,
  ): Promise<ModerationResult> {
    const key = moderationActionKey(postId, action);
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
    if (admin === undefined) {
      return {
        ok: false,
        error: {
          contractVersion: 1,
          code: "NOT_AUTHORIZED",
          message: "Admin capabilities are not configured",
        },
      };
    }
    inFlight.current.add(key);
    setPending((current: Record<string, boolean>) => ({
      ...current,
      [key]: true,
    }));
    setErrors((current: Record<string, ModerationError | undefined>) => ({
      ...current,
      [key]: undefined,
    }));
    try {
      return { ok: true, data: await invoke() };
    } catch (error) {
      const mappedError = mapModerationError(
        (error as { data?: unknown }).data ?? error,
      );
      setErrors((current: Record<string, ModerationError | undefined>) => ({
        ...current,
        [key]: mappedError,
      }));
      return { ok: false, error: mappedError };
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
      status:
        admin === undefined ? ("unsupported" as const) : ("ready" as const),
      pending,
      errors,
      reset(postId: PostId, action: ModerationAction) {
        const key = moderationActionKey(postId, action);
        setErrors((current: Record<string, ModerationError | undefined>) => ({
          ...current,
          [key]: undefined,
        }));
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
    [admin, archive, edit, errors, lock, move, pending, status],
  );
}

export type PostActivityState = Readonly<{
  status: "unsupported" | "loading" | "ready" | "empty";
  items: PostActivityDto[];
  isLoadingMore: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
}>;

export function usePostActivity(postId: PostId): PostActivityState {
  const { bindings, auth } = useAfferentContext();
  const binding = bindings.admin?.listPostActivity;
  const page = usePaginatedQuery(
    (binding ??
      UNCONFIGURED_ACTIVITY_QUERY) as AdminBindings["listPostActivity"],
    binding && auth.status === "authenticated" ? { postId } : "skip",
    { initialNumItems: 20 },
  );
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
  status: "unsupported" | "loading" | "not-authorized" | "empty" | "ready";
  items: TagDto[];
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
  const { bindings, auth } = useAfferentContext();
  const binding = bindings.admin?.listTags;
  const value = useQuery(
    binding ?? UNCONFIGURED_TAG_QUERY,
    binding && auth.status === "authenticated" ? {} : "skip",
  ) as TagListDto | undefined;
  if (!binding) return { status: "unsupported", items: [] };
  if (auth.status === "loading") return { status: "loading", items: [] };
  if (auth.status === "unauthenticated") {
    return { status: "not-authorized", items: [] };
  }
  return mapTagListState(value, true);
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
  const { bindings } = useAfferentContext();
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
  const [pending, setPending] = useState({} as Record<string, boolean>);
  const [errors, setErrors] = useState(
    {} as Record<string, ModerationError | undefined>,
  );
  const inFlight = useRef(new Set<string>());

  async function run<T>(
    key: string,
    invoke: () => Promise<T>,
  ): Promise<TagManagementResult<T>> {
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
    if (admin === undefined) {
      return {
        ok: false,
        error: {
          contractVersion: 1,
          code: "NOT_AUTHORIZED",
          message: "Admin capabilities are not configured",
        },
      };
    }
    inFlight.current.add(key);
    setPending((current: Record<string, boolean>) => ({
      ...current,
      [key]: true,
    }));
    setErrors((current: Record<string, ModerationError | undefined>) => ({
      ...current,
      [key]: undefined,
    }));
    try {
      return { ok: true, data: await invoke() };
    } catch (error) {
      const mappedError = mapModerationError(
        (error as { data?: unknown }).data ?? error,
      );
      setErrors((current: Record<string, ModerationError | undefined>) => ({
        ...current,
        [key]: mappedError,
      }));
      return { ok: false, error: mappedError };
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
      status:
        admin === undefined ? ("unsupported" as const) : ("ready" as const),
      pending,
      errors,
      reset(entityId: string, action: TagManagementAction) {
        const key = tagActionKey(entityId, action);
        setErrors((current: Record<string, ModerationError | undefined>) => ({
          ...current,
          [key]: undefined,
        }));
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
    [admin, createTag, deleteTag, errors, pending, renameTag, setPostTag],
  );
}
