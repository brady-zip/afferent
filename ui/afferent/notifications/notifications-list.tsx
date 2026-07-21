"use client";

import type {
  AfferentError,
  NotificationDto,
  NotificationId,
  NotificationTarget,
} from "afferent";
import {
  useNotifications,
  useUnreadNotificationCount,
  type NotificationFeedState,
} from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  afferentPostHref,
  type AfferentHrefBuilder,
} from "@/components/afferent/core/navigation";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";
import {
  formatAfferentDateTime,
  formatAfferentDateTimeValue,
} from "@/components/afferent/core/format";

export function AfferentNotificationsList({
  pageOwner = true,
}: Readonly<{ pageOwner?: boolean }>) {
  const { copy } = useAfferentUi();
  const notifications = useNotifications() as NotificationControllerState;
  const unread = useUnreadNotificationCount();
  const body = (
    <div
      className="afferent-notifications"
      data-afferent-screen="notifications"
    >
      <header className="afferent-public-header">
        <div>
          <h1>{copy.notifications.title}</h1>
          <p>{copy.notifications.description}</p>
        </div>
        <p role="status" aria-live="polite">
          {unread.status === "ready"
            ? copy.notifications.unreadCount(unread.count)
            : null}
        </p>
      </header>
      {renderNotifications(notifications)}
    </div>
  );
  return pageOwner ? <main>{body}</main> : body;
}

type NotificationControllerState = NotificationFeedState &
  Readonly<{
    pending: Readonly<Record<string, boolean>>;
    errors: Readonly<Record<string, AfferentError | undefined>>;
    markRead: (notificationId: NotificationId) => Promise<unknown>;
    reset: (notificationId: NotificationId) => void;
  }>;

function renderNotifications(notifications: NotificationControllerState) {
  const { copy } = useAfferentUi();
  switch (notifications.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.common.unsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "unauthenticated": {
      return (
        <AfferentStateRegion title={copy.common.signInHeading}>
          <p>{copy.notifications.signInBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.notifications.loading} />;
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.notifications.emptyHeading}>
          <p>{copy.notifications.emptyBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.notifications.loadErrorHeading}
          tone="error"
          action={
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={notifications.loadMore}
            >
              {copy.common.tryLoadingAgain}
            </button>
          }
        >
          <p>{afferentErrorText(notifications.error)}</p>
          {notifications.items.length > 0 ? (
            <NotificationRows notifications={notifications} />
          ) : null}
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <section aria-label={copy.notifications.title}>
          <NotificationRows notifications={notifications} />
          {notifications.canLoadMore ? (
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={notifications.loadMore}
              disabled={notifications.isLoadingMore}
              aria-busy={notifications.isLoadingMore}
            >
              {notifications.isLoadingMore
                ? copy.notifications.loadingMore
                : copy.notifications.loadMore}
            </button>
          ) : null}
        </section>
      );
    }
    default: {
      return assertNever(notifications);
    }
  }
}

function NotificationRows({
  notifications,
}: Readonly<{ notifications: NotificationControllerState }>) {
  const { copy, navigation } = useAfferentUi();
  return (
    <ol className="afferent-notifications__list">
      {notifications.items.map((notification) => {
        const pending = notifications.pending[String(notification.id)] ?? false;
        const error = notifications.errors[String(notification.id)];
        return (
          <li key={notification.id}>
            <article
              className="afferent-notification"
              data-notification-unread={notification.read ? "false" : "true"}
            >
              <header>
                <p className="afferent-notification__type">
                  {copy.notifications.typeLabel(notification.type)}
                </p>
                {!notification.read ? (
                  <strong>{copy.notifications.unread}</strong>
                ) : null}
              </header>
              <navigation.Link
                href={notificationTargetHref(
                  notification.target,
                  navigation.href,
                )}
              >
                {notification.target.label}
              </navigation.Link>
              <NotificationMetadata notification={notification} />
              {!notification.read ? (
                <button
                  type="button"
                  className="afferent-button afferent-button--secondary"
                  disabled={pending}
                  aria-busy={pending}
                  onClick={() => void notifications.markRead(notification.id)}
                >
                  {pending
                    ? copy.notifications.markingRead
                    : copy.notifications.markRead}
                </button>
              ) : null}
              {error ? (
                <div className="afferent-inline-error" role="alert">
                  <p>{afferentErrorText(error)}</p>
                  <button
                    type="button"
                    onClick={() => notifications.reset(notification.id)}
                  >
                    {copy.common.dismissError}
                  </button>
                </div>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

function NotificationMetadata({
  notification,
}: Readonly<{ notification: NotificationDto }>) {
  return (
    <p className="afferent-notification__metadata">
      {notification.initiator.displayName ?? "Someone"}
      {" · "}
      <time dateTime={formatAfferentDateTimeValue(notification.occurredAt)}>
        {formatAfferentDateTime(notification.occurredAt)}
      </time>
    </p>
  );
}

function notificationTargetHref(
  target: NotificationTarget,
  href: AfferentHrefBuilder,
) {
  switch (target.kind) {
    case "post": {
      return afferentPostHref(href.post(target.postId), target.commentId);
    }
    case "changelog": {
      return href.changelog(target.slug);
    }
    default: {
      return assertNever(target);
    }
  }
}
