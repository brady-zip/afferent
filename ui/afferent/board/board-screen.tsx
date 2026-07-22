"use client";

import { useId, useState } from "react";
import type { BoardDto, PostId, PostStatusKey } from "afferent";
import {
  useFeedbackFeed,
  useFeedbackSearch,
  type FeedbackFeedArgs,
  type FeedbackFeedState,
  type BoundedDiscoveryState,
} from "afferent/react.js";

import { AfferentFeedbackComposer } from "@/components/afferent/board/feedback-composer";
import { AfferentFeedbackList } from "@/components/afferent/board/feedback-list";
import { AfferentPostDetail } from "@/components/afferent/board/post-detail";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export type AfferentBoardScreenProps = Readonly<{
  boards?: readonly BoardDto[];
  feedArgs?: FeedbackFeedArgs;
  pageOwner?: boolean;
  postId?: PostId;
  title?: string;
}>;

export function AfferentBoardScreen({
  boards = [],
  feedArgs = { order: "top" },
  pageOwner = true,
  postId,
  title,
}: AfferentBoardScreenProps) {
  const [boardId, setBoardId] = useState<BoardDto["id"] | undefined>(
    feedArgs.boardId ?? boards[0]?.id,
  );
  const [order, setOrder] = useState(feedArgs.order);
  const [status, setStatus] = useState<PostStatusKey | undefined>(
    feedArgs.status,
  );
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const feed = useFeedbackFeed({
    order,
    boardId,
    status,
    tagId: feedArgs.tagId,
  });
  const search = useFeedbackSearch({
    query,
    boardId,
    status,
    tagId: feedArgs.tagId,
    debounceMs: 0,
  });
  return (
    <AfferentBoardView
      boards={boards}
      boardId={boardId}
      order={order}
      status={status}
      query={query}
      feed={feed}
      search={search}
      composing={composing}
      postId={postId}
      pageOwner={pageOwner}
      title={title}
      onBoardChange={setBoardId}
      onOrderChange={setOrder}
      onStatusChange={setStatus}
      onQueryChange={setQuery}
      onComposingChange={setComposing}
    />
  );
}

type BoardViewProps = Readonly<{
  boards?: readonly BoardDto[];
  boardId?: BoardDto["id"];
  order?: FeedbackFeedArgs["order"];
  status?: PostStatusKey;
  query?: string;
  feed: FeedbackFeedState;
  search?: BoundedDiscoveryState;
  composing?: boolean;
  pageOwner?: boolean;
  title?: string;
  postId?: PostId;
  onBoardChange?: (boardId: BoardDto["id"] | undefined) => void;
  onOrderChange?: (order: FeedbackFeedArgs["order"]) => void;
  onStatusChange?: (status: PostStatusKey | undefined) => void;
  onQueryChange?: (query: string) => void;
  onComposingChange?: (composing: boolean) => void;
}>;

