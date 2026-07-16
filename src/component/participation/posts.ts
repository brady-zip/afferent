import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { invalidInput } from "../model/errors.js";
import { upsertActor } from "../model/actors.js";
import { requireBoardInScope, requireScope } from "../model/scope.js";
import { toPostDto } from "../model/views.js";
import { postDtoValidator, verifiedActorValidator } from "../validators.js";

const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 10_000;

export const createPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    boardId: v.id("boards"),
    title: v.string(),
    body: v.string(),
  },
  returns: postDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const title = args.title.trim();
    const body = args.body.trim();
    if (!title || title.length > MAX_TITLE_LENGTH) {
      invalidInput(`title must contain 1 to ${MAX_TITLE_LENGTH} characters`);
    }
    if (!body || body.length > MAX_BODY_LENGTH) {
      invalidInput(`body must contain 1 to ${MAX_BODY_LENGTH} characters`);
    }
    await requireBoardInScope(ctx, args.scopeId, args.boardId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const postId = await ctx.db.insert("posts", {
      scopeId: args.scopeId,
      boardId: args.boardId,
      actorId,
      title,
      body,
      lifecycleState: "active",
      statusKey: "open",
      voteCount: 0,
      commentCount: 0,
    });
    const post = await ctx.db.get(postId);
    if (!post) throw new ConvexError({ code: "INVARIANT_VIOLATION" });
    return await toPostDto(ctx, post);
  },
});
