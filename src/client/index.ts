import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";

import type { ComponentApi } from "../component/_generated/component.js";
import type {
  AdminCapabilities,
  BoardId,
  ParticipationCapabilities,
  PostDto,
  ReadCapabilities,
  VerifiedActor,
} from "./contracts.js";

export type {
  ActorId,
  AdminCapabilities,
  BoardDto,
  BoardId,
  ParticipationCapabilities,
  PostDto,
  PostId,
  ReadCapabilities,
  VerifiedActor,
} from "./contracts.js";
export {
  configureInstallationIntentValidator,
  createPostIntentValidator,
  listPostsIntentValidator,
} from "./contracts.js";

type ReadContext = Pick<GenericQueryCtx<GenericDataModel>, "auth" | "runQuery">;
type MutationContext = Pick<
  GenericMutationCtx<GenericDataModel>,
  "auth" | "runMutation"
>;

const fixedScope = "afferent:single-product:v1";

export type AfferentClientOptions = Readonly<{
  resolveActor: (ctx: MutationContext) => Promise<VerifiedActor | null>;
  authorizeAdmin: (ctx: MutationContext) => Promise<boolean>;
  isAuthenticated?: (ctx: ReadContext) => Promise<boolean>;
}>;

export type AfferentClient = Readonly<{
  read: ReadCapabilities<ReadContext>;
  participation: ParticipationCapabilities<MutationContext>;
  admin: AdminCapabilities<MutationContext>;
}>;

export function createAfferentClient(
  component: ComponentApi,
  options: AfferentClientOptions,
): AfferentClient {
  return {
    read: {
      async listPosts(ctx, args) {
        const viewerAuthenticated = options.isAuthenticated
          ? await options.isAuthenticated(ctx)
          : false;
        return (await ctx.runQuery(component.feedback.listPosts, {
          scopeId: fixedScope,
          boardId: args.boardId,
          viewerAuthenticated,
        })) as unknown as { contractVersion: 1; posts: PostDto[] };
      },
    },
    participation: {
      async createPost(ctx, args) {
        const actor = await options.resolveActor(ctx);
        if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
        return (await ctx.runMutation(component.feedback.createPost, {
          scopeId: fixedScope,
          actor,
          boardId: args.boardId,
          title: args.title,
          body: args.body,
        })) as unknown as PostDto;
      },
    },
    admin: {
      async configureInstallation(ctx, args) {
        if (!(await options.authorizeAdmin(ctx))) {
          throw new Error("ADMIN_AUTHORIZATION_REQUIRED");
        }
        return (await ctx.runMutation(component.feedback.configureInstallation, {
          scopeId: fixedScope,
          readPolicy: args.readPolicy,
          boards: [...args.boards],
        })) as unknown as {
          contractVersion: 1;
          readPolicy: "public" | "authenticated";
          boards: Array<{ id: BoardId; slug: string; name: string }>;
        };
      },
    },
  };
}
