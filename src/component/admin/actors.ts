import { v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { anonymizeActor as anonymizeActorModel } from "../model/actors.js";
import { requireScope } from "../model/scope.js";
import { toActorDto } from "../model/views.js";
import { actorDtoValidator } from "../validators.js";

export const anonymizeActor = mutation({
  args: {
    scopeId: v.string(),
    actorId: v.string(),
  },
  returns: actorDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actor = await anonymizeActorModel(ctx, args.scopeId, args.actorId);
    return toActorDto(actor);
  },
});
