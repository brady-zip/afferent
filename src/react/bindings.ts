import type { FunctionReference } from "convex/server";

import type {
  BoardId,
  FeedbackOrder,
  FeedbackPageDto,
  PaginationOptions,
  PostStatusKey,
  TagId,
} from "../client/contracts.js";

export type FeedbackFeedQueryReference = FunctionReference<
  "query",
  "public",
  {
    order: FeedbackOrder;
    boardId?: BoardId;
    status?: PostStatusKey;
    tagId?: TagId;
    paginationOpts: PaginationOptions;
  },
  FeedbackPageDto
>;

export interface PublicBindings {
  listFeedback: FeedbackFeedQueryReference;
}

export interface AfferentBindings {
  public: PublicBindings;
  participation?: Readonly<Record<string, unknown>>;
  notifications?: Readonly<Record<string, unknown>>;
  roadmap?: Readonly<Record<string, unknown>>;
  changelog?: Readonly<Record<string, unknown>>;
  admin?: Readonly<Record<string, unknown>>;
}
