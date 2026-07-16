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
      listPosts: FunctionReference<
        "query",
        "internal",
        { boardId: string; scopeId: string; viewerAuthenticated: boolean },
        {
          contractVersion: 1;
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
        },
        Name
      >;
    };
  };
