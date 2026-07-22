"use client";

import {
  useChangelogEntry,
  useChangelogFeed,
  type ChangelogEntryState,
  type ChangelogFeedState,
} from "afferent/react.js";

import { AfferentChangelogEntry } from "@/components/afferent/changelog/changelog-entry";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentChangelogScreen({
  slug,
  pageOwner = true,
}: Readonly<{ slug?: string; pageOwner?: boolean }>) {
  const { copy } = useAfferentUi();
  const feed = useChangelogFeed();
  const body = (
    <div className="afferent-changelog" data-afferent-screen="changelog">
      <header className="afferent-public-header">
        <div>
          <h1>{copy.changelog.title}</h1>
          <p>{copy.changelog.description}</p>
        </div>
      </header>
      {renderFeed(feed, copy)}
      {slug ? <AfferentChangelogDetail slug={slug} /> : null}
    </div>
  );
  return pageOwner ? <main>{body}</main> : body;
}

function AfferentChangelogDetail({ slug }: Readonly<{ slug: string }>) {
  const { copy } = useAfferentUi();
  return (
    <section
      className="afferent-changelog__detail"
      aria-label={copy.changelog.entryDetail}
    >
      {renderDetail(useChangelogEntry(slug), copy)}
    </section>
  );
}

function renderFeed(
  feed: ChangelogFeedState,
  copy: ReturnType<typeof useAfferentUi>["copy"],
) {
  switch (feed.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.common.unsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.changelog.loading} />;
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.changelog.emptyHeading}>
          <p>{copy.changelog.emptyBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.changelog.loadErrorHeading}
          tone="error"
          action={
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={feed.retry}
            >
              {copy.changelog.retryFeed}
            </button>
          }
        >
          <p>{copy.common.queryErrorGuidance}</p>
          <p>{afferentErrorText(feed.error)}</p>
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <section aria-label={copy.changelog.entriesLabel}>
          <ol className="afferent-changelog__list">
            {feed.items.map((entry) => (
              <li key={entry.id}>
                <AfferentChangelogEntry entry={entry} />
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
                ? copy.changelog.loadingMore
                : copy.changelog.loadMore}
            </button>
          ) : null}
        </section>
      );
    }
    default: {
      return assertNever(feed);
    }
  }
}

function renderDetail(
  detail: ChangelogEntryState,
  copy: ReturnType<typeof useAfferentUi>["copy"],
) {
  switch (detail.status) {
    case "unsupported": {
      return <AfferentStateRegion title={copy.common.unsupportedHeading} />;
    }
    case "loading": {
      return <AfferentStateRegion title={copy.changelog.loadingEntry} />;
    }
    case "notFound": {
      return (
        <AfferentStateRegion title={copy.changelog.notFoundHeading}>
          <p>{copy.changelog.notFoundBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.changelog.entryErrorHeading}
          tone="error"
          action={
            <button type="button" onClick={detail.retry}>
              {copy.changelog.retryEntry}
            </button>
          }
        >
          <p>{copy.common.queryErrorGuidance}</p>
          <p>{afferentErrorText(detail.error)}</p>
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return <AfferentChangelogEntry entry={detail.entry} detail />;
    }
    default: {
      return assertNever(detail);
    }
  }
}
