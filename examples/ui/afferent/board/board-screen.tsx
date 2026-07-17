"use client";

import {
  useFeedbackFeed,
  type FeedbackFeedArgs,
  type FeedbackFeedState,
} from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { AfferentStateRegion } from "@/components/afferent/core/state-region";

export type AfferentBoardScreenProps = Readonly<{
  feedArgs?: FeedbackFeedArgs;
  pageOwner?: boolean;
  title?: string;
}>;

export function AfferentBoardScreen({
  feedArgs = { order: "top" },
  pageOwner = true,
  title,
}: AfferentBoardScreenProps) {
  const feed = useFeedbackFeed(feedArgs);
  return <AfferentBoardView feed={feed} pageOwner={pageOwner} title={title} />;
}

export function AfferentBoardView({
  feed,
  pageOwner = true,
  title,
}: Readonly<{
  feed: FeedbackFeedState;
  pageOwner?: boolean;
  title?: string;
}>) {
  const { copy, icons, navigation } = useAfferentUi();
  const Link = navigation.Link;
  const content = (() => {
    switch (feed.status) {
      case "loading":
        return (
          <AfferentStateRegion title={`${copy.common.loading} feedback…`}>
            <p>{copy.board.description}</p>
          </AfferentStateRegion>
        );
      case "empty":
        return (
          <AfferentStateRegion title={copy.board.emptyHeading}>
            <p>{copy.board.emptyBody}</p>
          </AfferentStateRegion>
        );
      case "error":
        return (
          <AfferentStateRegion title={copy.board.loadErrorHeading} tone="error">
            <p>{copy.board.loadErrorBody}</p>
            <p>
              {"message" in feed.error ? feed.error.message : feed.error.code}
            </p>
          </AfferentStateRegion>
        );
      case "ready":
        return (
          <>
            <ol className="afferent-board__list" aria-label="Feedback">
              {feed.items.map((post) => (
                <li key={post.id}>
                  <article className="afferent-feedback-card">
                    <div className="afferent-feedback-card__content">
                      <h2>
                        <Link href={navigation.href.post(post.id)}>
                          {post.title}
                        </Link>
                      </h2>
                      <p className="afferent-feedback-card__body">
                        {post.body}
                      </p>
                      <p className="afferent-feedback-card__status">
                        {post.status.label}
                      </p>
                    </div>
                    <dl className="afferent-feedback-card__totals">
                      <div>
                        <dt>
                          <icons.votes aria-hidden="true" /> Votes
                        </dt>
                        <dd>{copy.board.voteCount(post.voteCount)}</dd>
                      </div>
                      <div>
                        <dt>
                          <icons.comments aria-hidden="true" /> Comments
                        </dt>
                        <dd>{copy.board.commentCount(post.commentCount)}</dd>
                      </div>
                    </dl>
                  </article>
                </li>
              ))}
            </ol>
            {feed.canLoadMore ? (
              <button
                type="button"
                className="afferent-button afferent-button--secondary"
                onClick={feed.loadMore}
                disabled={feed.isLoadingMore}
                aria-busy={feed.isLoadingMore}
              >
                {feed.isLoadingMore
                  ? copy.board.loadingMore
                  : copy.board.loadMore}
              </button>
            ) : null}
          </>
        );
    }
  })();
  const body = (
    <div className="afferent-board" data-afferent-screen="board">
      <header className="afferent-board__header">
        <div>
          <h1>{title ?? copy.board.title}</h1>
          <p>{copy.board.description}</p>
        </div>
        <button type="button" className="afferent-button">
          <icons.create aria-hidden="true" />
          {copy.board.createFeedback}
        </button>
      </header>
      {content}
    </div>
  );
  if (!pageOwner) return body;
  return (
    <>
      <a className="afferent-skip-link" href="#afferent-board-main">
        Skip to feedback
      </a>
      <main id="afferent-board-main">{body}</main>
    </>
  );
}
