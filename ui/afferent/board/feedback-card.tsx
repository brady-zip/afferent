import type { DiscoveryPostDto, FeedbackPostDto } from "afferent";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";

export function AfferentFeedbackCard({
  post,
}: Readonly<{ post: DiscoveryPostDto | FeedbackPostDto }>) {
  const { copy, icons, navigation } = useAfferentUi();
  const Link = navigation.Link;
  const detailed = "body" in post;
  return (
    <article className="afferent-feedback-card">
      <div className="afferent-feedback-card__content">
        <h2>
          <Link href={navigation.href.post(post.id)}>{post.title}</Link>
        </h2>
        {detailed ? (
          <p className="afferent-feedback-card__body">{post.body}</p>
        ) : null}
        <p className="afferent-feedback-card__status">{post.status.label}</p>
        <p className="afferent-feedback-card__board">{post.board.name}</p>
      </div>
      {detailed ? (
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
      ) : null}
    </article>
  );
}
