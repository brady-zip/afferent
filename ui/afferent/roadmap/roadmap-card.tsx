import type { RoadmapItemDto } from "afferent";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";

export function AfferentRoadmapCard({
  item,
}: Readonly<{ item: RoadmapItemDto }>) {
  const { copy, navigation } = useAfferentUi();
  const Link = navigation.Link;
  return (
    <article className="afferent-roadmap-card">
      <h3>
        <Link href={navigation.href.post(item.id)}>{item.title}</Link>
      </h3>
      <p className="afferent-roadmap-card__status">{item.status.label}</p>
      <p className="afferent-roadmap-card__board">{item.board.name}</p>
      <dl className="afferent-roadmap-card__totals">
        <div>
          <dt>Votes</dt>
          <dd>{copy.board.voteCount(item.voteCount)}</dd>
        </div>
        <div>
          <dt>Comments</dt>
          <dd>{copy.board.commentCount(item.commentCount)}</dd>
        </div>
      </dl>
    </article>
  );
}
