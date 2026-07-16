import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";

import type { ComponentApi } from "../component/_generated/component.js";
import type {
  AdminCapabilities,
  BoardDto,
  ParticipationCapabilities,
  PostDto,
  ReadCapabilities,
  VerifiedActor,
} from "./contracts.js";

export type ReadContext = Pick<
  GenericQueryCtx<GenericDataModel>,
  "auth" | "runQuery"
>;
export type MutationContext = Pick<
  GenericMutationCtx<GenericDataModel>,
  "auth" | "runMutation"
>;
export type HostContext = ReadContext | MutationContext;

export type ClientResolvers = Readonly<{
  resolveScope: (ctx: HostContext) => Promise<string>;
  resolveActor: (ctx: MutationContext) => Promise<VerifiedActor | null>;
  authorizeAdmin: (ctx: MutationContext) => Promise<boolean>;
  isAuthenticated?: (ctx: ReadContext) => Promise<boolean>;
}>;

export type AfferentClient = Readonly<{
  read: ReadCapabilities<ReadContext>;
  participation: ParticipationCapabilities<MutationContext>;
  admin: AdminCapabilities<MutationContext>;
}>;

async function resolveRequiredScope(
  resolver: ClientResolvers["resolveScope"],
  ctx: HostContext,
) {
  const scopeId = await resolver(ctx);
  if (!scopeId?.trim()) throw new Error("SCOPE_RESOLUTION_REQUIRED");
  return scopeId;
}

async function viewerAuthenticated(
  options: ClientResolvers,
  ctx: ReadContext,
) {
  return options.isAuthenticated ? await options.isAuthenticated(ctx) : false;
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
        })) as unknown as { contractVersion: 1; posts: PostDto[] };
      },
      async getPost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.posts.getPost, {
          scopeId,
          postId: args.postId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
        })) as unknown as PostDto;
      },
      async countPosts(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        return (await ctx.runQuery(component.public.posts.countPosts, {
          scopeId,
          boardId: args.boardId,
          viewerAuthenticated: await viewerAuthenticated(options, ctx),
        })) as unknown as { contractVersion: 1; count: number };
      },
    },
    participation: {
      async createPost(ctx, args) {
        const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
        const actor = await options.resolveActor(ctx);
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
    },
  };
}
