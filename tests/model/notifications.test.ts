import { describe, expect, test } from "vitest";

import {
  FANOUT_BATCH_SIZE,
  INBOX_RETENTION_CAP,
  NOTIFICATION_EVENT_TYPES,
  dedupeNotificationRecipients,
  shouldAutoSubscribe,
} from "../../src/component/model/notifications.js";

describe("notification model", () => {
  test("freezes the v1 taxonomy and conservative bounds", () => {
    expect(NOTIFICATION_EVENT_TYPES).toEqual([
      "status_changed",
      "admin_replied",
      "comment_replied",
      "mentioned",
      "changelog_published",
    ]);
    expect(FANOUT_BATCH_SIZE).toBe(50);
    expect(INBOX_RETENTION_CAP).toBe(500);
  });

  test("unions reply mentions and subscribers without notifying the initiator", () => {
    expect(
      dedupeNotificationRecipients({
        initiatorActorId: "actor:init",
        subscriberActorIds: ["actor:init", "actor:subscriber"],
        replyActorId: "actor:reply",
        mentionActorIds: [
          "actor:reply",
          "actor:mention",
          "actor:mention",
          "actor:init",
        ],
      }),
    ).toEqual(["actor:mention", "actor:reply", "actor:subscriber"]);
  });

  test("keeps explicit opt-out authoritative over implicit participation", () => {
    expect(shouldAutoSubscribe(undefined)).toBe(true);
    expect(shouldAutoSubscribe("subscribed")).toBe(true);
    expect(shouldAutoSubscribe("opted_out")).toBe(false);
  });
});
