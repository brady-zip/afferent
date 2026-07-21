"use client";

import { Popover } from "radix-ui";
import { useUnreadNotificationCount } from "afferent/react.js";
import { useRef } from "react";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { AfferentNotificationsList } from "@/components/afferent/notifications/notifications-list";

export function AfferentNotificationsPopover() {
  const { copy } = useAfferentUi();
  const unread = useUnreadNotificationCount();
  const trigger = useRef<HTMLButtonElement>(null);
  const count = unread.status === "ready" ? unread.count : 0;
  const label = count
    ? `${copy.notifications.trigger}, ${copy.notifications.unreadCount(count)}`
    : copy.notifications.trigger;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          className="afferent-button"
          aria-label={label}
        >
          {copy.notifications.title}
          {count ? (
            <span className="afferent-notifications-trigger__count">
              {count}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="afferent-notifications-popover"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          data-afferent-notifications-popover
          onEscapeKeyDown={() => trigger.current?.focus()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <AfferentNotificationsList pageOwner={false} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
