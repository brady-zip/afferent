import type { AdminFeedbackState } from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentFeedbackQueue({
  feed,
  selectedId,
  onSelect,
}: Readonly<{
  feed: AdminFeedbackState;
  selectedId?: string;
  onSelect: (id: any) => void;
}>) {
  const { copy } = useAfferentUi();
  switch (feed.status) {
    case "unsupported": {
      return <AfferentStateRegion title={copy.common.unsupportedHeading} />;
    }
    case "loading": {
      return <AfferentStateRegion title={copy.common.loading} />;
    }
    case "not-authorized": {
      return <AfferentStateRegion title={copy.common.notAuthorizedHeading} />;
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.admin.emptyHeading}>
          <p>{copy.admin.emptyBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return <AfferentStateRegion title={copy.admin.loadError} tone="error" />;
    }
    case "loading-more":
    case "ready": {
      return (
        <section aria-label={copy.admin.queueHeading}>
          <h2>{copy.admin.queueHeading}</h2>
          <ol className="afferent-admin-queue">
            {feed.items.map((item) => (
              <li
                key={item.feedback.id}
                data-admin-feedback
                data-selected={selectedId === item.feedback.id}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.feedback.id)}
                >
                  <span data-admin-label="Feedback">{item.feedback.title}</span>
                  <span data-admin-label="Status">
                    {item.feedback.status.label}
                  </span>
                  <span data-admin-label="Board">
                    {item.feedback.board.name}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {feed.canLoadMore ? (
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={feed.loadMore}
            >
              {copy.admin.loadMore}
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
