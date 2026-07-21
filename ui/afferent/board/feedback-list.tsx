import type { DiscoveryPostDto, FeedbackPostDto } from "afferent";

import { AfferentFeedbackCard } from "@/components/afferent/board/feedback-card";

export function AfferentFeedbackList({
  items,
  label = "Feedback",
}: Readonly<{
  items: readonly (DiscoveryPostDto | FeedbackPostDto)[];
  label?: string;
}>) {
  return (
    <ol className="afferent-board__list" aria-label={label}>
      {items.map((post) => (
        <li key={post.id}>
          <AfferentFeedbackCard post={post} />
        </li>
      ))}
    </ol>
  );
}
