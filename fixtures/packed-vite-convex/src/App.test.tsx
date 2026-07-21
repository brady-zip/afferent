import { writeFile } from "node:fs/promises";

import { convexTest } from "convex-test";
import { register } from "afferent/test";
import * as headless from "afferent/react.js";
import { expect, test } from "vitest";

import { api } from "../convex/_generated/api.js";
import {
  adminRestoreProjection,
  feedbackActionLabels,
  linkedFeedbackProjection,
  notificationTargetView,
  readableActivityProjection,
  submitFeedback,
} from "./App.js";

const modules = import.meta.glob("../convex/**/*.ts");

test("the packed React subpath exposes the complete headless workflow", () => {
  for (const exported of [
    "AfferentProvider",
    "useFeedbackFeed",
    "useFeedbackMutations",
    "useAdminCapability",
    "useAdminFeedback",
    "useAdminPost",
    "useAdminChangelog",
    "useRoadmap",
    "useChangelogFeed",
    "useNotifications",
    "mapAfferentError",
  ]) {
    expect(headless[exported as keyof typeof headless]).toBeTypeOf("function");
  }
  expect(
    headless.getAfferentSessionKey({
      status: "authenticated",
      identityToken: "fixture-user",
    }),
  ).toBe("authenticated");
  expect(() =>
    headless.getAfferentSessionKey({
      status: "authenticated",
      identityToken: "",
    }),
  ).toThrow("identityToken must be non-empty");
});

test("the packed consumer dispatches the closed notification target verbatim", () => {
  expect(
    notificationTargetView({
      contractVersion: 1,
      kind: "post",
      postId: "post:packed" as never,
      commentId: "comment:packed" as never,
      label: "View comment on feedback: Packed navigation",
    }),
  ).toEqual({
    kind: "post",
    label: "View comment on feedback: Packed navigation",
  });
  expect(
    notificationTargetView({
      contractVersion: 1,
      kind: "changelog",
      slug: "packed-navigation",
      label: "View changelog: Packed navigation",
    }),
  ).toEqual({
    kind: "changelog",
    label: "View changelog: Packed navigation",
  });
});

test("the form submit handler writes through the host wrapper and renders the public DTO", async () => {
  const backend = convexTest(undefined, modules);
  register(backend, "afferent");

  const authenticated = backend.withIdentity({
    issuer: "https://fixture.example",
    subject: "trusted-user",
    name: "Fixture User",
  });
  const configured = await authenticated.mutation(
    api.afferent.configureInstallation,
    {
      readPolicy: "public",
      boards: [
        { slug: "feedback", name: "Product Feedback" },
        { slug: "roadmap", name: "Product Roadmap" },
      ],
    },
  );
  const board = configured.boards[0];
  const browserArgs = {
    boardId: board.id,
    title: "Packed consumer feedback",
    body: "Created through the trusted host participation wrapper.",
  };

  const createdPost = await submitFeedback(browserArgs, {
    createPost: (args) => authenticated.mutation(api.afferent.createPost, args),
  });
  const listed = await authenticated.query(api.afferent.listPosts, {
    boardId: board.id,
  });
  const readPost = listed.posts[0];

  expect(readPost).toEqual(createdPost);
  expect(readPost).toMatchObject({
    contractVersion: 2,
    title: browserArgs.title,
    voteCount: 0,
    commentCount: 0,
    viewerHasVoted: false,
    viewerCanEdit: true,
    viewerCanWithdraw: true,
  });
  expect(feedbackActionLabels(readPost)).toEqual({
    vote: "Vote for feedback",
    edit: "Edit feedback",
    withdraw: "Withdraw feedback",
  });

  await authenticated.mutation(api.afferent.movePost, {
    postId: createdPost.id,
    boardId: configured.boards[1].id,
  });
  const tag = await authenticated.mutation(api.afferent.createTag, {
    name: "Packed tag",
  });
  await authenticated.mutation(api.afferent.setPostTag, {
    postId: createdPost.id,
    tagId: tag.id,
    desired: true,
  });
  const draft = await authenticated.mutation(
    api.afferent.createChangelogDraft,
    {
      title: "Packed release",
      body: "Packed release notes",
      slug: "packed-release",
    },
  );
  await authenticated.mutation(api.afferent.setChangelogLinks, {
    entryId: draft.id,
    postIds: [createdPost.id],
  });
  await authenticated.mutation(api.afferent.publishChangelog, {
    entryId: draft.id,
  });
  await authenticated.mutation(api.afferent.unpublishChangelog, {
    entryId: draft.id,
  });
  await authenticated.mutation(api.afferent.setDiscussionLock, {
    postId: createdPost.id,
    locked: true,
  });
  await authenticated.mutation(api.afferent.setArchived, {
    postId: createdPost.id,
    archived: true,
  });

  const hidden = await authenticated.query(api.afferent.listAdminFeedback, {
    visibility: "hidden",
    sessionGeneration: 1,
    paginationOpts: { numItems: 20, cursor: null },
  });
  const adminPost = await authenticated.query(api.afferent.getAdminPost, {
    postId: createdPost.id,
    sessionGeneration: 1,
  });
  const adminChangelog = await authenticated.query(
    api.afferent.listAdminChangelog,
    {
      sessionGeneration: 1,
      paginationOpts: { numItems: 20, cursor: null },
    },
  );
  const activity = await authenticated.query(api.afferent.listPostActivity, {
    postId: createdPost.id,
    sessionGeneration: 1,
    paginationOpts: { numItems: 20, cursor: null },
  });
  const restore = adminRestoreProjection(adminPost);
  const linkedFeedback = linkedFeedbackProjection(adminChangelog.page);
  const readableActivity = readableActivityProjection(activity.page);

  expect(hidden.page.map((row) => row.feedback.id)).toEqual([createdPost.id]);
  expect(adminPost.moderation).toEqual({
    contractVersion: 1,
    discussionLocked: true,
    archived: true,
    disposition: "active",
  });
  expect(restore).toEqual({
    eligible: true,
    discussionLocked: true,
    archived: true,
    disposition: "active",
  });
  expect(adminChangelog.page).toMatchObject([
    {
      id: draft.id,
      state: "unpublished",
      links: [
        {
          id: createdPost.id,
          title: browserArgs.title,
          status: { key: "open", label: "Open" },
        },
      ],
    },
  ]);
  expect(linkedFeedback).toEqual([
    {
      entryId: draft.id,
      id: createdPost.id,
      title: browserArgs.title,
      status: "open",
    },
  ]);
  expect(readableActivity).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "board_move",
        fromBoard: expect.objectContaining({
          name: "Product Feedback",
          slug: "feedback",
        }),
        toBoard: expect.objectContaining({
          name: "Product Roadmap",
          slug: "roadmap",
        }),
      }),
      expect.objectContaining({
        type: "tag_add",
        tag: expect.objectContaining({ name: "Packed tag" }),
      }),
      expect.objectContaining({
        type: "changelog_publish",
        changelog: expect.objectContaining({
          title: "Packed release",
          slug: "packed-release",
        }),
      }),
      expect.objectContaining({
        type: "changelog_unpublish",
        changelog: expect.objectContaining({
          title: "Packed release",
          slug: "packed-release",
        }),
      }),
    ]),
  );

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
        adminRead: {
          hiddenIds: hidden.page.map((row) => row.feedback.id),
          direct: adminPost,
          restore,
          changelog: adminChangelog.page,
          linkedFeedback,
          activity: readableActivity,
        },
      }),
    );
  }
});
