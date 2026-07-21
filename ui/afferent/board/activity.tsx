"use client";

import type { PostActivityDto, PostId } from "afferent";
import { usePostActivity, type PostActivityState } from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
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
    case "unsupported":
    case "empty": {
      return null;
    }
    case "loading": {
      return <AfferentStateRegion title={copy.activity.loading} />;
    }
    case "error": {
      return null;
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
              <li key={item.id}>{activityLabel(item, copy.activity)}</li>
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
      return assertNever(state.status);
    }
  }
}

function activityLabel(
  item: PostActivityDto,
  copy: ReturnType<typeof useAfferentUi>["copy"]["activity"],
) {
  return copy.event(item.type, item.actor?.displayName);
}
