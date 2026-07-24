import {
  boardListResultValidator,
  changelogPageResultValidator,
  feedbackPageResultValidator,
  listBoardsIntentValidator,
  listFeedbackIntentValidator,
  listPublishedChangelogIntentValidator,
  listRoadmapGroupIntentValidator,
  roadmapGroupPageResultValidator,
  searchFeedbackIntentValidator,
  searchFeedbackResultValidator,
} from "afferent";
import type { ComponentApi } from "afferent/_generated/component.js";
import { paginationOptsValidator } from "convex/server";

import { createShowcaseClient } from "./afferent.js";
import { components } from "./_generated/api.js";
import { internalMutation, query } from "./_generated/server.js";
import {
  createComponentSeedOperations,
  createConvexSeedProgressStore,
  runRepresentativeSeed,
} from "./seeds.js";

const showcaseComponent = components.showcase as ComponentApi;
const client = createShowcaseClient(showcaseComponent);
const SHOWCASE_SCOPE = "afferent:single-product:v1";

export const seedShowcase = internalMutation({
  args: {},
  handler: async (ctx) =>
    runRepresentativeSeed({
      physicalScopeId: SHOWCASE_SCOPE,
      operations: createComponentSeedOperations({
        component: showcaseComponent,
        context: ctx,
      }),
      progress: createConvexSeedProgressStore(ctx),
    }),
});

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
