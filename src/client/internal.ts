import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";

import type { ComponentApi } from "../component/_generated/component.js";
import type {
  AdminCapabilities,
  AdminChangelogEntryDto,
  BoardDto,
  CommentDto,
  CommentPageDto,
  ChangelogPageDto,
  DeliveryBatchDto,
  DeliveryCapabilities,
  DeliveryOperationResult,
  FeedbackPageDto,
  NotificationCapabilities,
  NotificationDto,
  NotificationPageDto,
  PostSubscriptionDto,
  UnreadNotificationCountDto,
  ParticipationCapabilities,
  PostCountDto,
  PostDto,
  PostPageDto,
  ReadCapabilities,
  SearchResultDto,
  SimilarPostResultDto,
  FeedbackPostDto,
  PostActivityPageDto,
  PublishedChangelogLookupDto,
  PostLookupResult,
  MergePostResult,
  RoadmapGroupPageDto,
  TagDeleteResultDto,
  TagDto,
  TagListDto,
  VerifiedActor,
} from "./contracts.js";

export type ReadContext = GenericQueryCtx<any>;
export type MutationContext = GenericMutationCtx<any>;
export type HostContext = ReadContext | MutationContext;

export type ClientResolvers = Readonly<{
  resolveScope: (ctx: HostContext) => Promise<string>;
  resolveActor: (ctx: MutationContext) => Promise<VerifiedActor | null>;
  authorizeAdmin: (ctx: HostContext) => Promise<boolean>;
  isAuthenticated?: (ctx: ReadContext) => Promise<boolean>;
}>;

export type DeliveryClientResolvers = Readonly<{
  resolveScope: (ctx: MutationContext) => Promise<string>;
  authorizeDelivery: (ctx: MutationContext) => Promise<boolean>;
}>;

export type DeliveryClient = Readonly<{
  delivery: DeliveryCapabilities<MutationContext>;
}>;

export type AfferentClient = Readonly<{
  read: ReadCapabilities<ReadContext>;
  participation: ParticipationCapabilities<MutationContext>;
  notifications: NotificationCapabilities<ReadContext, MutationContext>;
  admin: AdminCapabilities<ReadContext, MutationContext>;
}>;

async function resolveRequiredScope<Context extends HostContext>(
  resolver: (ctx: Context) => Promise<string>,
  ctx: Context,
) {
  const scopeId = await resolver(ctx);
  if (!scopeId?.trim()) throw new Error("SCOPE_RESOLUTION_REQUIRED");
  return scopeId;
}

async function viewerAuthenticated(options: ClientResolvers, ctx: ReadContext) {
  return options.isAuthenticated ? await options.isAuthenticated(ctx) : false;
}

export function createDeliveryClientWithScope(
  component: ComponentApi,
  options: DeliveryClientResolvers,
): DeliveryClient {
  async function authorize(ctx: MutationContext) {
    const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
    if (!(await options.authorizeDelivery(ctx))) {
      throw new Error("NOT_AUTHORIZED");
    }
    return scopeId;
  }

  return {
    delivery: {
      async claimDeliveryBatch(ctx, args) {
        const scopeId = await authorize(ctx);
        return (await ctx.runMutation(
          component.notifications.outbox.claimDeliveryBatch,
          {
            scopeId,
            leaseOwner: args.leaseOwner,
            limit: args.limit ?? 50,
          },
        )) as unknown as DeliveryBatchDto;
      },
      async ackDelivery(ctx, args) {
        const scopeId = await authorize(ctx);
        return (await ctx.runMutation(
          component.notifications.outbox.ackDelivery,
          { scopeId, ...args },
        )) as unknown as DeliveryOperationResult;
      },
      async releaseDelivery(ctx, args) {
        const scopeId = await authorize(ctx);
        return (await ctx.runMutation(
          component.notifications.outbox.releaseDelivery,
          { scopeId, ...args },
        )) as unknown as DeliveryOperationResult;
      },
    },
  };
}

