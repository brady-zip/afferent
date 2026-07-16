import { v } from "convex/values";

import { query } from "../_generated/server.js";
import { boardListDtoValidator } from "../validators.js";
import { authenticationRequired } from "../model/errors.js";
import { requireInstallation, requireScope } from "../model/scope.js";
import { toBoardDto } from "../model/views.js";

const MAX_BOARDS = 20;

export const listBoards = query({
  args: { scopeId: v.string(), viewerAuthenticated: v.boolean() },
  returns: boardListDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const installation = await requireInstallation(ctx, args.scopeId);
    if (
      installation.readPolicy === "authenticated" &&
      !args.viewerAuthenticated
    ) {
      authenticationRequired();
    }
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_scope_order", (q) => q.eq("scopeId", args.scopeId))
      .order("asc")
      .take(MAX_BOARDS);
    return {
      contractVersion: 1 as const,
      boards: boards.map(toBoardDto),
    };
  },
});
