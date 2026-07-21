import type { ComponentProps } from "react";

import { AfferentProvider } from "afferent/react.js";

import { AfferentBoardScreen } from "@/components/afferent/board/board-screen";
import { AfferentUiProvider } from "@/components/afferent/core/afferent-ui-provider";

const fixturePost = {
  id: "feedback_fixture",
  contractVersion: 3,
  title: "Ship source-owned feedback",
  body: "Install this screen through the local registry.",
  status: { key: "planned", label: "Planned" },
  boardId: "board_fixture",
  board: { id: "board_fixture", slug: "feedback", name: "Feedback" },
  author: { id: "actor_fixture", displayName: "Example user" },
  voteCount: 7,
  commentCount: 2,
  totals: { votes: 7, comments: 2 },
  tags: [],
  viewerHasVoted: false,
  viewerCanEdit: true,
  viewerCanWithdraw: true,
};

const bindings = {
  public: { listFeedback: {} },
} as unknown as ComponentProps<typeof AfferentProvider>["bindings"];

const client = {
  watchQuery() {
    return {
      onUpdate() {
        return () => {};
      },
      localQueryResult() {
        return {
          contractVersion: 3,
          page: [fixturePost],
          posts: [fixturePost],
          isDone: true,
          continueCursor: "",
        };
      },
    };
  },
} as unknown as ComponentProps<typeof AfferentProvider>["client"];

export function App() {
  return (
    <AfferentProvider
      bindings={bindings}
      auth={{ status: "authenticated", identityToken: "fixture-actor" }}
      client={client}
    >
      <AfferentUiProvider
        href={{
          post: (id) => `/feedback/${id}`,
          roadmap: () => "/roadmap",
          changelog: (slug) => `/changelog/${slug}`,
        }}
        currentLocation="/feedback"
      >
        <AfferentBoardScreen />
      </AfferentUiProvider>
    </AfferentProvider>
  );
}
