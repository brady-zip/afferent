import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useMemo } from "react";

import type {
  AfferentError,
  AfferentErrorDto,
  NotificationDto,
  NotificationId,
  PostId,
  PostSubscriptionDto,
  UnreadNotificationCountDto,
} from "../../client/contracts.js";
import type { NotificationBindings } from "../bindings.js";
import { useAfferentContext } from "../provider.js";
import { useDirectWatchQuery, usePaginatedWatchQuery } from "../query.js";
import { useMutationController } from "./mutations.js";

const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;
const UNCONFIGURED_NOTIFICATION_MUTATION = makeFunctionReference<"mutation">(
  "__afferent:unconfiguredNotificationMutation",
);

export interface NotificationPaginationState {
  results: NotificationDto[];
  status:
    "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: AfferentError;
  loadMore: (count: number) => void;
  retry: () => void;
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
      error: AfferentError;
      loadMore: () => void;
      retry: () => void;
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
      error: pagination.error!,
      loadMore,
      retry: pagination.retry,
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
  sessionGeneration: number,
) {
  const candidate = mutation as typeof mutation & {
    withOptimisticUpdate?: (
      handler: (store: any, args: any) => void,
    ) => typeof mutation;
  };
  if (!candidate.withOptimisticUpdate || !queryBinding) return mutation;
  return candidate.withOptimisticUpdate((store, args) => {
    const queryArgs = { postId: args.postId, sessionGeneration };
    const current = store.getQuery(queryBinding, queryArgs) as
      PostSubscriptionDto | undefined;
    if (!current) return;
    store.setQuery(queryBinding, queryArgs, {
      ...current,
      subscribed: args.desired,
      explicitOptOut: !args.desired,
    });
  });
}

export function usePostSubscription(postId: PostId) {
  const { bindings, auth, client, generation } = useAfferentContext();
  const configured = bindings.notifications !== undefined;
  const sessionGeneration = generation;
  const query = useDirectWatchQuery({
    client,
    query: bindings.notifications?.getPostSubscription,
    args: configured && auth.status === "authenticated"
      ? { postId, sessionGeneration }
      : undefined,
    generation,
  });
  const value = query.status === "ready" ? query.value : undefined;
  const rawMutation = useMutation(
    (bindings.notifications?.setPostSubscription ??
      UNCONFIGURED_NOTIFICATION_MUTATION) as NotificationBindings["setPostSubscription"],
  );
  const mutation = applySubscriptionOptimism(
    rawMutation,
    bindings.notifications?.getPostSubscription,
    sessionGeneration,
  );
  const controller = useMutationController(generation);
  const mutationKey = `${postId}:subscription`;

  async function setSubscribed(desired: boolean) {
    return await controller.run(
      mutationKey,
      () => mutation({ postId, desired }),
      !configured || auth.status !== "authenticated"
        ? unavailableError()
        : undefined,
    );
  }

  let status: "unsupported" | "unauthenticated" | "loading" | "ready" | "error";
  if (!configured) status = "unsupported";
  else if (auth.status === "unauthenticated") status = "unauthenticated";
  else if (query.status === "error") status = "error";
  else if (auth.status === "loading" || value === undefined) status = "loading";
  else status = "ready";
  return useMemo(
    () => ({
      status,
      value,
      pending: controller.pending[mutationKey] ?? false,
      error:
        query.status === "error"
          ? query.error
          : controller.errors[mutationKey],
      setSubscribed,
      reset: () => controller.reset(mutationKey),
    }),
    [controller, mutationKey, query, status, value],
  );
}

function applyMarkReadOptimism(
  mutation: ReturnType<typeof useMutation>,
  binding: NotificationBindings["getUnreadCount"] | undefined,
  sessionGeneration: number,
) {
  const candidate = mutation as typeof mutation & {
    withOptimisticUpdate?: (handler: (store: any) => void) => typeof mutation;
  };
  if (!candidate.withOptimisticUpdate || !binding) return mutation;
  return candidate.withOptimisticUpdate((store) => {
    const args = { sessionGeneration };
    const current = store.getQuery(binding, args) as
      UnreadNotificationCountDto | undefined;
    if (current) {
      store.setQuery(binding, args, {
        ...current,
        count: Math.max(0, current.count - 1),
      });
    }
  });
}

export function useNotifications() {
  const { bindings, auth, client, generation } = useAfferentContext();
  const configured = bindings.notifications !== undefined;
  const sessionGeneration = generation;
  const pagination = usePaginatedWatchQuery<
    NotificationDto,
    NotificationBindings["listNotifications"]
  >({
    client,
    query: bindings.notifications?.listNotifications,
    args: configured && auth.status === "authenticated"
      ? { sessionGeneration }
      : undefined,
    generation,
    initialNumItems: DEFAULT_NOTIFICATION_PAGE_SIZE,
  });
  const rawMutation = useMutation(
    (bindings.notifications?.markNotificationRead ??
      UNCONFIGURED_NOTIFICATION_MUTATION) as NotificationBindings["markNotificationRead"],
  );
  const mutation = applyMarkReadOptimism(
    rawMutation,
    bindings.notifications?.getUnreadCount,
    sessionGeneration,
  );
  const controller = useMutationController(generation);

  async function markRead(notificationId: NotificationId) {
    const key = String(notificationId);
    return await controller.run(
      key,
      () => mutation({ notificationId }),
      !configured || auth.status !== "authenticated"
        ? unavailableError()
        : undefined,
    );
  }

  let mode: "unsupported" | "configured" | "unauthenticated";
  if (!configured) mode = "unsupported";
  else if (auth.status === "authenticated") mode = "configured";
  else mode = "unauthenticated";
  const feed = mapNotificationFeedState(pagination, mode);
  return useMemo(
    () => ({
      ...feed,
      pending: controller.pending,
      errors: controller.errors,
      markRead,
      reset(notificationId: NotificationId) {
        controller.reset(String(notificationId));
      },
    }),
    [controller, feed],
  );
}

export function useUnreadNotificationCount() {
  const { bindings, auth, client, generation } = useAfferentContext();
  const configured = bindings.notifications !== undefined;
  const sessionGeneration = generation;
  const query = useDirectWatchQuery({
    client,
    query: bindings.notifications?.getUnreadCount,
    args: configured && auth.status === "authenticated"
      ? { sessionGeneration }
      : undefined,
    generation,
  });
  const value = query.status === "ready" ? query.value : undefined;
  if (!configured) return { status: "unsupported" as const, count: 0 };
  if (auth.status === "unauthenticated") {
    return { status: "unauthenticated" as const, count: 0 };
  }
  if (auth.status === "loading" || value === undefined) {
    if (query.status === "error") {
      return { status: "error" as const, count: 0, error: query.error };
    }
    return { status: "loading" as const, count: 0 };
  }
  return { status: "ready" as const, count: value.count };
}
