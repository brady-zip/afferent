export const NOTIFICATION_EVENT_TYPES = [
  "status_changed",
  "admin_replied",
  "comment_replied",
  "mentioned",
  "changelog_published",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const FANOUT_BATCH_SIZE = 50;
export const FANOUT_INLINE_LIMIT = 10;
export const MAX_EVENT_RECIPIENTS = 1_000;
export const INBOX_RETENTION_CAP = 500;

export function dedupeNotificationRecipients(args: {
  initiatorActorId: string;
  subscriberActorIds?: readonly string[];
  replyActorId?: string;
  mentionActorIds?: readonly string[];
}) {
  const recipients = new Set([
    ...(args.subscriberActorIds ?? []),
    ...(args.replyActorId === undefined ? [] : [args.replyActorId]),
    ...(args.mentionActorIds ?? []),
  ]);
  recipients.delete(args.initiatorActorId);
  return [...recipients].sort();
}

export function shouldAutoSubscribe(
  state: "subscribed" | "opted_out" | undefined,
) {
  return state !== "opted_out";
}