export function createClientWithScope(
  component: ComponentApi,
  options: ClientResolvers,
): AfferentClient {
  return {
    read: {
      async listBoards(ctx) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.boards.listBoards, {
          scopeId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
        })) as unknown as { contractVersion: 1; boards: BoardDto[] };
      },
      async listPosts(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.posts.listPosts, {
          scopeId,
          boardId: args.boardId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
          paginationOpts: args.paginationOpts ?? {
            numItems: 50,
            cursor: null,
          },
        })) as unknown as PostPageDto;
      },
      async listFeedback(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.feeds.listFeedback, {
          scopeId,
          order: args.order,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
          ...(args.boardId === undefined ? {} : { boardId: args.boardId }),
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.tagId === undefined ? {} : { tagId: args.tagId }),
          paginationOpts: args.paginationOpts ?? {
            numItems: 20,
            cursor: null,
          },
        })) as unknown as FeedbackPageDto;
      },
      async listRoadmapGroup(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.roadmap.listRoadmapGroup, {
          scopeId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
          status: args.status,
          ...(args.boardId === undefined ? {} : { boardId: args.boardId }),
          paginationOpts: args.paginationOpts ?? {
            numItems: 20,
            cursor: null,
          },
        })) as unknown as RoadmapGroupPageDto;
      },
      async listPublishedChangelog(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(
          component.public.changelog.listPublishedChangelog,
          {
            scopeId,
            viewerAuthenticated: await viewerAuthenticated(options, ctx),
            paginationOpts: args.paginationOpts ?? {
              numItems: 20,
              cursor: null,
            },
          },
        )) as unknown as ChangelogPageDto;
      },
      async getPublishedChangelogBySlug(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(
          component.public.changelog.getPublishedChangelogBySlug,
          {
            scopeId,
            viewerAuthenticated: await viewerAuthenticated(options, ctx),
            slug: args.slug,
          },
        )) as unknown as PublishedChangelogLookupDto;
      },
      async searchFeedback(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.search.searchFeedback, {
          scopeId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
          query: args.query,
          ...(args.boardId === undefined ? {} : { boardId: args.boardId }),
          ...(args.status === undefined ? {} : { status: args.status }),
          ...(args.tagId === undefined ? {} : { tagId: args.tagId }),
        })) as unknown as SearchResultDto;
      },
      async suggestSimilarPosts(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(
          component.public.search.suggestSimilarPosts,
          {
            scopeId,
            viewerAuthenticated: await viewerAuthenticated(options, ctx),
            title: args.title,
            ...(args.body === undefined ? {} : { body: args.body }),
            ...(args.limit === undefined ? {} : { limit: args.limit }),
          },
        )) as unknown as SimilarPostResultDto;
      },
      async getPost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.posts.getPost, {
          scopeId,
          postId: args.postId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
        })) as unknown as PostDto;
      },
      async resolvePost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.posts.resolvePost, {
          scopeId,
          postId: args.postId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
        })) as unknown as PostLookupResult;
      },
      async countPosts(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.posts.countPosts, {
          scopeId,
          boardId: args.boardId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
        })) as unknown as PostCountDto;
      },
      async listComments(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.comments.listComments, {
          scopeId,
          postId: args.postId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
          paginationOpts: args.paginationOpts ?? {
            numItems: 50,
            cursor: null,
          },
        })) as unknown as CommentPageDto;
      },
    },
    participation: {
      async createPost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx as MutationContext);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.participation.posts.createPost,
          {
            scopeId,
            actor,
            boardId: args.boardId,
            title: args.title,
            body: args.body,
          },
        )) as unknown as PostDto;
      },
      async editPost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx as MutationContext);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.participation.posts.editPost, {
          scopeId,
          actor,
          postId: args.postId,
          ...(args.title === undefined ? {} : { title: args.title }),
          ...(args.body === undefined ? {} : { body: args.body }),
        })) as unknown as PostDto;
      },
      async withdrawPost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx as MutationContext);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.participation.posts.withdrawPost,
          { scopeId, actor, postId: args.postId },
        )) as unknown as PostDto;
      },
      async setVote(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.participation.votes.setVote, {
          scopeId,
          actor,
          postId: args.postId,
          desired: args.desired,
        })) as unknown as PostDto;
      },
      async addComment(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.participation.comments.addComment,
          {
            scopeId,
            actor,
            postId: args.postId,
            body: args.body,
            isAdmin: await options.authorizeAdmin(ctx),
            ...(args.parentCommentId === undefined
              ? {}
              : { parentCommentId: args.parentCommentId }),
          },
        )) as unknown as CommentDto;
      },
    },
    notifications: {
      async getPostSubscription(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx as MutationContext);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runQuery(
          component.participation.subscriptions.getPostSubscription,
          { scopeId, actor, postId: args.postId },
        )) as unknown as PostSubscriptionDto;
      },
      async setPostSubscription(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.participation.subscriptions.setSubscription,
          { scopeId, actor, postId: args.postId, desired: args.desired },
        )) as unknown as PostSubscriptionDto;
      },
      async listNotifications(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx as MutationContext);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runQuery(
          component.notifications.inbox.listNotifications,
          {
            scopeId,
            actor,
            paginationOpts: args.paginationOpts ?? {
              numItems: 20,
              cursor: null,
            },
          },
        )) as unknown as NotificationPageDto;
      },
      async getUnreadCount(ctx) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx as MutationContext);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runQuery(
          component.notifications.inbox.getUnreadCount,
          { scopeId, actor },
        )) as unknown as UnreadNotificationCountDto;
      },
      async markNotificationRead(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.notifications.inbox.markNotificationRead,
          { scopeId, actor, notificationId: args.notificationId },
        )) as unknown as NotificationDto;
      },
    },
    admin: {
      async configureInstallation(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx))) {
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        }
        return (await ctx.runMutation(
          component.admin.installation.configureInstallation,
          {
            scopeId,
            readPolicy: args.readPolicy,
            boards: [...args.boards],
          },
        )) as unknown as {
          contractVersion: 1;
          readPolicy: "public" | "authenticated";
          boards: BoardDto[];
        };
      },
      async anonymizeActor(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx))) {
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        }
        return (await ctx.runMutation(component.admin.actors.anonymizeActor, {
          scopeId,
          actorId: args.actorId,
        })) as unknown as PostDto["author"];
      },
      async editPost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.posts.editPost, {
          scopeId,
          actor,
          postId: args.postId,
          ...(args.title === undefined ? {} : { title: args.title }),
          ...(args.body === undefined ? {} : { body: args.body }),
        })) as unknown as FeedbackPostDto;
      },
      async movePost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.posts.movePost, {
          scopeId,
          actor,
          postId: args.postId,
          boardId: args.boardId,
        })) as unknown as FeedbackPostDto;
      },
      async setPostStatus(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.posts.setPostStatus, {
          scopeId,
          actor,
          postId: args.postId,
          status: args.status,
        })) as unknown as FeedbackPostDto;
      },
      async setDiscussionLock(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.posts.setDiscussionLock, {
          scopeId,
          actor,
          postId: args.postId,
          locked: args.locked,
        })) as unknown as FeedbackPostDto;
      },
      async setArchived(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.posts.setArchived, {
          scopeId,
          actor,
          postId: args.postId,
          archived: args.archived,
        })) as unknown as FeedbackPostDto;
      },
      async listPostActivity(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        return (await ctx.runQuery(component.admin.activity.listPostActivity, {
          scopeId,
          postId: args.postId,
          paginationOpts: args.paginationOpts ?? { numItems: 20, cursor: null },
        })) as unknown as PostActivityPageDto;
      },
      async listTags(ctx) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        return (await ctx.runQuery(component.admin.tags.listTags, {
          scopeId,
        })) as unknown as TagListDto;
      },
      async createTag(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        return (await ctx.runMutation(component.admin.tags.createTag, {
          scopeId,
          name: args.name,
        })) as unknown as TagDto;
      },
      async renameTag(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        return (await ctx.runMutation(component.admin.tags.renameTag, {
          scopeId,
          tagId: args.tagId,
          name: args.name,
        })) as unknown as TagDto;
      },
      async setPostTag(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.tags.setPostTag, {
          scopeId,
          actor,
          postId: args.postId,
          tagId: args.tagId,
          desired: args.desired,
        })) as unknown as FeedbackPostDto;
      },
      async deleteTag(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.tags.deleteTag, {
          scopeId,
          actor,
          tagId: args.tagId,
        })) as unknown as TagDeleteResultDto;
      },
      async mergePost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.merge.mergePost, {
          scopeId,
          actor,
          sourcePostId: args.sourcePostId,
          canonicalPostId: args.canonicalPostId,
        })) as unknown as MergePostResult;
      },
      async createChangelogDraft(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.admin.changelog.createChangelogDraft,
          {
            scopeId,
            actor,
            title: args.title,
            body: args.body,
            ...(args.slug === undefined ? {} : { slug: args.slug }),
          },
        )) as unknown as AdminChangelogEntryDto;
      },
      async editChangelog(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.admin.changelog.editChangelog, {
          scopeId,
          actor,
          entryId: args.entryId,
          ...(args.title === undefined ? {} : { title: args.title }),
          ...(args.body === undefined ? {} : { body: args.body }),
          ...(args.slug === undefined ? {} : { slug: args.slug }),
        })) as unknown as AdminChangelogEntryDto;
      },
      async setChangelogLinks(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.admin.changelog.setChangelogLinks,
          {
            scopeId,
            actor,
            entryId: args.entryId,
            postIds: args.postIds,
          },
        )) as unknown as AdminChangelogEntryDto;
      },
      async publishChangelog(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.admin.changelog.publishChangelog,
          { scopeId, actor, entryId: args.entryId },
        )) as unknown as AdminChangelogEntryDto;
      },
      async unpublishChangelog(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        if (!(await options.authorizeAdmin(ctx)))
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(
          component.admin.changelog.unpublishChangelog,
          { scopeId, actor, entryId: args.entryId },
        )) as unknown as AdminChangelogEntryDto;
      },
    },
  };
}
