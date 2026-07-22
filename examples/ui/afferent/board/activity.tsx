"use client";

import type { PostId } from "afferent";
import { usePostActivity, type PostActivityState } from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { formatActivityDescription } from "@/components/afferent/core/format";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentPostActivity({ postId }: Readonly<{ postId: PostId }>) {
  return <AfferentPostActivityView state={usePostActivity(postId)} />;
}

export function AfferentPostActivityView({
  state,
}: Readonly<{ state: PostActivityState }>) {
  const { copy } = useAfferentUi();
  switch (state.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.activity.unsupportedHeading}>
          <p>{copy.activity.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.activity.emptyHeading}>
          <p>{copy.activity.emptyBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.activity.loading} />;
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.activity.errorHeading}
          tone="error"
          action={
            <button type="button" onClick={state.retry}>
              {copy.activity.retryLoading}
            </button>
          }
        >
          <p>{copy.common.queryErrorGuidance}</p>
          {state.error ? <p>{afferentErrorText(state.error)}</p> : null}
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <section
          className="afferent-activity"
          aria-labelledby="afferent-activity-heading"
        >
          <h2 id="afferent-activity-heading">{copy.activity.heading}</h2>
          <ol>
            {state.items.map((item) => (
              <li key={item.id}>{formatActivityDescription(item)}</li>
            ))}
          </ol>
          {state.canLoadMore ? (
            <button
              type="button"
              onClick={state.loadMore}
              disabled={state.isLoadingMore}
            >
              {state.isLoadingMore
                ? copy.activity.loadingMore
                : copy.activity.loadMore}
            </button>
          ) : null}
        </section>
      );
    }
    default: {
      return assertNever(state);
    }
  }
}
