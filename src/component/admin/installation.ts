import { ConvexError, v } from "convex/values";

import type { Doc } from "../_generated/dataModel.js";
import { mutation } from "../_generated/server.js";
import { invalidInput } from "../model/errors.js";
import { requireScope } from "../model/scope.js";
import { toBoardDto } from "../model/views.js";
import {
  boardInputValidator,
  installationDtoValidator,
  readPolicyValidator,
} from "../validators.js";

const MAX_BOARDS = 20;

export const configureInstallation = mutation({
  args: {
    scopeId: v.string(),
    readPolicy: readPolicyValidator,
    boards: v.array(boardInputValidator),
  },
  returns: installationDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    if (args.boards.length < 1 || args.boards.length > MAX_BOARDS) {
      invalidInput(`boards must contain between 1 and ${MAX_BOARDS} entries`);
    }
    const slugs = new Set<string>();
    for (const board of args.boards) {
      const slug = board.slug.trim();
      if (!slug || !board.name.trim() || slugs.has(slug)) {
        invalidInput("board slugs and names must be nonempty and unique");
      }
      slugs.add(slug);
    }

    const existingBoards = await ctx.db
      .query("boards")
      .withIndex("by_scope_order", (q) => q.eq("scopeId", args.scopeId))
      .order("asc")
      .take(MAX_BOARDS + 1);
    if (existingBoards.length > MAX_BOARDS) {
      invalidInput(`installation cannot contain more than ${MAX_BOARDS} boards`);
    }
    const existingBySlug = new Map(
      existingBoards.map((board) => [board.slug, board]),
    );
    const newBoardCount = args.boards.reduce(
      (count, board) =>
        count + (existingBySlug.has(board.slug.trim()) ? 0 : 1),
      0,
    );
    if (existingBoards.length + newBoardCount > MAX_BOARDS) {
      invalidInput(`installation cannot contain more than ${MAX_BOARDS} boards`);
    }

    const installation = await ctx.db
      .query("installations")
      .withIndex("by_scope", (q) => q.eq("scopeId", args.scopeId))
      .unique();
    if (installation) {
      await ctx.db.patch(installation._id, { readPolicy: args.readPolicy });
    } else {
      await ctx.db.insert("installations", {
        scopeId: args.scopeId,
        readPolicy: args.readPolicy,
      });
    }

    const configured: Doc<"boards">[] = [...existingBoards];
    let nextSortOrder =
      existingBoards.reduce(
        (maximum, board) => Math.max(maximum, board.sortOrder),
        -1,
      ) + 1;
    for (const input of args.boards) {
      const slug = input.slug.trim();
      const name = input.name.trim();
      const existing = existingBySlug.get(slug);
      if (existing) {
        await ctx.db.patch(existing._id, { name });
        const index = configured.findIndex((board) => board._id === existing._id);
        configured[index] = { ...existing, name };
      } else {
        const id = await ctx.db.insert("boards", {
          scopeId: args.scopeId,
          slug,
          name,
          sortOrder: nextSortOrder++,
        });
        const board = await ctx.db.get(id);
        if (!board) throw new ConvexError({ code: "INVARIANT_VIOLATION" });
        configured.push(board);
        existingBySlug.set(slug, board);
      }
    }
    return {
      contractVersion: 1 as const,
      readPolicy: args.readPolicy,
      boards: configured.map(toBoardDto),
    };
  },
});
