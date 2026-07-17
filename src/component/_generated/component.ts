/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    admin: {
      activity: {
        listPostActivity: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            postId: string;
            scopeId: string;
          },
          {
            continueCursor: string;
            contractVersion: 1;
            isDone: boolean;
            page: Array<{
              actor?: { avatarUrl?: string; displayName?: string; id: string };
              changedFields?: Array<string>;
              changelogEntryId?: string;
              contractVersion: 1;
              fromBoardId?: string;
              fromStatus?:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              id: string;
              occurredAt: number;
              postId: string;
              tagId?: string;
              toBoardId?: string;
              toStatus?:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              type:
                | "create"
                | "edit"
                | "status_change"
                | "board_move"
                | "tag_add"
                | "tag_remove"
                | "lock"
                | "unlock"
                | "archive"
                | "restore"
                | "merge"
                | "changelog_publish"
                | "changelog_unpublish";
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      actors: {
        anonymizeActor: FunctionReference<
          "mutation",
          "internal",
          { actorId: string; scopeId: string },
          { avatarUrl?: string; displayName?: string; id: string },
          Name
        >;
      };
      changelog: {
        createChangelogDraft: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            body: string;
            scopeId: string;
            slug?: string;
            title: string;
          },
          {
            body: string;
            contractVersion: 1;
            createdAt: number;
            firstPublishedAt?: number;
            id: string;
            postIds: Array<string>;
            publishedAt?: number;
            slug: string;
            state: "draft" | "published" | "unpublished";
            title: string;
            updatedAt: number;
          },
          Name
        >;
        editChangelog: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            body?: string;
            entryId: string;
            scopeId: string;
            slug?: string;
            title?: string;
          },
          {
            body: string;
            contractVersion: 1;
            createdAt: number;
            firstPublishedAt?: number;
            id: string;
            postIds: Array<string>;
            publishedAt?: number;
            slug: string;
            state: "draft" | "published" | "unpublished";
            title: string;
            updatedAt: number;
          },
          Name
        >;
        publishChangelog: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            entryId: string;
            scopeId: string;
          },
          {
            body: string;
            contractVersion: 1;
            createdAt: number;
            firstPublishedAt?: number;
            id: string;
            postIds: Array<string>;
            publishedAt?: number;
            slug: string;
            state: "draft" | "published" | "unpublished";
            title: string;
            updatedAt: number;
          },
          Name
        >;
        setChangelogLinks: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            entryId: string;
            postIds: Array<string>;
            scopeId: string;
          },
          {
            body: string;
            contractVersion: 1;
            createdAt: number;
            firstPublishedAt?: number;
            id: string;
            postIds: Array<string>;
            publishedAt?: number;
            slug: string;
            state: "draft" | "published" | "unpublished";
            title: string;
            updatedAt: number;
          },
          Name
        >;
        unpublishChangelog: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            entryId: string;
            scopeId: string;
          },
          {
            body: string;
            contractVersion: 1;
            createdAt: number;
            firstPublishedAt?: number;
            id: string;
            postIds: Array<string>;
            publishedAt?: number;
            slug: string;
            state: "draft" | "published" | "unpublished";
            title: string;
            updatedAt: number;
          },
          Name
        >;
      };
      installation: {
        configureInstallation: FunctionReference<
          "mutation",
          "internal",
          {
            boards: Array<{ name: string; slug: string }>;
            readPolicy: "public" | "authenticated";
            scopeId: string;
          },
          {
            boards: Array<{ id: string; name: string; slug: string }>;
            contractVersion: 1;
            readPolicy: "public" | "authenticated";
          },
          Name
        >;
      };
      merge: {
        mergePost: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            canonicalPostId: string;
            scopeId: string;
            sourcePostId: string;
          },
          {
            canonicalPostId: string;
            contractVersion: 1;
            sourcePostId: string;
            status: "pending" | "complete";
          },
          Name
        >;
      };
      posts: {
        editPost: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            body?: string;
            postId: string;
            scopeId: string;
            title?: string;
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
        movePost: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            boardId: string;
            postId: string;
            scopeId: string;
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
        setArchived: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            archived: boolean;
            postId: string;
            scopeId: string;
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
        setDiscussionLock: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            locked: boolean;
            postId: string;
            scopeId: string;
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
        setPostStatus: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            postId: string;
            scopeId: string;
            status:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
      };
      tags: {
        createTag: FunctionReference<
          "mutation",
          "internal",
          { name: string; scopeId: string },
          { contractVersion: 1; id: string; name: string },
          Name
        >;
        deleteTag: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            scopeId: string;
            tagId: string;
          },
          { contractVersion: 1; status: "pending" | "deleted"; tagId: string },
          Name
        >;
        listTags: FunctionReference<
          "query",
          "internal",
          { scopeId: string },
          {
            contractVersion: 1;
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
          },
          Name
        >;
        renameTag: FunctionReference<
          "mutation",
          "internal",
          { name: string; scopeId: string; tagId: string },
          { contractVersion: 1; id: string; name: string },
          Name
        >;
        setPostTag: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            desired: boolean;
            postId: string;
            scopeId: string;
            tagId: string;
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
      };
    };
    feedback: {
      addComment: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          body: string;
          isAdmin: boolean;
          parentCommentId?: string;
          postId: string;
          scopeId: string;
        },
        | {
            author: { avatarUrl?: string; displayName?: string; id: string };
            body: string;
            contractVersion: 1;
            id: string;
            parentCommentId?: string;
            postId: string;
          }
        | {
            error:
              | {
                  code:
                    | "VALIDATION"
                    | "NOT_FOUND"
                    | "DISCUSSION_LOCKED"
                    | "NOT_AUTHORIZED";
                  contractVersion: 1;
                  message: string;
                }
              | {
                  code: "RATE_LIMITED";
                  contractVersion: 1;
                  operation:
                    | "create_post"
                    | "edit_post"
                    | "comment"
                    | "vote"
                    | "subscribe";
                  retryAfterMs: number;
                };
            ok: false;
          },
        Name
      >;
      adminEditPost: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          body?: string;
          postId: string;
          scopeId: string;
          title?: string;
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 2;
          id: string;
          status: {
            key:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            label:
              | "Open"
              | "Under Review"
              | "Planned"
              | "In Progress"
              | "Complete"
              | "Closed";
          };
          tags: Array<{ contractVersion: 1; id: string; name: string }>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
      anonymizeActor: FunctionReference<
        "mutation",
        "internal",
        { actorId: string; scopeId: string },
        { avatarUrl?: string; displayName?: string; id: string },
        Name
      >;
      configureInstallation: FunctionReference<
        "mutation",
        "internal",
        {
          boards: Array<{ name: string; slug: string }>;
          readPolicy: "public" | "authenticated";
          scopeId: string;
        },
        {
          boards: Array<{ id: string; name: string; slug: string }>;
          contractVersion: 1;
          readPolicy: "public" | "authenticated";
        },
        Name
      >;
      countPosts: FunctionReference<
        "query",
        "internal",
        { boardId: string; scopeId: string; viewerAuthenticated: boolean },
        { contractVersion: 1; count: number; hasMore: boolean },
        Name
      >;
      createChangelogDraft: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          body: string;
          scopeId: string;
          slug?: string;
          title: string;
        },
        {
          body: string;
          contractVersion: 1;
          createdAt: number;
          firstPublishedAt?: number;
          id: string;
          postIds: Array<string>;
          publishedAt?: number;
          slug: string;
          state: "draft" | "published" | "unpublished";
          title: string;
          updatedAt: number;
        },
        Name
      >;
      createPost: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          boardId: string;
          body: string;
          scopeId: string;
          title: string;
        },
        | {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 1;
            id: string;
            status: { key: "open"; label: "Open" };
            tags: Array<string>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }
        | {
            error:
              | {
                  code:
                    | "VALIDATION"
                    | "NOT_FOUND"
                    | "DISCUSSION_LOCKED"
                    | "NOT_AUTHORIZED";
                  contractVersion: 1;
                  message: string;
                }
              | {
                  code: "RATE_LIMITED";
                  contractVersion: 1;
                  operation:
                    | "create_post"
                    | "edit_post"
                    | "comment"
                    | "vote"
                    | "subscribe";
                  retryAfterMs: number;
                };
            ok: false;
          },
        Name
      >;
      createTag: FunctionReference<
        "mutation",
        "internal",
        { name: string; scopeId: string },
        { contractVersion: 1; id: string; name: string },
        Name
      >;
      deleteTag: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          scopeId: string;
          tagId: string;
        },
        { contractVersion: 1; status: "pending" | "deleted"; tagId: string },
        Name
      >;
      editChangelog: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          body?: string;
          entryId: string;
          scopeId: string;
          slug?: string;
          title?: string;
        },
        {
          body: string;
          contractVersion: 1;
          createdAt: number;
          firstPublishedAt?: number;
          id: string;
          postIds: Array<string>;
          publishedAt?: number;
          slug: string;
          state: "draft" | "published" | "unpublished";
          title: string;
          updatedAt: number;
        },
        Name
      >;
      editPost: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          body?: string;
          postId: string;
          scopeId: string;
          title?: string;
        },
        | {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 1;
            id: string;
            status: { key: "open"; label: "Open" };
            tags: Array<string>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }
        | {
            error:
              | {
                  code:
                    | "VALIDATION"
                    | "NOT_FOUND"
                    | "DISCUSSION_LOCKED"
                    | "NOT_AUTHORIZED";
                  contractVersion: 1;
                  message: string;
                }
              | {
                  code: "RATE_LIMITED";
                  contractVersion: 1;
                  operation:
                    | "create_post"
                    | "edit_post"
                    | "comment"
                    | "vote"
                    | "subscribe";
                  retryAfterMs: number;
                };
            ok: false;
          },
        Name
      >;
      getPost: FunctionReference<
        "query",
        "internal",
        { postId: string; scopeId: string; viewerAuthenticated: boolean },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 1;
          id: string;
          status: { key: "open"; label: "Open" };
          tags: Array<string>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
      getPostSubscription: FunctionReference<
        "query",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          postId: string;
          scopeId: string;
        },
        {
          contractVersion: 1;
          explicitOptOut: boolean;
          postId: string;
          subscribed: boolean;
        },
        Name
      >;
      getPublishedChangelogBySlug: FunctionReference<
        "query",
        "internal",
        { scopeId: string; slug: string; viewerAuthenticated: boolean },
        | { contractVersion: 1; status: "notFound" }
        | {
            contractVersion: 1;
            entry: {
              body: string;
              contractVersion: 1;
              firstPublishedAt: number;
              id: string;
              links: Array<{
                contractVersion: 1;
                id: string;
                status: {
                  key:
                    | "open"
                    | "under_review"
                    | "planned"
                    | "in_progress"
                    | "complete"
                    | "closed";
                  label:
                    | "Open"
                    | "Under Review"
                    | "Planned"
                    | "In Progress"
                    | "Complete"
                    | "Closed";
                };
                title: string;
              }>;
              slug: string;
              title: string;
              updatedAt: number;
            };
            status: "entry";
          },
        Name
      >;
      getUnreadCount: FunctionReference<
        "query",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          scopeId: string;
        },
        { contractVersion: 1; count: number },
        Name
      >;
      listBoards: FunctionReference<
        "query",
        "internal",
        { scopeId: string; viewerAuthenticated: boolean },
        {
          boards: Array<{ id: string; name: string; slug: string }>;
          contractVersion: 1;
        },
        Name
      >;
      listComments: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          postId: string;
          scopeId: string;
          viewerAuthenticated: boolean;
        },
        {
          comments: Array<{
            author: { avatarUrl?: string; displayName?: string; id: string };
            body: string;
            contractVersion: 1;
            id: string;
            parentCommentId?: string;
            postId: string;
          }>;
          continueCursor: string;
          contractVersion: 1;
          isDone: boolean;
          page: Array<{
            author: { avatarUrl?: string; displayName?: string; id: string };
            body: string;
            contractVersion: 1;
            id: string;
            parentCommentId?: string;
            postId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      listFeedback: FunctionReference<
        "query",
        "internal",
        {
          boardId?: string;
          order: "newest" | "top" | "trending";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          scopeId: string;
          status?:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "complete"
            | "closed";
          tagId?: string;
          viewerAuthenticated: boolean;
        },
        {
          continueCursor: string;
          contractVersion: 2;
          isDone: boolean;
          page: Array<{
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          posts: Array<{
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 2;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            tags: Array<{ contractVersion: 1; id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }>;
          splitCursor?: string | null;
        },
        Name
      >;
      listNotifications: FunctionReference<
        "query",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          scopeId: string;
        },
        {
          continueCursor: string;
          contractVersion: 1;
          isDone: boolean;
          notifications: Array<{
            contractVersion: 1;
            entityId: string;
            eventId: string;
            id: string;
            initiator: { avatarUrl?: string; displayName?: string; id: string };
            occurredAt: number;
            read: boolean;
            type:
              | "status_changed"
              | "admin_replied"
              | "comment_replied"
              | "mentioned"
              | "changelog_published";
          }>;
          page: Array<{
            contractVersion: 1;
            entityId: string;
            eventId: string;
            id: string;
            initiator: { avatarUrl?: string; displayName?: string; id: string };
            occurredAt: number;
            read: boolean;
            type:
              | "status_changed"
              | "admin_replied"
              | "comment_replied"
              | "mentioned"
              | "changelog_published";
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      listPostActivity: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          postId: string;
          scopeId: string;
        },
        {
          continueCursor: string;
          contractVersion: 1;
          isDone: boolean;
          page: Array<{
            actor?: { avatarUrl?: string; displayName?: string; id: string };
            changedFields?: Array<string>;
            changelogEntryId?: string;
            contractVersion: 1;
            fromBoardId?: string;
            fromStatus?:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            id: string;
            occurredAt: number;
            postId: string;
            tagId?: string;
            toBoardId?: string;
            toStatus?:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            type:
              | "create"
              | "edit"
              | "status_change"
              | "board_move"
              | "tag_add"
              | "tag_remove"
              | "lock"
              | "unlock"
              | "archive"
              | "restore"
              | "merge"
              | "changelog_publish"
              | "changelog_unpublish";
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      listPosts: FunctionReference<
        "query",
        "internal",
        {
          boardId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          scopeId: string;
          viewerAuthenticated: boolean;
        },
        {
          continueCursor: string;
          contractVersion: 1;
          isDone: boolean;
          page: Array<{
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 1;
            id: string;
            status: { key: "open"; label: "Open" };
            tags: Array<string>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          posts: Array<{
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 1;
            id: string;
            status: { key: "open"; label: "Open" };
            tags: Array<string>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }>;
          splitCursor?: string | null;
        },
        Name
      >;
      listPublishedChangelog: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          scopeId: string;
          viewerAuthenticated: boolean;
        },
        {
          continueCursor: string;
          contractVersion: 1;
          entries: Array<{
            body: string;
            contractVersion: 1;
            firstPublishedAt: number;
            id: string;
            links: Array<{
              contractVersion: 1;
              id: string;
              status: {
                key:
                  | "open"
                  | "under_review"
                  | "planned"
                  | "in_progress"
                  | "complete"
                  | "closed";
                label:
                  | "Open"
                  | "Under Review"
                  | "Planned"
                  | "In Progress"
                  | "Complete"
                  | "Closed";
              };
              title: string;
            }>;
            slug: string;
            title: string;
            updatedAt: number;
          }>;
          isDone: boolean;
          page: Array<{
            body: string;
            contractVersion: 1;
            firstPublishedAt: number;
            id: string;
            links: Array<{
              contractVersion: 1;
              id: string;
              status: {
                key:
                  | "open"
                  | "under_review"
                  | "planned"
                  | "in_progress"
                  | "complete"
                  | "closed";
                label:
                  | "Open"
                  | "Under Review"
                  | "Planned"
                  | "In Progress"
                  | "Complete"
                  | "Closed";
              };
              title: string;
            }>;
            slug: string;
            title: string;
            updatedAt: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      listRoadmapGroup: FunctionReference<
        "query",
        "internal",
        {
          boardId?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          scopeId: string;
          status: "planned" | "in_progress" | "complete";
          viewerAuthenticated: boolean;
        },
        {
          continueCursor: string;
          contractVersion: 1;
          isDone: boolean;
          items: Array<{
            board: { id: string; name: string; slug: string };
            boardId: string;
            commentCount: number;
            contractVersion: 1;
            createdAt: number;
            currentStatusSince: number;
            id: string;
            status: {
              key: "planned" | "in_progress" | "complete";
              label: "Planned" | "In Progress" | "Complete";
            };
            title: string;
            voteCount: number;
          }>;
          page: Array<{
            board: { id: string; name: string; slug: string };
            boardId: string;
            commentCount: number;
            contractVersion: 1;
            createdAt: number;
            currentStatusSince: number;
            id: string;
            status: {
              key: "planned" | "in_progress" | "complete";
              label: "Planned" | "In Progress" | "Complete";
            };
            title: string;
            voteCount: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      listTags: FunctionReference<
        "query",
        "internal",
        { scopeId: string },
        {
          contractVersion: 1;
          tags: Array<{ contractVersion: 1; id: string; name: string }>;
        },
        Name
      >;
      markNotificationRead: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          notificationId: string;
          scopeId: string;
        },
        {
          contractVersion: 1;
          entityId: string;
          eventId: string;
          id: string;
          initiator: { avatarUrl?: string; displayName?: string; id: string };
          occurredAt: number;
          read: boolean;
          type:
            | "status_changed"
            | "admin_replied"
            | "comment_replied"
            | "mentioned"
            | "changelog_published";
        },
        Name
      >;
      mergePost: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          canonicalPostId: string;
          scopeId: string;
          sourcePostId: string;
        },
        {
          canonicalPostId: string;
          contractVersion: 1;
          sourcePostId: string;
          status: "pending" | "complete";
        },
        Name
      >;
      movePost: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          boardId: string;
          postId: string;
          scopeId: string;
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 2;
          id: string;
          status: {
            key:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            label:
              | "Open"
              | "Under Review"
              | "Planned"
              | "In Progress"
              | "Complete"
              | "Closed";
          };
          tags: Array<{ contractVersion: 1; id: string; name: string }>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
      publishChangelog: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          entryId: string;
          scopeId: string;
        },
        {
          body: string;
          contractVersion: 1;
          createdAt: number;
          firstPublishedAt?: number;
          id: string;
          postIds: Array<string>;
          publishedAt?: number;
          slug: string;
          state: "draft" | "published" | "unpublished";
          title: string;
          updatedAt: number;
        },
        Name
      >;
      renameTag: FunctionReference<
        "mutation",
        "internal",
        { name: string; scopeId: string; tagId: string },
        { contractVersion: 1; id: string; name: string },
        Name
      >;
      resolvePost: FunctionReference<
        "query",
        "internal",
        { postId: string; scopeId: string; viewerAuthenticated: boolean },
        | {
            contractVersion: 1;
            post: {
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 2;
              id: string;
              status: {
                key:
                  | "open"
                  | "under_review"
                  | "planned"
                  | "in_progress"
                  | "complete"
                  | "closed";
                label:
                  | "Open"
                  | "Under Review"
                  | "Planned"
                  | "In Progress"
                  | "Complete"
                  | "Closed";
              };
              tags: Array<{ contractVersion: 1; id: string; name: string }>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            };
            status: "post";
          }
        | {
            canonicalPostId: string;
            contractVersion: 1;
            requestedPostId: string;
            status: "merged";
          }
        | { contractVersion: 1; status: "notFound" },
        Name
      >;
      searchFeedback: FunctionReference<
        "query",
        "internal",
        {
          boardId?: string;
          query: string;
          scopeId: string;
          status?:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "complete"
            | "closed";
          tagId?: string;
          viewerAuthenticated: boolean;
        },
        {
          contractVersion: 1;
          hasMore: boolean;
          items: Array<{
            board: { id: string; name: string; slug: string };
            contractVersion: 1;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            title: string;
          }>;
        },
        Name
      >;
      setArchived: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          archived: boolean;
          postId: string;
          scopeId: string;
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 2;
          id: string;
          status: {
            key:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            label:
              | "Open"
              | "Under Review"
              | "Planned"
              | "In Progress"
              | "Complete"
              | "Closed";
          };
          tags: Array<{ contractVersion: 1; id: string; name: string }>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
      setChangelogLinks: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          entryId: string;
          postIds: Array<string>;
          scopeId: string;
        },
        {
          body: string;
          contractVersion: 1;
          createdAt: number;
          firstPublishedAt?: number;
          id: string;
          postIds: Array<string>;
          publishedAt?: number;
          slug: string;
          state: "draft" | "published" | "unpublished";
          title: string;
          updatedAt: number;
        },
        Name
      >;
      setDiscussionLock: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          locked: boolean;
          postId: string;
          scopeId: string;
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 2;
          id: string;
          status: {
            key:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            label:
              | "Open"
              | "Under Review"
              | "Planned"
              | "In Progress"
              | "Complete"
              | "Closed";
          };
          tags: Array<{ contractVersion: 1; id: string; name: string }>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
      setPostStatus: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          postId: string;
          scopeId: string;
          status:
            | "open"
            | "under_review"
            | "planned"
            | "in_progress"
            | "complete"
            | "closed";
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 2;
          id: string;
          status: {
            key:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            label:
              | "Open"
              | "Under Review"
              | "Planned"
              | "In Progress"
              | "Complete"
              | "Closed";
          };
          tags: Array<{ contractVersion: 1; id: string; name: string }>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
      setPostTag: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          desired: boolean;
          postId: string;
          scopeId: string;
          tagId: string;
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 2;
          id: string;
          status: {
            key:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            label:
              | "Open"
              | "Under Review"
              | "Planned"
              | "In Progress"
              | "Complete"
              | "Closed";
          };
          tags: Array<{ contractVersion: 1; id: string; name: string }>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
      setSubscription: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          desired: boolean;
          postId: string;
          scopeId: string;
        },
        | {
            contractVersion: 1;
            explicitOptOut: boolean;
            postId: string;
            subscribed: boolean;
          }
        | {
            error:
              | {
                  code:
                    | "VALIDATION"
                    | "NOT_FOUND"
                    | "DISCUSSION_LOCKED"
                    | "NOT_AUTHORIZED";
                  contractVersion: 1;
                  message: string;
                }
              | {
                  code: "RATE_LIMITED";
                  contractVersion: 1;
                  operation:
                    | "create_post"
                    | "edit_post"
                    | "comment"
                    | "vote"
                    | "subscribe";
                  retryAfterMs: number;
                };
            ok: false;
          },
        Name
      >;
      setVote: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          desired: boolean;
          postId: string;
          scopeId: string;
        },
        | {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 1;
            id: string;
            status: { key: "open"; label: "Open" };
            tags: Array<string>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }
        | {
            error:
              | {
                  code:
                    | "VALIDATION"
                    | "NOT_FOUND"
                    | "DISCUSSION_LOCKED"
                    | "NOT_AUTHORIZED";
                  contractVersion: 1;
                  message: string;
                }
              | {
                  code: "RATE_LIMITED";
                  contractVersion: 1;
                  operation:
                    | "create_post"
                    | "edit_post"
                    | "comment"
                    | "vote"
                    | "subscribe";
                  retryAfterMs: number;
                };
            ok: false;
          },
        Name
      >;
      suggestSimilarPosts: FunctionReference<
        "query",
        "internal",
        {
          body?: string;
          limit?: number;
          scopeId: string;
          title: string;
          viewerAuthenticated: boolean;
        },
        {
          contractVersion: 1;
          hasMore: boolean;
          items: Array<{
            board: { id: string; name: string; slug: string };
            contractVersion: 1;
            id: string;
            status: {
              key:
                | "open"
                | "under_review"
                | "planned"
                | "in_progress"
                | "complete"
                | "closed";
              label:
                | "Open"
                | "Under Review"
                | "Planned"
                | "In Progress"
                | "Complete"
                | "Closed";
            };
            title: string;
          }>;
        },
        Name
      >;
      unpublishChangelog: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          entryId: string;
          scopeId: string;
        },
        {
          body: string;
          contractVersion: 1;
          createdAt: number;
          firstPublishedAt?: number;
          id: string;
          postIds: Array<string>;
          publishedAt?: number;
          slug: string;
          state: "draft" | "published" | "unpublished";
          title: string;
          updatedAt: number;
        },
        Name
      >;
      withdrawPost: FunctionReference<
        "mutation",
        "internal",
        {
          actor: {
            avatarUrl?: string;
            displayName?: string;
            externalKey: string;
          };
          postId: string;
          scopeId: string;
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          board: { id: string; name: string; slug: string };
          boardId: string;
          body: string;
          commentCount: number;
          contractVersion: 1;
          id: string;
          status: { key: "open"; label: "Open" };
          tags: Array<string>;
          title: string;
          totals: { comments: number; votes: number };
          voteCount: number;
        },
        Name
      >;
    };
    notifications: {
      inbox: {
        getUnreadCount: FunctionReference<
          "query",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            scopeId: string;
          },
          { contractVersion: 1; count: number },
          Name
        >;
        listNotifications: FunctionReference<
          "query",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            scopeId: string;
          },
          {
            continueCursor: string;
            contractVersion: 1;
            isDone: boolean;
            notifications: Array<{
              contractVersion: 1;
              entityId: string;
              eventId: string;
              id: string;
              initiator: {
                avatarUrl?: string;
                displayName?: string;
                id: string;
              };
              occurredAt: number;
              read: boolean;
              type:
                | "status_changed"
                | "admin_replied"
                | "comment_replied"
                | "mentioned"
                | "changelog_published";
            }>;
            page: Array<{
              contractVersion: 1;
              entityId: string;
              eventId: string;
              id: string;
              initiator: {
                avatarUrl?: string;
                displayName?: string;
                id: string;
              };
              occurredAt: number;
              read: boolean;
              type:
                | "status_changed"
                | "admin_replied"
                | "comment_replied"
                | "mentioned"
                | "changelog_published";
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        markNotificationRead: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            notificationId: string;
            scopeId: string;
          },
          {
            contractVersion: 1;
            entityId: string;
            eventId: string;
            id: string;
            initiator: { avatarUrl?: string; displayName?: string; id: string };
            occurredAt: number;
            read: boolean;
            type:
              | "status_changed"
              | "admin_replied"
              | "comment_replied"
              | "mentioned"
              | "changelog_published";
          },
          Name
        >;
      };
    };
    participation: {
      comments: {
        addComment: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            body: string;
            isAdmin: boolean;
            parentCommentId?: string;
            postId: string;
            scopeId: string;
          },
          | {
              author: { avatarUrl?: string; displayName?: string; id: string };
              body: string;
              contractVersion: 1;
              id: string;
              parentCommentId?: string;
              postId: string;
            }
          | {
              error:
                | {
                    code:
                      | "VALIDATION"
                      | "NOT_FOUND"
                      | "DISCUSSION_LOCKED"
                      | "NOT_AUTHORIZED";
                    contractVersion: 1;
                    message: string;
                  }
                | {
                    code: "RATE_LIMITED";
                    contractVersion: 1;
                    operation:
                      | "create_post"
                      | "edit_post"
                      | "comment"
                      | "vote"
                      | "subscribe";
                    retryAfterMs: number;
                  };
              ok: false;
            },
          Name
        >;
      };
      posts: {
        createPost: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            boardId: string;
            body: string;
            scopeId: string;
            title: string;
          },
          | {
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 1;
              id: string;
              status: { key: "open"; label: "Open" };
              tags: Array<string>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            }
          | {
              error:
                | {
                    code:
                      | "VALIDATION"
                      | "NOT_FOUND"
                      | "DISCUSSION_LOCKED"
                      | "NOT_AUTHORIZED";
                    contractVersion: 1;
                    message: string;
                  }
                | {
                    code: "RATE_LIMITED";
                    contractVersion: 1;
                    operation:
                      | "create_post"
                      | "edit_post"
                      | "comment"
                      | "vote"
                      | "subscribe";
                    retryAfterMs: number;
                  };
              ok: false;
            },
          Name
        >;
        editPost: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            body?: string;
            postId: string;
            scopeId: string;
            title?: string;
          },
          | {
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 1;
              id: string;
              status: { key: "open"; label: "Open" };
              tags: Array<string>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            }
          | {
              error:
                | {
                    code:
                      | "VALIDATION"
                      | "NOT_FOUND"
                      | "DISCUSSION_LOCKED"
                      | "NOT_AUTHORIZED";
                    contractVersion: 1;
                    message: string;
                  }
                | {
                    code: "RATE_LIMITED";
                    contractVersion: 1;
                    operation:
                      | "create_post"
                      | "edit_post"
                      | "comment"
                      | "vote"
                      | "subscribe";
                    retryAfterMs: number;
                  };
              ok: false;
            },
          Name
        >;
        withdrawPost: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            postId: string;
            scopeId: string;
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 1;
            id: string;
            status: { key: "open"; label: "Open" };
            tags: Array<string>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
      };
      subscriptions: {
        getPostSubscription: FunctionReference<
          "query",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            postId: string;
            scopeId: string;
          },
          {
            contractVersion: 1;
            explicitOptOut: boolean;
            postId: string;
            subscribed: boolean;
          },
          Name
        >;
        setSubscription: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            desired: boolean;
            postId: string;
            scopeId: string;
          },
          | {
              contractVersion: 1;
              explicitOptOut: boolean;
              postId: string;
              subscribed: boolean;
            }
          | {
              error:
                | {
                    code:
                      | "VALIDATION"
                      | "NOT_FOUND"
                      | "DISCUSSION_LOCKED"
                      | "NOT_AUTHORIZED";
                    contractVersion: 1;
                    message: string;
                  }
                | {
                    code: "RATE_LIMITED";
                    contractVersion: 1;
                    operation:
                      | "create_post"
                      | "edit_post"
                      | "comment"
                      | "vote"
                      | "subscribe";
                    retryAfterMs: number;
                  };
              ok: false;
            },
          Name
        >;
      };
      votes: {
        setVote: FunctionReference<
          "mutation",
          "internal",
          {
            actor: {
              avatarUrl?: string;
              displayName?: string;
              externalKey: string;
            };
            desired: boolean;
            postId: string;
            scopeId: string;
          },
          | {
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 1;
              id: string;
              status: { key: "open"; label: "Open" };
              tags: Array<string>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            }
          | {
              error:
                | {
                    code:
                      | "VALIDATION"
                      | "NOT_FOUND"
                      | "DISCUSSION_LOCKED"
                      | "NOT_AUTHORIZED";
                    contractVersion: 1;
                    message: string;
                  }
                | {
                    code: "RATE_LIMITED";
                    contractVersion: 1;
                    operation:
                      | "create_post"
                      | "edit_post"
                      | "comment"
                      | "vote"
                      | "subscribe";
                    retryAfterMs: number;
                  };
              ok: false;
            },
          Name
        >;
      };
    };
    public: {
      boards: {
        listBoards: FunctionReference<
          "query",
          "internal",
          { scopeId: string; viewerAuthenticated: boolean },
          {
            boards: Array<{ id: string; name: string; slug: string }>;
            contractVersion: 1;
          },
          Name
        >;
      };
      changelog: {
        getPublishedChangelogBySlug: FunctionReference<
          "query",
          "internal",
          { scopeId: string; slug: string; viewerAuthenticated: boolean },
          | { contractVersion: 1; status: "notFound" }
          | {
              contractVersion: 1;
              entry: {
                body: string;
                contractVersion: 1;
                firstPublishedAt: number;
                id: string;
                links: Array<{
                  contractVersion: 1;
                  id: string;
                  status: {
                    key:
                      | "open"
                      | "under_review"
                      | "planned"
                      | "in_progress"
                      | "complete"
                      | "closed";
                    label:
                      | "Open"
                      | "Under Review"
                      | "Planned"
                      | "In Progress"
                      | "Complete"
                      | "Closed";
                  };
                  title: string;
                }>;
                slug: string;
                title: string;
                updatedAt: number;
              };
              status: "entry";
            },
          Name
        >;
        listPublishedChangelog: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            scopeId: string;
            viewerAuthenticated: boolean;
          },
          {
            continueCursor: string;
            contractVersion: 1;
            entries: Array<{
              body: string;
              contractVersion: 1;
              firstPublishedAt: number;
              id: string;
              links: Array<{
                contractVersion: 1;
                id: string;
                status: {
                  key:
                    | "open"
                    | "under_review"
                    | "planned"
                    | "in_progress"
                    | "complete"
                    | "closed";
                  label:
                    | "Open"
                    | "Under Review"
                    | "Planned"
                    | "In Progress"
                    | "Complete"
                    | "Closed";
                };
                title: string;
              }>;
              slug: string;
              title: string;
              updatedAt: number;
            }>;
            isDone: boolean;
            page: Array<{
              body: string;
              contractVersion: 1;
              firstPublishedAt: number;
              id: string;
              links: Array<{
                contractVersion: 1;
                id: string;
                status: {
                  key:
                    | "open"
                    | "under_review"
                    | "planned"
                    | "in_progress"
                    | "complete"
                    | "closed";
                  label:
                    | "Open"
                    | "Under Review"
                    | "Planned"
                    | "In Progress"
                    | "Complete"
                    | "Closed";
                };
                title: string;
              }>;
              slug: string;
              title: string;
              updatedAt: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      comments: {
        listComments: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            postId: string;
            scopeId: string;
            viewerAuthenticated: boolean;
          },
          {
            comments: Array<{
              author: { avatarUrl?: string; displayName?: string; id: string };
              body: string;
              contractVersion: 1;
              id: string;
              parentCommentId?: string;
              postId: string;
            }>;
            continueCursor: string;
            contractVersion: 1;
            isDone: boolean;
            page: Array<{
              author: { avatarUrl?: string; displayName?: string; id: string };
              body: string;
              contractVersion: 1;
              id: string;
              parentCommentId?: string;
              postId: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      feeds: {
        listFeedback: FunctionReference<
          "query",
          "internal",
          {
            boardId?: string;
            order: "newest" | "top" | "trending";
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            scopeId: string;
            status?:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            tagId?: string;
            viewerAuthenticated: boolean;
          },
          {
            continueCursor: string;
            contractVersion: 2;
            isDone: boolean;
            page: Array<{
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 2;
              id: string;
              status: {
                key:
                  | "open"
                  | "under_review"
                  | "planned"
                  | "in_progress"
                  | "complete"
                  | "closed";
                label:
                  | "Open"
                  | "Under Review"
                  | "Planned"
                  | "In Progress"
                  | "Complete"
                  | "Closed";
              };
              tags: Array<{ contractVersion: 1; id: string; name: string }>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            posts: Array<{
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 2;
              id: string;
              status: {
                key:
                  | "open"
                  | "under_review"
                  | "planned"
                  | "in_progress"
                  | "complete"
                  | "closed";
                label:
                  | "Open"
                  | "Under Review"
                  | "Planned"
                  | "In Progress"
                  | "Complete"
                  | "Closed";
              };
              tags: Array<{ contractVersion: 1; id: string; name: string }>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            }>;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      posts: {
        countPosts: FunctionReference<
          "query",
          "internal",
          { boardId: string; scopeId: string; viewerAuthenticated: boolean },
          { contractVersion: 1; count: number; hasMore: boolean },
          Name
        >;
        getPost: FunctionReference<
          "query",
          "internal",
          { postId: string; scopeId: string; viewerAuthenticated: boolean },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            board: { id: string; name: string; slug: string };
            boardId: string;
            body: string;
            commentCount: number;
            contractVersion: 1;
            id: string;
            status: { key: "open"; label: "Open" };
            tags: Array<string>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          },
          Name
        >;
        listPosts: FunctionReference<
          "query",
          "internal",
          {
            boardId: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            scopeId: string;
            viewerAuthenticated: boolean;
          },
          {
            continueCursor: string;
            contractVersion: 1;
            isDone: boolean;
            page: Array<{
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 1;
              id: string;
              status: { key: "open"; label: "Open" };
              tags: Array<string>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            posts: Array<{
              author: { avatarUrl?: string; displayName?: string; id: string };
              board: { id: string; name: string; slug: string };
              boardId: string;
              body: string;
              commentCount: number;
              contractVersion: 1;
              id: string;
              status: { key: "open"; label: "Open" };
              tags: Array<string>;
              title: string;
              totals: { comments: number; votes: number };
              voteCount: number;
            }>;
            splitCursor?: string | null;
          },
          Name
        >;
        resolvePost: FunctionReference<
          "query",
          "internal",
          { postId: string; scopeId: string; viewerAuthenticated: boolean },
          | {
              contractVersion: 1;
              post: {
                author: {
                  avatarUrl?: string;
                  displayName?: string;
                  id: string;
                };
                board: { id: string; name: string; slug: string };
                boardId: string;
                body: string;
                commentCount: number;
                contractVersion: 2;
                id: string;
                status: {
                  key:
                    | "open"
                    | "under_review"
                    | "planned"
                    | "in_progress"
                    | "complete"
                    | "closed";
                  label:
                    | "Open"
                    | "Under Review"
                    | "Planned"
                    | "In Progress"
                    | "Complete"
                    | "Closed";
                };
                tags: Array<{ contractVersion: 1; id: string; name: string }>;
                title: string;
                totals: { comments: number; votes: number };
                voteCount: number;
              };
              status: "post";
            }
          | {
              canonicalPostId: string;
              contractVersion: 1;
              requestedPostId: string;
              status: "merged";
            }
          | { contractVersion: 1; status: "notFound" },
          Name
        >;
      };
      roadmap: {
        listRoadmapGroup: FunctionReference<
          "query",
          "internal",
          {
            boardId?: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            scopeId: string;
            status: "planned" | "in_progress" | "complete";
            viewerAuthenticated: boolean;
          },
          {
            continueCursor: string;
            contractVersion: 1;
            isDone: boolean;
            items: Array<{
              board: { id: string; name: string; slug: string };
              boardId: string;
              commentCount: number;
              contractVersion: 1;
              createdAt: number;
              currentStatusSince: number;
              id: string;
              status: {
                key: "planned" | "in_progress" | "complete";
                label: "Planned" | "In Progress" | "Complete";
              };
              title: string;
              voteCount: number;
            }>;
            page: Array<{
              board: { id: string; name: string; slug: string };
              boardId: string;
              commentCount: number;
              contractVersion: 1;
              createdAt: number;
              currentStatusSince: number;
              id: string;
              status: {
                key: "planned" | "in_progress" | "complete";
                label: "Planned" | "In Progress" | "Complete";
              };
              title: string;
              voteCount: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      search: {
        searchFeedback: FunctionReference<
          "query",
          "internal",
          {
            boardId?: string;
            query: string;
            scopeId: string;
            status?:
              | "open"
              | "under_review"
              | "planned"
              | "in_progress"
              | "complete"
              | "closed";
            tagId?: string;
            viewerAuthenticated: boolean;
          },
          {
            contractVersion: 1;
            hasMore: boolean;
            items: Array<{
              board: { id: string; name: string; slug: string };
              contractVersion: 1;
              id: string;
              status: {
                key:
                  | "open"
                  | "under_review"
                  | "planned"
                  | "in_progress"
                  | "complete"
                  | "closed";
                label:
                  | "Open"
                  | "Under Review"
                  | "Planned"
                  | "In Progress"
                  | "Complete"
                  | "Closed";
              };
              title: string;
            }>;
          },
          Name
        >;
        suggestSimilarPosts: FunctionReference<
          "query",
          "internal",
          {
            body?: string;
            limit?: number;
            scopeId: string;
            title: string;
            viewerAuthenticated: boolean;
          },
          {
            contractVersion: 1;
            hasMore: boolean;
            items: Array<{
              board: { id: string; name: string; slug: string };
              contractVersion: 1;
              id: string;
              status: {
                key:
                  | "open"
                  | "under_review"
                  | "planned"
                  | "in_progress"
                  | "complete"
                  | "closed";
                label:
                  | "Open"
                  | "Under Review"
                  | "Planned"
                  | "In Progress"
                  | "Complete"
                  | "Closed";
              };
              title: string;
            }>;
          },
          Name
        >;
      };
    };
  };
