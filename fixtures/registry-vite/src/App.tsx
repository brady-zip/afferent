import type { ComponentProps } from "react";

import { AfferentBoardView } from "@/components/afferent/board/board-screen";
import { AfferentUiProvider } from "@/components/afferent/core/afferent-ui-provider";

type Feed = ComponentProps<typeof AfferentBoardView>["feed"];

const readyFeed = {
  status: "ready",
  items: [
    {
      id: "feedback_fixture",
      contractVersion: 2,
      title: "Ship source-owned feedback",
      body: "Install this screen through the local registry.",
      status: { key: "planned", label: "Planned" },
      boardId: "board_fixture",
      board: {
        id: "board_fixture",
        slug: "feedback",
        name: "Feedback",
      },
      author: { id: "actor_fixture", displayName: "Example user" },
      voteCount: 7,
      commentCount: 2,
      totals: { votes: 7, comments: 2 },
      tags: [],
    },
  ],
  canLoadMore: false,
  isLoadingMore: false,
  loadMore() {},
} as unknown as Feed;

export function App() {
  return (
    <AfferentUiProvider
      href={{
        post: (id) => `/feedback/${id}`,
        roadmap: () => "/roadmap",
        changelog: (slug) => `/changelog/${slug}`,
      }}
      currentLocation="/feedback"
    >
      <AfferentBoardView feed={readyFeed} />
    </AfferentUiProvider>
  );
}
