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
      actors: {
        anonymizeActor: FunctionReference<
          "mutation",
          "internal",
          { actorId: string; scopeId: string },
          { avatarUrl?: string; displayName?: string; id: string },
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
          parentCommentId?: string;
          postId: string;
          scopeId: string;
        },
        {
          author: { avatarUrl?: string; displayName?: string; id: string };
          body: string;
          contractVersion: 1;
          id: string;
          parentCommentId?: string;
          postId: string;
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
            tags: Array<{ id: string; name: string }>;
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
            tags: Array<{ id: string; name: string }>;
            title: string;
            totals: { comments: number; votes: number };
            voteCount: number;
          }>;
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
            parentCommentId?: string;
            postId: string;
            scopeId: string;
          },
          {
            author: { avatarUrl?: string; displayName?: string; id: string };
            body: string;
            contractVersion: 1;
            id: string;
            parentCommentId?: string;
            postId: string;
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
              tags: Array<{ id: string; name: string }>;
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
              tags: Array<{ id: string; name: string }>;
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
