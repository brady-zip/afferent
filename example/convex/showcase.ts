import {
  boardListResultValidator,
  changelogPageResultValidator,
  commentPageResultValidator,
  feedbackPageResultValidator,
  getPostIntentValidator,
  getPublishedChangelogBySlugIntentValidator,
  listBoardsIntentValidator,
  listCommentsIntentValidator,
  listFeedbackIntentValidator,
  listPublishedChangelogIntentValidator,
  listRoadmapGroupIntentValidator,
  postLookupResultValidator,
  publishedChangelogLookupResultValidator,
  roadmapGroupPageResultValidator,
  searchFeedbackIntentValidator,
  searchFeedbackResultValidator,
} from "afferent";
import type { ComponentApi } from "afferent/_generated/component.js";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { createShowcaseClient } from "./afferent.js";
import { components } from "./_generated/api.js";
import { query } from "./_generated/server.js";

const showcaseComponent = components.showcase as ComponentApi;
const client = createShowcaseClient(showcaseComponent);
const cacheGenerationValidator = { sessionGeneration: v.number() };

function withoutSessionGeneration<T extends object>(
  args: T,
): Omit<T, "sessionGeneration"> {
  const { sessionGeneration: _sessionGeneration, ...intent } = args as T & {
    sessionGeneration: number;
  };
  return intent as Omit<T, "sessionGeneration">;
}

export const listBoards = query({
  args: listBoardsIntentValidator.fields,
  returns: boardListResultValidator,
  handler: (ctx, args) => client.read.listBoards(ctx, args),
});

export const listFeedback = query({
  args: {
    ...listFeedbackIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: feedbackPageResultValidator,
  handler: (ctx, args) =>
    client.read.listFeedback(ctx, withoutSessionGeneration(args) as never),
});

export const resolvePost = query({
  args: { ...getPostIntentValidator.fields, ...cacheGenerationValidator },
  returns: postLookupResultValidator,
  handler: (ctx, args) =>
    client.read.resolvePost(ctx, withoutSessionGeneration(args) as never),
});

export const listComments = query({
  args: {
    ...listCommentsIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: commentPageResultValidator,
  handler: (ctx, args) =>
    client.read.listComments(ctx, withoutSessionGeneration(args) as never),
});

export const searchFeedback = query({
  args: {
    ...searchFeedbackIntentValidator.fields,
    ...cacheGenerationValidator,
  },
  returns: searchFeedbackResultValidator,
  handler: (ctx, args) =>
    client.read.searchFeedback(ctx, withoutSessionGeneration(args) as never),
});

export const listRoadmapGroup = query({
  args: {
    ...listRoadmapGroupIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: roadmapGroupPageResultValidator,
  handler: (ctx, args) =>
    client.read.listRoadmapGroup(ctx, withoutSessionGeneration(args) as never),
});

export const listPublishedChangelog = query({
  args: {
    ...listPublishedChangelogIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: changelogPageResultValidator,
  handler: (ctx, args) =>
    client.read.listPublishedChangelog(ctx, withoutSessionGeneration(args)),
});

export const getPublishedChangelogBySlug = query({
  args: {
    ...getPublishedChangelogBySlugIntentValidator.fields,
    ...cacheGenerationValidator,
  },
  returns: publishedChangelogLookupResultValidator,
  handler: (ctx, args) =>
    client.read.getPublishedChangelogBySlug(
      ctx,
      withoutSessionGeneration(args),
    ),
});
