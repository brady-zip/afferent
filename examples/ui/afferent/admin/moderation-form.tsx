"use client";

import { useState, type FormEvent } from "react";
import type { AdminFeedbackPostDto, BoardDto, PostStatusKey } from "afferent";
import { moderationActionKey, usePostModeration } from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";

const statuses: readonly PostStatusKey[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "complete",
  "closed",
];

export function AfferentModerationForm({
  post,
  boards,
}: Readonly<{ post: AdminFeedbackPostDto; boards: readonly BoardDto[] }>) {
  const { copy } = useAfferentUi();
  const moderation = usePostModeration();
  const [title, setTitle] = useState(post.feedback.title);
  const [body, setBody] = useState(post.feedback.body);
  const id = post.feedback.id;
  const run = (action: string, invoke: () => unknown) => (
    <button
      type="button"
      disabled={moderation.pending[moderationActionKey(id, action as any)]}
      onClick={() => void invoke()}
    >
      {action}
    </button>
  );
  function save(event: FormEvent) {
    event.preventDefault();
    void moderation.editPost({ postId: id, title, body });
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
      <button className="afferent-button" type="submit">
        {copy.admin.saveModeration}
      </button>
      <label>
        Board
        <select
          name="board"
          defaultValue={post.feedback.boardId}
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
      <label>
        {copy.admin.updateStatus}
        <select
          name="status"
          defaultValue={post.feedback.status.key}
          onChange={(event) =>
            void moderation.setPostStatus({
              postId: id,
              status: event.currentTarget.value as PostStatusKey,
            })
          }
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <div className="afferent-actions">
        {run(
          post.moderation.discussionLocked
            ? "Unlock discussion"
            : "Lock discussion",
          () =>
            moderation.setDiscussionLock({
              postId: id,
              locked: !post.moderation.discussionLocked,
            }),
        )}
        {run(
          post.moderation.archived
            ? copy.admin.restoreFeedback
            : copy.admin.archiveFeedback,
          () =>
            moderation.setArchived({
              postId: id,
              archived: !post.moderation.archived,
            }),
        )}
      </div>
    </form>
  );
}
