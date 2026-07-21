import type { PostId } from "afferent";
import type { AdminFeedbackState } from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentFeedbackQueue({
  feed,
  selectedId,
  onSelect,
}: Readonly<{
  feed: AdminFeedbackState;
  selectedId?: string;
  onSelect: (id: PostId) => void;
}>) {
  const { copy } = useAfferentUi();
  switch (feed.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.common.unsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.admin.loading} />;
    }
    case "not-authorized": {
      return (
        <AfferentStateRegion title={copy.common.notAuthorizedHeading}>
          <p>{copy.common.notAuthorizedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.admin.emptyHeading}>
          <p>{copy.admin.emptyBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.admin.loadError}
          tone="error"
          action={
            <button type="button" onClick={feed.loadMore}>
              {copy.common.tryLoadingAgain}
            </button>
          }
        >
          {feed.error ? <p>{afferentErrorText(feed.error)}</p> : null}
        </AfferentStateRegion>
      );
    }
    case "loading-more":
    case "ready": {
      return (
        <section aria-label={copy.admin.queueHeading}>
          <h2>{copy.admin.queueHeading}</h2>
          <ol className="afferent-admin-queue">
            {feed.items.map((item) => {
              const selected = selectedId === item.feedback.id;
              return (
                <li
                  key={item.feedback.id}
                  data-admin-feedback
                  data-selected={selected}
                >
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelect(item.feedback.id)}
                  >
                    {selected ? (
                      <span className="afferent-admin-queue__selection">
                        {copy.admin.selectedFeedback}
                      </span>
                    ) : null}
                    <span data-admin-label="Feedback">
                      {item.feedback.title}
                    </span>
                    <span data-admin-label="Status">
                      {item.feedback.status.label}
                    </span>
                    <span data-admin-label="Board">
                      {item.feedback.board.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {feed.canLoadMore ? (
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={feed.loadMore}
              disabled={feed.status === "loading-more"}
              aria-busy={feed.status === "loading-more"}
            >
              {feed.status === "loading-more"
                ? copy.common.loading
                : copy.admin.loadMore}
            </button>
          ) : null}
        </section>
      );
    }
    default: {
      return assertNever(feed.status as never);
    }
  }
}
