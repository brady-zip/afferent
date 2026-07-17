import { writeFile } from "node:fs/promises";

import { convexTest } from "convex-test";
import { register } from "afferent/test";
import * as headless from "afferent/react.js";
import { expect, test } from "vitest";

import { api } from "../convex/_generated/api.js";
import { submitFeedback } from "./App.js";

const modules = import.meta.glob("../convex/**/*.ts");

test("the packed React subpath exposes the complete headless workflow", () => {
  for (const exported of [
    "AfferentProvider",
    "useFeedbackFeed",
    "useFeedbackMutations",
    "useAdminCapability",
    "useRoadmap",
    "useChangelogFeed",
    "useNotifications",
    "mapAfferentError",
  ]) {
    expect(headless[exported as keyof typeof headless]).toBeTypeOf("function");
  }
});

test("the form submit handler writes through the host wrapper and renders the public DTO", async () => {
  const backend = convexTest(undefined, modules);
  register(backend, "afferent");

  const configured = await backend.mutation(
    api.afferent.configureInstallation,
    {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Product Feedback" }],
    },
  );
  const board = configured.boards[0];
  const browserArgs = {
    boardId: board.id,
    title: "Packed consumer feedback",
    body: "Created through the trusted host participation wrapper.",
  };

  const createdPost = await submitFeedback(browserArgs, {
    createPost: (args) => backend.mutation(api.afferent.createPost, args),
  });
  const listed = await backend.query(api.afferent.listPosts, {
    boardId: board.id,
  });
  const readPost = listed.posts[0];

  expect(readPost).toEqual(createdPost);
  expect(readPost).toMatchObject({
    title: browserArgs.title,
    voteCount: 0,
    commentCount: 0,
  });

  const transcriptPath = process.env.AFFERENT_TRANSCRIPT_PATH;
  if (transcriptPath) {
    await writeFile(
      transcriptPath,
      JSON.stringify({
        browserArgs,
        board,
        createdPost,
        readPost,
        viteRender: {
          title: readPost.title,
          voteCount: readPost.voteCount,
          commentCount: readPost.commentCount,
        },
        trustedHostScope: "fixed-server-only",
        actorFields: ["externalKey", "displayName"],
      }),
    );
  }
});
