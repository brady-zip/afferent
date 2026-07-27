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

import { createShowcaseClient } from "./afferent.js";
import { components } from "./_generated/api.js";
import { query } from "./_generated/server.js";

const showcaseComponent = components.showcase as ComponentApi;
const client = createShowcaseClient(showcaseComponent);

export const listBoards = query({
  args: listBoardsIntentValidator.fields,
  returns: boardListResultValidator,
  handler: (ctx, args) => client.read.listBoards(ctx, args),
});

export const listFeedback = query({
  args: {
    ...listFeedbackIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: feedbackPageResultValidator,
  handler: (ctx, args) => client.read.listFeedback(ctx, args as never),
});

export const resolvePost = query({
  args: getPostIntentValidator.fields,
  returns: postLookupResultValidator,
  handler: (ctx, args) => client.read.resolvePost(ctx, args as never),
});

export const listComments = query({
  args: {
    ...listCommentsIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: commentPageResultValidator,
  handler: (ctx, args) => client.read.listComments(ctx, args as never),
});

export const searchFeedback = query({
  args: searchFeedbackIntentValidator.fields,
  returns: searchFeedbackResultValidator,
  handler: (ctx, args) => client.read.searchFeedback(ctx, args as never),
});

export const listRoadmapGroup = query({
  args: {
    ...listRoadmapGroupIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: roadmapGroupPageResultValidator,
  handler: (ctx, args) => client.read.listRoadmapGroup(ctx, args as never),
});

export const listPublishedChangelog = query({
  args: {
    ...listPublishedChangelogIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: changelogPageResultValidator,
  handler: (ctx, args) => client.read.listPublishedChangelog(ctx, args),
});

export const getPublishedChangelogBySlug = query({
  args: getPublishedChangelogBySlugIntentValidator.fields,
  returns: publishedChangelogLookupResultValidator,
  handler: (ctx, args) => client.read.getPublishedChangelogBySlug(ctx, args),
});
