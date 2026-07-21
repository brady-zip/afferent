"use client";

import { useRef, useState, type FormEvent } from "react";
import type { FeedbackPostDto, PostId } from "afferent";
import {
  feedbackMutationKey,
  useFeedbackMutations,
  usePost,
  usePostSubscription,
  type PostLookupState,
} from "afferent/react.js";

import { AfferentPostActivity } from "@/components/afferent/board/activity";
import { AfferentDiscussion } from "@/components/afferent/board/discussion";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentPostDetail({ postId }: Readonly<{ postId: PostId }>) {
  const lookup = usePost(postId);
  return <AfferentPostDetailView lookup={lookup} />;
}

export function AfferentPostDetailView({
  lookup,
}: Readonly<{ lookup: PostLookupState }>) {
  const { copy, navigation } = useAfferentUi();
  const Link = navigation.Link;
  switch (lookup.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.common.unsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.detail.loading} />;
    }
    case "error": {
      return (
        <AfferentStateRegion title={copy.detail.loadErrorHeading} tone="error">
          <p>{afferentErrorText(lookup.error)}</p>
        </AfferentStateRegion>
      );
    }
    case "notFound": {
      return (
        <AfferentStateRegion title={copy.detail.notFoundHeading}>
          <p>{copy.detail.notFoundBody}</p>
          <Link href={navigation.currentLocation}>
            {copy.detail.returnToFeedback}
          </Link>
        </AfferentStateRegion>
      );
    }
    case "merged": {
      return (
        <AfferentStateRegion title={copy.detail.mergedHeading}>
          <p>{copy.detail.mergedBody}</p>
          <Link href={navigation.href.post(lookup.canonicalPostId)}>
            {copy.detail.viewCanonical}
          </Link>
        </AfferentStateRegion>
      );
    }
    case "post": {
      return <Post post={lookup.post} />;
    }
    default: {
      return assertNever(lookup);
    }
  }
}

function Post({ post }: Readonly<{ post: FeedbackPostDto }>) {
  const { copy } = useAfferentUi();
  const mutations = useFeedbackMutations();
  const subscription = usePostSubscription(post.id);
  const [editing, setEditing] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const withdrawInvoker = useRef<HTMLButtonElement>(null);
  const voteKey = feedbackMutationKey(post.id, "vote");
  const editKey = feedbackMutationKey(post.id, "edit");
  const withdrawKey = feedbackMutationKey(post.id, "withdraw");

  function closeWithdraw() {
    setConfirmingWithdraw(false);
    queueMicrotask(() => withdrawInvoker.current?.focus());
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutations.editPost({
      postId: post.id,
      title: title.trim(),
      body: body.trim(),
    });
  }

  const unauthenticated = mutations.status === "unauthenticated";
  let participation = null;
  if (unauthenticated) {
    participation = (
      <AfferentStateRegion title={copy.common.signInHeading}>
        <p>{copy.detail.signInBody}</p>
      </AfferentStateRegion>
    );
  } else if (mutations.status === "ready") {
    participation = (
      <div className="afferent-post-detail__actions">
        <button
          type="button"
          onClick={() => mutations.setVote(post.id, !post.viewerHasVoted)}
          disabled={mutations.pending[voteKey] ?? false}
          aria-busy={mutations.pending[voteKey] ?? false}
        >
          {post.viewerHasVoted ? copy.detail.removeVote : copy.detail.vote}
        </button>
        {subscription.status === "ready" ? (
          <button
            type="button"
            onClick={() =>
              subscription.setSubscribed(!subscription.value?.subscribed)
            }
            disabled={subscription.pending}
            aria-busy={subscription.pending}
          >
            {subscription.value?.subscribed
              ? copy.detail.unsubscribe
              : copy.detail.subscribe}
          </button>
        ) : null}
        {post.viewerCanEdit ? (
          <button type="button" onClick={() => setEditing(true)}>
            {copy.detail.edit}
          </button>
        ) : null}
        {post.viewerCanWithdraw ? (
          <button
            ref={withdrawInvoker}
            type="button"
            onClick={() => setConfirmingWithdraw(true)}
          >
            {copy.detail.withdraw}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <article className="afferent-post-detail" data-post-id={post.id}>
      <header>
        <p className="afferent-post-detail__board">{post.board.name}</p>
        <h2>{post.title}</h2>
        <p className="afferent-post-detail__status">{post.status.label}</p>
      </header>
      <p className="afferent-post-detail__body">{post.body}</p>
      <dl className="afferent-post-detail__metadata">
        <div>
          <dt>{copy.detail.votes}</dt>
          <dd>{post.voteCount}</dd>
        </div>
        <div>
          <dt>{copy.detail.comments}</dt>
          <dd>{post.commentCount}</dd>
        </div>
        <div>
          <dt>{copy.detail.author}</dt>
          <dd>{post.author.displayName ?? copy.discussion.anonymousAuthor}</dd>
        </div>
      </dl>
      {participation}
      {mutations.errors[voteKey] ? (
        <p role="alert">{afferentErrorText(mutations.errors[voteKey]!)}</p>
      ) : null}
      {editing ? (
        <form
          className="afferent-edit-form"
          onSubmit={save}
          aria-busy={mutations.pending[editKey] ?? false}
        >
          <label>
            {copy.detail.editTitle}
            <input
              name="edit-title"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
          </label>
          <label>
            {copy.detail.editBody}
            <textarea
              name="edit-body"
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </label>
          <div className="afferent-actions">
            <button
              type="submit"
              className="afferent-button"
              disabled={mutations.pending[editKey] ?? false}
            >
              {copy.detail.saveChanges}
            </button>
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={() => setEditing(false)}
            >
              {copy.detail.returnToPost}
            </button>
          </div>
        </form>
      ) : null}
      {confirmingWithdraw ? (
        <dialog open aria-labelledby="afferent-withdraw-heading">
          <h3 id="afferent-withdraw-heading">
            {copy.detail.withdrawTitle(post.title)}
          </h3>
          <p>{copy.detail.withdrawBody}</p>
          <div className="afferent-actions">
            <button
              type="button"
              className="afferent-button afferent-button--destructive"
              disabled={mutations.pending[withdrawKey] ?? false}
              onClick={async () => {
                await mutations.withdrawPost(post.id);
                closeWithdraw();
              }}
            >
              {copy.detail.withdraw}
            </button>
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={closeWithdraw}
            >
              {copy.detail.keepFeedback}
            </button>
          </div>
        </dialog>
      ) : null}
      <AfferentDiscussion postId={post.id} />
      <AfferentPostActivity postId={post.id} />
    </article>
  );
}
