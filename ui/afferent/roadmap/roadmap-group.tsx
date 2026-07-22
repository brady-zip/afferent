import type { RoadmapGroupState } from "afferent/react.js";

import { AfferentStateRegion } from "@/components/afferent/core/state-region";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { AfferentRoadmapCard } from "@/components/afferent/roadmap/roadmap-card";

export function AfferentRoadmapGroup({
  groupKey,
  name,
  group,
}: Readonly<{
  groupKey: "planned" | "in_progress" | "complete";
  name: "Planned" | "In Progress" | "Complete";
  group: RoadmapGroupState;
}>) {
  const { copy } = useAfferentUi();
  return (
    <section
      className="afferent-roadmap-group"
      data-roadmap-group={groupKey}
      aria-labelledby={`afferent-roadmap-${groupKey}`}
    >
      <header>
        <h2 id={`afferent-roadmap-${groupKey}`}>{name}</h2>
        <span aria-label={`${group.items.length} ${name} items`}>
          {group.items.length}
        </span>
      </header>
      {renderGroup(name, group, copy)}
    </section>
  );
}

function renderGroup(
  name: "Planned" | "In Progress" | "Complete",
  group: RoadmapGroupState,
  copy: ReturnType<typeof useAfferentUi>["copy"],
) {
  switch (group.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.common.unsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.roadmap.loadingGroup(name)} />;
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.roadmap.emptyGroup(name)}>
          <p>{copy.roadmap.emptyGroupBody(name)}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.roadmap.loadErrorHeading(name)}
          tone="error"
          action={
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={group.retry}
            >
              {copy.common.tryLoadingAgain}
            </button>
          }
        >
          <p>{copy.common.queryErrorGuidance}</p>
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <>
          <ol className="afferent-roadmap-group__list">
            {group.items.map((item) => (
              <li key={item.id}>
                <AfferentRoadmapCard item={item} />
              </li>
            ))}
          </ol>
          {group.canLoadMore ? (
            <button
              type="button"
              className="afferent-button afferent-button--secondary"
              onClick={group.loadMore}
              disabled={group.isLoadingMore}
              aria-busy={group.isLoadingMore}
            >
              {group.isLoadingMore
                ? copy.roadmap.loadingMore(name)
                : copy.roadmap.loadMore(name)}
            </button>
          ) : null}
        </>
      );
    }
  }
}
