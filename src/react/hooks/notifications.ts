import { usePaginatedQuery } from "convex-helpers/react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AfferentErrorDto,
  NotificationDto,
  NotificationId,
  PostId,
  PostSubscriptionDto,
  UnreadNotificationCountDto,
} from "../../client/contracts.js";
import type { NotificationBindings } from "../bindings.js";
import { useAfferentContext } from "../provider.js";
import { mapModerationError } from "./admin.js";

const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;
const UNCONFIGURED_NOTIFICATION_QUERY = makeFunctionReference<"query">(
  "__afferent:unconfiguredNotificationQuery",
);
const UNCONFIGURED_NOTIFICATION_MUTATION = makeFunctionReference<"mutation">(
  "__afferent:unconfiguredNotificationMutation",
);

export interface NotificationPaginationState {
  results: NotificationDto[];
  status:
    | "LoadingFirstPage"
    | "CanLoadMore"
    | "LoadingMore"
    | "Exhausted"
    | "Error";
  error?: Error;
  loadMore: (count: number) => void;
}

export type NotificationFeedState =
  | Readonly<{
      status: "unsupported" | "unauthenticated" | "loading" | "empty";
      items: NotificationDto[];
      isLoadingMore: false;
      canLoadMore: false;
      error?: undefined;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "ready";
      items: NotificationDto[];
      isLoadingMore: boolean;
      canLoadMore: boolean;
      error?: undefined;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "error";
      items: NotificationDto[];
      isLoadingMore: false;
      canLoadMore: false;
      error: Error;
      loadMore: () => void;
    }>;

