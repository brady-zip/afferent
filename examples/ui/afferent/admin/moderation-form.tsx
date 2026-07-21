"use client";

import { useState, type FormEvent } from "react";
import type { AdminFeedbackPostDto, BoardDto, PostStatusKey } from "afferent";
import {
  moderationActionKey,
  usePostModeration,
  type ModerationAction,
} from "afferent/react.js";

import { AfferentConfirmationDialog } from "@/components/afferent/admin/confirmation-dialog";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { afferentErrorText } from "@/components/afferent/core/state-region";

const statuses: readonly PostStatusKey[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "complete",
  "closed",
];

const statusLabels: Readonly<Record<PostStatusKey, string>> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  complete: "Complete",
  closed: "Closed",
};

export function AfferentModerationForm({
  post,
  boards,
}: Readonly<{ post: AdminFeedbackPostDto; boards: readonly BoardDto[] }>) {
  const { copy } = useAfferentUi();
  const moderation = usePostModeration();
  const [title, setTitle] = useState(post.feedback.title);
  const [body, setBody] = useState(post.feedback.body);
  const id = post.feedback.id;
  const key = (action: ModerationAction) => moderationActionKey(id, action);

  function save(event: FormEvent) {
    event.preventDefault();
    void moderation.editPost({ postId: id, title, body });
  }

  function error(action: ModerationAction, label: string) {
    const value = moderation.errors[key(action)];
    return value ? (
      <div className="afferent-inline-error" role="alert">
        <h3>{copy.admin.mutationErrorHeading(label)}</h3>
        <p>{afferentErrorText(value)}</p>
        <button type="button" onClick={() => moderation.reset(id, action)}>
          {copy.admin.dismissMutationError}
        </button>
      </div>
    ) : null;
  }

  return (
    <form
      className="afferent-admin-form"
      onSubmit={save}
      aria-label={copy.admin.moderationHeading}
    >
      <h2>{copy.admin.moderationHeading}</h2>
      <label>
        Feedback title
        <input
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
      </label>
      <label>
        Feedback details
        <textarea
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
      </label>
      <button
        className="afferent-button"
        type="submit"
        disabled={moderation.pending[key("edit")]}
        aria-busy={moderation.pending[key("edit")]}
      >
        {copy.admin.saveModeration}
      </button>
      {error("edit", copy.admin.saveModeration)}
      <label>
        Board
        <select
          name="board"
          defaultValue={post.feedback.boardId}
          disabled={moderation.pending[key("move")]}
          onChange={(event) =>
            void moderation.movePost({
              postId: id,
              boardId: event.currentTarget.value as any,
            })
          }
        >
          {boards.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </label>
      {error("move", "Move feedback")}
      <label>
        {copy.admin.updateStatus}
        <select
          name="status"
          defaultValue={post.feedback.status.key}
          disabled={moderation.pending[key("status")]}
          onChange={(event) =>
            void moderation.setPostStatus({
              postId: id,
              status: event.currentTarget.value as PostStatusKey,
            })
          }
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      {error("status", copy.admin.updateStatus)}
      <div className="afferent-actions">
        <button
          type="button"
          disabled={moderation.pending[key("lock")]}
          aria-busy={moderation.pending[key("lock")]}
          onClick={() =>
            void moderation.setDiscussionLock({
              postId: id,
              locked: !post.moderation.discussionLocked,
            })
          }
        >
          {post.moderation.discussionLocked
            ? "Unlock discussion"
            : "Lock discussion"}
        </button>
      </div>
      {error(
        "lock",
        post.moderation.discussionLocked
          ? "Unlock discussion"
          : "Lock discussion",
      )}
      <div className="afferent-destructive-actions">
        {post.moderation.archived ? (
          <button
            type="button"
            disabled={moderation.pending[key("archive")]}
            aria-busy={moderation.pending[key("archive")]}
            onClick={() =>
              void moderation.setArchived({ postId: id, archived: false })
            }
          >
            {copy.admin.restoreFeedback}
          </button>
        ) : (
          <AfferentConfirmationDialog
            triggerLabel={copy.admin.archiveFeedback}
            title={copy.admin.archiveTitle(post.feedback.title)}
            description={copy.admin.archiveBody}
            confirmLabel={copy.admin.archiveFeedback}
            escapeLabel={copy.detail.keepFeedback}
            destructive
            pending={moderation.pending[key("archive")] ?? false}
            error={moderation.errors[key("archive")]}
            onReset={() => moderation.reset(id, "archive")}
            onConfirm={() =>
              moderation.setArchived({ postId: id, archived: true })
            }
          />
        )}
        {post.moderation.archived
          ? error("archive", copy.admin.restoreFeedback)
          : null}
      </div>
    </form>
  );
}
