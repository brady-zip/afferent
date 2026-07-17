import type { ComponentProps } from "react";

import { AfferentBoardScreen } from "@/components/afferent/board/board-screen";
import { AfferentUiProvider } from "@/components/afferent/core/afferent-ui-provider";

type Feed = ComponentProps<typeof AfferentBoardScreen>["feed"];

const readyFeed = {
  status: "ready",
  items: [
    {
      id: "feedback_fixture",
      title: "Ship source-owned feedback",
      body: "Install this screen through the local registry.",
      status: "planned",
      boardId: "board_fixture",
      voteCount: 7,
      totals: { votes: 7, comments: 2 },
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
      <AfferentBoardScreen feed={readyFeed} />
    </AfferentUiProvider>
  );
}