export function mapNotificationFeedState(
  pagination: NotificationPaginationState,
  mode: "configured" | "unsupported" | "unauthenticated" = "configured",
): NotificationFeedState {
  const loadMore = () => pagination.loadMore(DEFAULT_NOTIFICATION_PAGE_SIZE);
  if (mode !== "configured") {
    return {
      status: mode,
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
      error: pagination.error ?? new Error("Notification inbox failed"),
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

function duplicateRequestError(): AfferentErrorDto {
  return {
    contractVersion: 1,
    code: "VALIDATION",
    message: "Request already pending",
  };
}

function unavailableError(): AfferentErrorDto {
  return {
    contractVersion: 1,
    code: "AUTHENTICATION_REQUIRED",
    message: "Notification capabilities require an authenticated actor",
  };
}

function applySubscriptionOptimism(
  mutation: ReturnType<typeof useMutation>,
  queryBinding: NotificationBindings["getPostSubscription"] | undefined,
  sessionGeneration: string,
) {
  const candidate = mutation as typeof mutation & {
    withOptimisticUpdate?: (handler: (store: any, args: any) => void) => typeof mutation;
  };
  if (!candidate.withOptimisticUpdate || !queryBinding) return mutation;
  return candidate.withOptimisticUpdate((store, args) => {
    const queryArgs = { postId: args.postId, sessionGeneration };
    const current = store.getQuery(queryBinding, queryArgs) as
      | PostSubscriptionDto
      | undefined;
    if (!current) return;
    store.setQuery(queryBinding, queryArgs, {
      ...current,
      subscribed: args.desired,
      explicitOptOut: !args.desired,
    });
  });
}

export function usePostSubscription(postId: PostId) {
  const { bindings, auth } = useAfferentContext();
  const configured = bindings.notifications !== undefined;
  const sessionGeneration =
    auth.status === "authenticated"
      ? (auth.sessionGeneration ?? "authenticated")
      : auth.status;
  const value = useQuery(
    bindings.notifications?.getPostSubscription ??
      UNCONFIGURED_NOTIFICATION_QUERY,
    configured && auth.status === "authenticated"
      ? { postId, sessionGeneration }
      : "skip",
  ) as PostSubscriptionDto | undefined;
  const rawMutation = useMutation(
    (bindings.notifications?.setPostSubscription ??
      UNCONFIGURED_NOTIFICATION_MUTATION) as NotificationBindings["setPostSubscription"],
  );
  const mutation = applySubscriptionOptimism(
    rawMutation,
    bindings.notifications?.getPostSubscription,
    sessionGeneration,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(undefined as AfferentErrorDto | undefined);
  const inFlight = useRef(false);

  useEffect(() => {
    inFlight.current = false;
    setPending(false);
    setError(undefined);
  }, [sessionGeneration]);

  async function setSubscribed(desired: boolean) {
    if (inFlight.current) return { ok: false as const, error: duplicateRequestError() };
    if (!configured || auth.status !== "authenticated") {
      return { ok: false as const, error: unavailableError() };
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      const result = await mutation({ postId, desired });
      if (
        typeof result === "object" &&
        result !== null &&
        "ok" in result &&
        result.ok === false
      ) {
        const failure = result as { ok: false; error: AfferentErrorDto };
        setError(failure.error);
        return failure;
      }
      return { ok: true as const, data: result as PostSubscriptionDto };
    } catch (error) {
      const mapped = mapModerationError(
        (error as { data?: unknown }).data ?? error,
      );
      setError(mapped);
      return { ok: false as const, error: mapped };
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  let status: "unsupported" | "unauthenticated" | "loading" | "ready";
  if (!configured) status = "unsupported";
  else if (auth.status === "unauthenticated") status = "unauthenticated";
  else if (auth.status === "loading" || value === undefined) status = "loading";
  else status = "ready";
  return useMemo(
    () => ({
      status,
      value,
      pending,
      error,
      setSubscribed,
      reset: () => setError(undefined),
    }),
    [error, pending, status, value],
  );
}

function applyMarkReadOptimism(
  mutation: ReturnType<typeof useMutation>,
  binding: NotificationBindings["getUnreadCount"] | undefined,
  sessionGeneration: string,
) {
  const candidate = mutation as typeof mutation & {
    withOptimisticUpdate?: (handler: (store: any) => void) => typeof mutation;
  };
  if (!candidate.withOptimisticUpdate || !binding) return mutation;
  return candidate.withOptimisticUpdate((store) => {
    const args = { sessionGeneration };
    const current = store.getQuery(binding, args) as
      | UnreadNotificationCountDto
      | undefined;
    if (current) {
      store.setQuery(binding, args, {
        ...current,
        count: Math.max(0, current.count - 1),
      });
    }
  });
}

export function useNotifications() {
  const { bindings, auth } = useAfferentContext();
  const configured = bindings.notifications !== undefined;
  const sessionGeneration =
    auth.status === "authenticated"
      ? (auth.sessionGeneration ?? "authenticated")
      : auth.status;
  const pagination = usePaginatedQuery(
    bindings.notifications?.listNotifications ??
      UNCONFIGURED_NOTIFICATION_QUERY,
    configured && auth.status === "authenticated"
      ? { sessionGeneration }
      : "skip",
    { initialNumItems: DEFAULT_NOTIFICATION_PAGE_SIZE },
  );
  const rawMutation = useMutation(
    (bindings.notifications?.markNotificationRead ??
      UNCONFIGURED_NOTIFICATION_MUTATION) as NotificationBindings["markNotificationRead"],
  );
  const mutation = applyMarkReadOptimism(
    rawMutation,
    bindings.notifications?.getUnreadCount,
    sessionGeneration,
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
  }, [sessionGeneration]);

  async function markRead(notificationId: NotificationId) {
    const key = String(notificationId);
    if (inFlight.current.has(key)) {
      return { ok: false as const, error: duplicateRequestError() };
    }
    if (!configured || auth.status !== "authenticated") {
      return { ok: false as const, error: unavailableError() };
    }
    inFlight.current.add(key);
    setPending((current: Record<string, boolean>) => ({ ...current, [key]: true }));
    setErrors((current: Record<string, AfferentErrorDto | undefined>) => ({
      ...current,
      [key]: undefined,
    }));
    try {
      return { ok: true as const, data: await mutation({ notificationId }) };
    } catch (error) {
      const mapped = mapModerationError(
        (error as { data?: unknown }).data ?? error,
      );
      setErrors((current: Record<string, AfferentErrorDto | undefined>) => ({
        ...current,
        [key]: mapped,
      }));
      return { ok: false as const, error: mapped };
    } finally {
      inFlight.current.delete(key);
      setPending((current: Record<string, boolean>) => ({ ...current, [key]: false }));
    }
  }

  let mode: "unsupported" | "configured" | "unauthenticated";
  if (!configured) mode = "unsupported";
  else if (auth.status === "authenticated") mode = "configured";
  else mode = "unauthenticated";
  const feed = mapNotificationFeedState(pagination, mode);
  return useMemo(
    () => ({
      ...feed,
      pending,
      errors,
      markRead,
      reset(notificationId: NotificationId) {
        const key = String(notificationId);
        setErrors((current: Record<string, AfferentErrorDto | undefined>) => ({
          ...current,
          [key]: undefined,
        }));
      },
    }),
    [errors, feed, pending],
  );
}

export function useUnreadNotificationCount() {
  const { bindings, auth } = useAfferentContext();
  const configured = bindings.notifications !== undefined;
  const sessionGeneration =
    auth.status === "authenticated"
      ? (auth.sessionGeneration ?? "authenticated")
      : auth.status;
  const value = useQuery(
    bindings.notifications?.getUnreadCount ?? UNCONFIGURED_NOTIFICATION_QUERY,
    configured && auth.status === "authenticated"
      ? { sessionGeneration }
      : "skip",
  ) as UnreadNotificationCountDto | undefined;
  if (!configured) return { status: "unsupported" as const, count: 0 };
  if (auth.status === "unauthenticated") {
    return { status: "unauthenticated" as const, count: 0 };
  }
  if (auth.status === "loading" || value === undefined) {
    return { status: "loading" as const, count: 0 };
  }
  return { status: "ready" as const, count: value.count };
}
