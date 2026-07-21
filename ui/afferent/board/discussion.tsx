"use client";

import { useId, useState, type FormEvent } from "react";
import type { CommentId, PostId } from "afferent";
import {
  feedbackMutationKey,
  useComments,
  useFeedbackMutations,
  type CommentFeedState,
} from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { afferentCommentAnchorId } from "@/components/afferent/core/navigation";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentDiscussion({ postId }: Readonly<{ postId: PostId }>) {
  const comments = useComments(postId);
  const mutations = useFeedbackMutations();
  return (
    <AfferentDiscussionView
      postId={postId}
      comments={comments}
      mutationStatus={mutations.status}
      pending={
        mutations.pending[feedbackMutationKey(postId, "comment")] ?? false
      }
      error={mutations.errors[feedbackMutationKey(postId, "comment")]}
      addComment={mutations.addComment}
      resetError={() => mutations.reset(feedbackMutationKey(postId, "comment"))}
    />
  );
}

export function AfferentDiscussionView({
  postId,
  comments,
  mutationStatus,
  pending,
  error,
  addComment,
  resetError,
}: Readonly<{
  postId: PostId;
  comments: CommentFeedState;
  mutationStatus: ReturnType<typeof useFeedbackMutations>["status"];
  pending: boolean;
  error: ReturnType<typeof useFeedbackMutations>["errors"][string];
  addComment: ReturnType<typeof useFeedbackMutations>["addComment"];
  resetError: () => void;
}>) {
  const { copy } = useAfferentUi();
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentId | undefined>();
  const [announcement, setAnnouncement] = useState("");
  const fieldId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setAnnouncement("");
    const result = await addComment({
      postId,
      body: body.trim(),
      ...(replyingTo ? { parentCommentId: replyingTo } : {}),
    });
    if (result.ok) setAnnouncement(copy.discussion.postedComment);
  }

  const rows = (() => {
    switch (comments.status) {
      case "unsupported": {
        return (
          <AfferentStateRegion title={copy.common.unsupportedHeading}>
            <p>{copy.common.unsupportedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "loading": {
        return <AfferentStateRegion title={copy.discussion.loading} />;
      }
      case "empty": {
        return (
          <AfferentStateRegion title={copy.discussion.emptyHeading}>
            <p>{copy.discussion.emptyBody}</p>
          </AfferentStateRegion>
        );
      }
      case "error": {
        return (
          <AfferentStateRegion
            title={copy.discussion.loadErrorHeading}
            tone="error"
          >
            <p>{afferentErrorText(comments.error)}</p>
            {comments.items.length ? <CommentRows /> : null}
          </AfferentStateRegion>
        );
      }
      case "ready": {
        return <CommentRows />;
      }
      default: {
        return assertNever(comments);
      }
    }
  })();

  function CommentRows() {
    return (
      <ol className="afferent-discussion__list">
        {comments.items.map((comment) => (
          <li
            key={comment.id}
            id={afferentCommentAnchorId(comment.id)}
            data-comment-id={comment.id}
            data-parent-comment-id={comment.parentCommentId}
            className={
              comment.parentCommentId
                ? "afferent-comment afferent-comment--reply"
                : "afferent-comment"
            }
          >
            <article>
              <h3>
                {comment.author.displayName ?? copy.discussion.anonymousAuthor}
              </h3>
              <p>{comment.body}</p>
              {!comment.parentCommentId ? (
                <button type="button" onClick={() => setReplyingTo(comment.id)}>
                  {copy.discussion.reply}
                </button>
              ) : null}
            </article>
          </li>
        ))}
      </ol>
    );
  }

  let composer = null;
  if (mutationStatus === "unauthenticated") {
    composer = (
      <AfferentStateRegion title={copy.common.signInHeading}>
        <p>{copy.discussion.signInBody}</p>
      </AfferentStateRegion>
    );
  } else if (mutationStatus === "unsupported") {
    composer = (
      <AfferentStateRegion title={copy.common.unsupportedHeading}>
        <p>{copy.common.unsupportedBody}</p>
      </AfferentStateRegion>
    );
  } else if (mutationStatus === "loading") {
    composer = <AfferentStateRegion title={copy.common.loadingParticipation} />;
  } else {
    composer = (
      <form
        onSubmit={submit}
        aria-busy={pending}
        className="afferent-comment-form"
      >
        <label htmlFor={fieldId}>
          {replyingTo
            ? copy.discussion.replyLabel
            : copy.discussion.commentLabel}
        </label>
        <textarea
          id={fieldId}
          name={replyingTo ? "reply" : "comment"}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          required
        />
        {error ? (
          <div role="alert">
            <p>{afferentErrorText(error)}</p>
            <button type="button" onClick={resetError}>
              {copy.common.dismissError}
            </button>
          </div>
        ) : null}
        <div className="afferent-actions">
          <button type="submit" className="afferent-button" disabled={pending}>
            {replyingTo
              ? copy.discussion.postReply
              : copy.discussion.postComment}
          </button>
          {replyingTo ? (
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={() => setReplyingTo(undefined)}
            >
              {copy.discussion.returnToCommenting}
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <section
      className="afferent-discussion"
      aria-labelledby="afferent-discussion-heading"
    >
      <h2 id="afferent-discussion-heading">{copy.discussion.heading}</h2>
      {rows}
      {comments.status === "ready" && comments.canLoadMore ? (
        <button
          type="button"
          onClick={comments.loadMore}
          disabled={comments.isLoadingMore}
          aria-busy={comments.isLoadingMore}
        >
          {comments.isLoadingMore
            ? copy.discussion.loadingMore
            : copy.discussion.loadMore}
        </button>
      ) : null}
      {composer}
      <p className="afferent-sr-only" role="status" aria-live="polite">
        {pending ? `${copy.common.loadingParticipation}` : announcement}
      </p>
    </section>
  );
}
