/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_actors from "../admin/actors.js";
import type * as admin_installation from "../admin/installation.js";
import type * as feedback from "../feedback.js";
import type * as model_actors from "../model/actors.js";
import type * as model_comments from "../model/comments.js";
import type * as model_errors from "../model/errors.js";
import type * as model_scope from "../model/scope.js";
import type * as model_views from "../model/views.js";
import type * as model_votes from "../model/votes.js";
import type * as participation_comments from "../participation/comments.js";
import type * as participation_posts from "../participation/posts.js";
import type * as participation_votes from "../participation/votes.js";
import type * as public_boards from "../public/boards.js";
import type * as public_comments from "../public/comments.js";
import type * as public_posts from "../public/posts.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  "admin/actors": typeof admin_actors;
  "admin/installation": typeof admin_installation;
  feedback: typeof feedback;
  "model/actors": typeof model_actors;
  "model/comments": typeof model_comments;
  "model/errors": typeof model_errors;
  "model/scope": typeof model_scope;
  "model/views": typeof model_views;
  "model/votes": typeof model_votes;
  "participation/comments": typeof participation_comments;
  "participation/posts": typeof participation_posts;
  "participation/votes": typeof participation_votes;
  "public/boards": typeof public_boards;
  "public/comments": typeof public_comments;
  "public/posts": typeof public_posts;
  validators: typeof validators;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
