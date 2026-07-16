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
        { contractVersion: 1; count: number },
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
      posts: {
        countPosts: FunctionReference<
          "query",
          "internal",
          { boardId: string; scopeId: string; viewerAuthenticated: boolean },
          { contractVersion: 1; count: number },
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
    };
  };