export function AfferentBoardView({
  boards = [],
  boardId,
  order = "top",
  status,
  query = "",
  feed,
  search,
  composing = false,
  pageOwner = true,
  title,
  postId,
  onBoardChange,
  onOrderChange,
  onStatusChange,
  onQueryChange,
  onComposingChange,
}: BoardViewProps) {
  const { copy, icons } = useAfferentUi();
  const controlsId = useId();
  const boardControlId = `${controlsId}-board`;
  const searchControlId = `${controlsId}-search`;
  const statusControlId = `${controlsId}-status`;
  const sortControlId = `${controlsId}-sort`;
  const searching = query.trim().length > 0;

  const content =
    searching && search ? renderSearch(search, copy) : renderFeed(feed, copy);
  const body = (
    <div className="afferent-board" data-afferent-screen="board">
      <header className="afferent-board__header">
        <div>
          <h1>{title ?? copy.board.title}</h1>
          <p>{copy.board.description}</p>
        </div>
        <button
          type="button"
          className="afferent-button"
          onClick={() => onComposingChange?.(!composing)}
        >
          <icons.create aria-hidden="true" />
          {copy.board.createFeedback}
        </button>
      </header>
      <section
        className="afferent-board__controls"
        aria-labelledby={controlsId}
      >
        <h2 id={controlsId}>{copy.board.browseHeading}</h2>
        <div className="afferent-controls-grid">
          <label htmlFor={boardControlId}>
            {copy.board.boardLabel}
            <select
              id={boardControlId}
              name="board"
              value={boardId ?? ""}
              onChange={(event) =>
                onBoardChange?.(
                  event.currentTarget.value
                    ? (event.currentTarget.value as BoardDto["id"])
                    : undefined,
                )
              }
            >
              <option value="">{copy.board.allBoards}</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={searchControlId}>
            {copy.board.searchLabel}
            <input
              id={searchControlId}
              type="search"
              name="search"
              value={query}
              onChange={(event) => onQueryChange?.(event.currentTarget.value)}
            />
          </label>
          <label htmlFor={statusControlId}>
            {copy.board.statusLabel}
            <select
              id={statusControlId}
              name="status"
              value={status ?? ""}
              onChange={(event) =>
                onStatusChange?.(
                  event.currentTarget.value
                    ? (event.currentTarget.value as PostStatusKey)
                    : undefined,
                )
              }
            >
              <option value="">{copy.board.allStatuses}</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label htmlFor={sortControlId}>
            {copy.board.sortLabel}
            <select
              id={sortControlId}
              name="sort"
              value={order}
              onChange={(event) =>
                onOrderChange?.(
                  event.currentTarget.value as FeedbackFeedArgs["order"],
                )
              }
            >
              <option value="top">Top</option>
              <option value="newest">Newest</option>
              <option value="trending">Trending</option>
            </select>
          </label>
        </div>
        {searching ? (
          <button
            type="button"
            className="afferent-button afferent-button--secondary"
            onClick={() => {
              onQueryChange?.("");
              onStatusChange?.(undefined);
            }}
          >
            {copy.board.clearFilters}
          </button>
        ) : null}
      </section>
      {composing ? (
        <AfferentFeedbackComposer
          boardId={boardId}
          onClose={() => onComposingChange?.(false)}
        />
      ) : null}
      <div className={postId ? "afferent-board__workspace" : undefined}>
        <section
          className="afferent-board__results"
          aria-labelledby="afferent-results-heading"
        >
          <h2 id="afferent-results-heading">{copy.board.resultsHeading}</h2>
          {content}
        </section>
        {postId ? <AfferentPostDetail postId={postId} /> : null}
      </div>
    </div>
  );
  if (!pageOwner) return body;
  return (
    <>
      <a className="afferent-skip-link" href="#afferent-board-main">
        {copy.board.skipToFeedback}
      </a>
      <main id="afferent-board-main">{body}</main>
    </>
  );
}

function renderFeed(
  feed: FeedbackFeedState,
  copy: ReturnType<typeof useAfferentUi>["copy"],
) {
  switch (feed.status) {
    case "loading": {
      return <AfferentStateRegion title={`${copy.common.loading} feedback…`} />;
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.board.emptyHeading}>
          <p>{copy.board.emptyBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion title={copy.board.loadErrorHeading} tone="error">
          <p>{copy.common.queryErrorGuidance}</p>
          <p>{afferentErrorText(feed.error)}</p>
          <button type="button" onClick={feed.retry}>
            {copy.board.reloadFeedback}
          </button>
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <>
          <AfferentFeedbackList items={feed.items} />
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
          <p className="afferent-sr-only" role="status" aria-live="polite">
            {feed.isLoadingMore
              ? copy.board.loadingMore
              : copy.board.resultCount(feed.items.length)}
          </p>
        </>
      );
    }
    default: {
      return assertNever(feed);
    }
  }
}

function renderSearch(
  state: BoundedDiscoveryState,
  copy: ReturnType<typeof useAfferentUi>["copy"],
) {
  switch (state.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.common.unsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.board.loadingSearch} />;
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.board.noMatchesHeading}>
          <p>{copy.board.noMatchesBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.board.searchErrorHeading}
          tone="error"
          action={
            <button type="button" onClick={state.retry}>
              {copy.board.retrySearch}
            </button>
          }
        >
          <p>{copy.common.queryErrorGuidance}</p>
          <p>{afferentErrorText(state.error)}</p>
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <>
          <AfferentFeedbackList
            items={state.items}
            label={copy.board.searchResultsLabel}
          />
          <p className="afferent-sr-only" role="status">
            {copy.board.resultCount(state.items.length)}
          </p>
        </>
      );
    }
    default: {
      return assertNever(state);
    }
  }
}
