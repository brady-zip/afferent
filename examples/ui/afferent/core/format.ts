import type {
  AdminChangelogEntryDto,
  PostActivityDto,
  PostStatusKey,
} from "afferent";

const statusLabels: Readonly<Record<PostStatusKey, string>> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  complete: "Complete",
  closed: "Closed",
};

export function formatAfferentDateTime(value: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("month")} ${part("day")}, ${part("year")} at ${part("hour")}:${part("minute")} ${part("dayPeriod")} UTC`;
}

export function formatAfferentDateTimeValue(value: number): string {
  return new Date(value).toISOString();
}

export function formatEditorialState(
  state: AdminChangelogEntryDto["state"],
): string {
  const labels: Readonly<Record<AdminChangelogEntryDto["state"], string>> = {
    draft: "Draft",
    published: "Published",
    unpublished: "Unpublished",
  };
  return labels[state];
}

export function formatActivityDescription(item: PostActivityDto): string {
  const actor = item.actor?.displayName ?? "An administrator";
  switch (item.type) {
    case "create": {
      return `${actor} created the feedback.`;
    }
    case "edit": {
      return `${actor} updated the feedback${item.changedFields?.length ? ` fields: ${item.changedFields.join(", ")}` : ""}.`;
    }
    case "status_change": {
      return `${actor} changed the feedback status from ${item.fromStatus ? statusLabels[item.fromStatus] : "its previous status"} to ${item.toStatus ? statusLabels[item.toStatus] : "a new status"}.`;
    }
    case "board_move": {
      return `${actor} moved the feedback from ${item.fromBoard?.name ?? "its previous board"} to ${item.toBoard?.name ?? "a new board"}.`;
    }
    case "tag_add": {
      return `${actor} added the ${item.tag?.name ?? "selected"} tag.`;
    }
    case "tag_remove": {
      return `${actor} removed the ${item.tag?.name ?? "selected"} tag.`;
    }
    case "lock": {
      return `${actor} locked the feedback discussion.`;
    }
    case "unlock": {
      return `${actor} unlocked the feedback discussion.`;
    }
    case "archive": {
      return `${actor} archived the feedback.`;
    }
    case "restore": {
      return `${actor} restored the feedback.`;
    }
    case "merge": {
      return `${actor} merged duplicate feedback into its canonical record.`;
    }
    case "changelog_publish": {
      return `${actor} published ${item.changelog?.title ?? "a linked changelog entry"}.`;
    }
    case "changelog_unpublish": {
      return `${actor} unpublished ${item.changelog?.title ?? "a linked changelog entry"}.`;
    }
  }
}
