/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_activity from "../admin/activity.js";
import type * as admin_actors from "../admin/actors.js";
import type * as admin_changelog from "../admin/changelog.js";
import type * as admin_installation from "../admin/installation.js";
import type * as admin_merge from "../admin/merge.js";
import type * as admin_posts from "../admin/posts.js";
import type * as admin_tags from "../admin/tags.js";
import type * as feedback from "../feedback.js";
import type * as jobs_fanout from "../jobs/fanout.js";
import type * as jobs_merge from "../jobs/merge.js";
import type * as jobs_outbox from "../jobs/outbox.js";
import type * as jobs_tag_cleanup from "../jobs/tag_cleanup.js";
import type * as model_activity from "../model/activity.js";
import type * as model_actors from "../model/actors.js";
import type * as model_changelog from "../model/changelog.js";
import type * as model_comments from "../model/comments.js";
import type * as model_content from "../model/content.js";
import type * as model_errors from "../model/errors.js";
import type * as model_mentions from "../model/mentions.js";
import type * as model_merge from "../model/merge.js";
import type * as model_notifications from "../model/notifications.js";
import type * as model_rateLimits from "../model/rateLimits.js";
import type * as model_scope from "../model/scope.js";
import type * as model_scoring from "../model/scoring.js";
import type * as model_similarity from "../model/similarity.js";
import type * as model_tags from "../model/tags.js";
import type * as model_views from "../model/views.js";
import type * as model_visibility from "../model/visibility.js";
import type * as model_votes from "../model/votes.js";
import type * as notifications_events from "../notifications/events.js";
import type * as notifications_fanout from "../notifications/fanout.js";
import type * as notifications_inbox from "../notifications/inbox.js";
import type * as notifications_outbox from "../notifications/outbox.js";
import type * as participation_comments from "../participation/comments.js";
import type * as participation_posts from "../participation/posts.js";
import type * as participation_subscriptions from "../participation/subscriptions.js";
import type * as participation_votes from "../participation/votes.js";
import type * as public_boards from "../public/boards.js";
import type * as public_changelog from "../public/changelog.js";
import type * as public_comments from "../public/comments.js";
import type * as public_feeds from "../public/feeds.js";
import type * as public_posts from "../public/posts.js";
import type * as public_roadmap from "../public/roadmap.js";
import type * as public_search from "../public/search.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  "admin/activity": typeof admin_activity;
  "admin/actors": typeof admin_actors;
  "admin/changelog": typeof admin_changelog;
  "admin/installation": typeof admin_installation;
  "admin/merge": typeof admin_merge;
  "admin/posts": typeof admin_posts;
  "admin/tags": typeof admin_tags;
  feedback: typeof feedback;
  "jobs/fanout": typeof jobs_fanout;
  "jobs/merge": typeof jobs_merge;
  "jobs/outbox": typeof jobs_outbox;
  "jobs/tag_cleanup": typeof jobs_tag_cleanup;
  "model/activity": typeof model_activity;
  "model/actors": typeof model_actors;
  "model/changelog": typeof model_changelog;
  "model/comments": typeof model_comments;
  "model/content": typeof model_content;
  "model/errors": typeof model_errors;
  "model/mentions": typeof model_mentions;
  "model/merge": typeof model_merge;
  "model/notifications": typeof model_notifications;
  "model/rateLimits": typeof model_rateLimits;
  "model/scope": typeof model_scope;
  "model/scoring": typeof model_scoring;
  "model/similarity": typeof model_similarity;
  "model/tags": typeof model_tags;
  "model/views": typeof model_views;
  "model/visibility": typeof model_visibility;
  "model/votes": typeof model_votes;
  "notifications/events": typeof notifications_events;
  "notifications/fanout": typeof notifications_fanout;
  "notifications/inbox": typeof notifications_inbox;
  "notifications/outbox": typeof notifications_outbox;
  "participation/comments": typeof participation_comments;
  "participation/posts": typeof participation_posts;
  "participation/subscriptions": typeof participation_subscriptions;
  "participation/votes": typeof participation_votes;
  "public/boards": typeof public_boards;
  "public/changelog": typeof public_changelog;
  "public/comments": typeof public_comments;
  "public/feeds": typeof public_feeds;
  "public/posts": typeof public_posts;
  "public/roadmap": typeof public_roadmap;
  "public/search": typeof public_search;
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

export const components = componentsGeneric() as unknown as {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
