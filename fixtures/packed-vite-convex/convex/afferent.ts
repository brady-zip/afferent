import {
  configureInstallationIntentValidator,
  createAfferentClient,
  createPostIntentValidator,
  installationResultValidator,
  listPostsIntentValidator,
  postPageResultValidator,
  publicPostActionResultValidator,
} from "afferent";
import type { BoardId } from "afferent";
import type { ComponentApi } from "afferent/_generated/component.js";

import { components } from "./_generated/api.js";
import { mutation, query } from "./_generated/server.js";

const installedComponent: ComponentApi = components.afferent;
const client = createAfferentClient(installedComponent, {
  resolveActor: async () => ({
    externalKey: "fixture:trusted-user",
    displayName: "Fixture User",
  }),
  authorizeAdmin: async () => true,
  isAuthenticated: async () => true,
});

export const configureInstallation = mutation({
  args: configureInstallationIntentValidator.fields,
  returns: installationResultValidator,
  handler: (ctx, args) => client.admin.configureInstallation(ctx, args),
});

export const createPost = mutation({
  args: createPostIntentValidator.fields,
  returns: publicPostActionResultValidator,
  handler: (ctx, args) =>
    client.participation.createPost(ctx, {
      ...args,
      boardId: args.boardId as BoardId,
    }),
});

export const listPosts = query({
  args: listPostsIntentValidator.fields,
  returns: postPageResultValidator,
  handler: (ctx, args) =>
    client.read.listPosts(ctx, {
      boardId: args.boardId as BoardId,
      paginationOpts: args.paginationOpts,
    }),
});
