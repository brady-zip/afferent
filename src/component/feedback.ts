import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel.js";
import { mutation, query } from "./_generated/server.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import {
  boardInputValidator,
  installationDtoValidator,
  postDtoValidator,
  postListDtoValidator,
  readPolicyValidator,
  verifiedActorValidator,
} from "./validators.js";

const MAX_BOARDS = 20;
const MAX_POSTS = 50;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 10_000;

function invalidInput(message: string): never {
  throw new ConvexError({ code: "INVALID_INPUT", message });
}

function boardDto(board: Doc<"boards">) {
  return {
    id: String(board._id),
    slug: board.slug,
    name: board.name,
  };
}

function actorDto(actor: Doc<"actors">) {
  return {
    id: String(actor._id),
    ...(actor.displayName === undefined ? {} : { displayName: actor.displayName }),
    ...(actor.avatarUrl === undefined ? {} : { avatarUrl: actor.avatarUrl }),
  };
}

async function postDto(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"posts">,
) {
  const [board, actor] = await Promise.all([
    ctx.db.get(post.boardId),
    ctx.db.get(post.actorId),
  ]);
  if (!board || board.scopeId !== post.scopeId || !actor || actor.scopeId !== post.scopeId) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  return {
    contractVersion: 1 as const,
    id: String(post._id),
    boardId: String(post.boardId),
    board: boardDto(board),
    title: post.title,
    body: post.body,
    author: actorDto(actor),
    status: { key: "open" as const, label: "Open" as const },
    voteCount: post.voteCount,
    commentCount: post.commentCount,
    totals: { votes: post.voteCount, comments: post.commentCount },
    tags: [] as string[],
  };
}

async function requireInstallation(ctx: QueryCtx, scopeId: string) {
  const installation = await ctx.db
    .query("installations")
    .withIndex("by_scope", (q) => q.eq("scopeId", scopeId))
    .unique();
  if (!installation) {
    throw new ConvexError({ code: "INSTALLATION_NOT_CONFIGURED" });
  }
  return installation;
}

async function requireBoard(
  ctx: MutationCtx,
  scopeId: string,
  boardId: Id<"boards">,
) {
  const board = await ctx.db.get(boardId);
  if (!board || board.scopeId !== scopeId) {
    throw new ConvexError({ code: "NOT_FOUND", resource: "board" });
  }
  return board;
}

export const configureInstallation = mutation({
  args: {
    scopeId: v.string(),
    readPolicy: readPolicyValidator,
    boards: v.array(boardInputValidator),
  },
  returns: installationDtoValidator,
  handler: async (ctx, args) => {
    if (!args.scopeId) invalidInput("scopeId is required");
    if (args.boards.length < 1 || args.boards.length > MAX_BOARDS) {
      invalidInput(`boards must contain between 1 and ${MAX_BOARDS} entries`);
    }

    const existingInstallation = await ctx.db
      .query("installations")
      .withIndex("by_scope", (q) => q.eq("scopeId", args.scopeId))
      .unique();
    if (existingInstallation) {
      await ctx.db.patch(existingInstallation._id, { readPolicy: args.readPolicy });
    } else {
      await ctx.db.insert("installations", {
        scopeId: args.scopeId,
        readPolicy: args.readPolicy,
      });
    }

    const configuredBoards: Doc<"boards">[] = [];
    for (const [sortOrder, input] of args.boards.entries()) {
      if (!input.slug.trim() || !input.name.trim()) {
        invalidInput("board slug and name are required");
      }
      const existingBoard = await ctx.db
        .query("boards")
        .withIndex("by_scope_slug", (q) =>
          q.eq("scopeId", args.scopeId).eq("slug", input.slug),
        )
        .unique();
      if (existingBoard) {
        await ctx.db.patch(existingBoard._id, {
          name: input.name,
          sortOrder,
        });
        configuredBoards.push({
          ...existingBoard,
          name: input.name,
          sortOrder,
        });
      } else {
        const id = await ctx.db.insert("boards", {
          scopeId: args.scopeId,
          slug: input.slug,
          name: input.name,
          sortOrder,
        });
        const board = await ctx.db.get(id);
        if (!board) throw new ConvexError({ code: "INVARIANT_VIOLATION" });
        configuredBoards.push(board);
      }
    }

    return {
      contractVersion: 1 as const,
      readPolicy: args.readPolicy,
      boards: configuredBoards.map(boardDto),
    };
  },
});

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
    if (!args.scopeId || !args.actor.externalKey) invalidInput("trusted scope and actor are required");
    const title = args.title.trim();
    const body = args.body.trim();
    if (!title || title.length > MAX_TITLE_LENGTH) {
      invalidInput(`title must contain 1 to ${MAX_TITLE_LENGTH} characters`);
    }
    if (!body || body.length > MAX_BODY_LENGTH) {
      invalidInput(`body must contain 1 to ${MAX_BODY_LENGTH} characters`);
    }
    await requireBoard(ctx, args.scopeId, args.boardId);

    const existingActor = await ctx.db
      .query("actors")
      .withIndex("by_scope_external_key", (q) =>
        q.eq("scopeId", args.scopeId).eq("externalKey", args.actor.externalKey),
      )
      .unique();
    let actorId: Id<"actors">;
    if (existingActor) {
      await ctx.db.patch(existingActor._id, {
        displayName: args.actor.displayName,
        avatarUrl: args.actor.avatarUrl,
      });
      actorId = existingActor._id;
    } else {
      actorId = await ctx.db.insert("actors", {
        scopeId: args.scopeId,
        externalKey: args.actor.externalKey,
        displayName: args.actor.displayName,
        avatarUrl: args.actor.avatarUrl,
      });
    }

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
    return await postDto(ctx, post);
  },
});

export const listPosts = query({
  args: {
    scopeId: v.string(),
    boardId: v.id("boards"),
    viewerAuthenticated: v.boolean(),
  },
  returns: postListDtoValidator,
  handler: async (ctx, args) => {
    if (!args.scopeId) invalidInput("scopeId is required");
    const installation = await requireInstallation(ctx, args.scopeId);
    if (installation.readPolicy === "authenticated" && !args.viewerAuthenticated) {
      throw new ConvexError({ code: "AUTHENTICATION_REQUIRED" });
    }
    const board = await ctx.db.get(args.boardId);
    if (!board || board.scopeId !== args.scopeId) {
      throw new ConvexError({ code: "NOT_FOUND", resource: "board" });
    }
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_scope_board_state", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("boardId", args.boardId)
          .eq("lifecycleState", "active"),
      )
      .order("desc")
      .take(MAX_POSTS);
    return {
      contractVersion: 1 as const,
      posts: await Promise.all(posts.map((post) => postDto(ctx, post))),
    };
  },
});
