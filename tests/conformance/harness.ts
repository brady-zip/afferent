import { expect, test, vi } from "vitest";

import type { ComponentApi } from "../../src/component/_generated/component.js";
import { createScopedAfferentClient } from "../../src/client/server.js";
import type { BoardId, VerifiedActor } from "../../src/client/index.js";

export type ProviderScenario = Readonly<{
  name: string;
  authenticatedActor: () => Promise<VerifiedActor>;
  anonymousActor: () => Promise<VerifiedActor | null>;
}>;

const component = {
  public: {
    boards: { listBoards: "listBoards" },
    posts: {
      listPosts: "listPosts",
      getPost: "getPost",
      countPosts: "countPosts",
    },
    comments: { listComments: "listComments" },
  },
  participation: {
    posts: {
      createPost: "createPost",
      editPost: "editPost",
      withdrawPost: "withdrawPost",
    },
    votes: { setVote: "setVote" },
    comments: { addComment: "addComment" },
  },
  admin: {
    installation: { configureInstallation: "configureInstallation" },
    actors: { anonymizeActor: "anonymizeActor" },
  },
} as unknown as ComponentApi;

function context(options: { readPolicy?: "public" | "authenticated" } = {}) {
  const runQuery = vi.fn(async (_reference: unknown, args: Record<string, unknown>) => {
    if (options.readPolicy === "authenticated" && !args.viewerAuthenticated) {
      throw new Error("AUTHENTICATION_REQUIRED");
    }
    return { contractVersion: 1, boards: [] };
  });
  const runMutation = vi.fn(async (_reference: unknown, args: Record<string, unknown>) => ({
    contractVersion: 1,
    id: "post",
    author: { id: "actor" },
    boards: [],
    readPolicy: "public",
    received: args,
  }));
  return {
    auth: { getUserIdentity: async () => null },
    runQuery,
    runMutation,
  };
}

export function runAuthorityConformance(scenario: ProviderScenario) {
  const makeClient = (options: {
    actor: () => Promise<VerifiedActor | null>;
    admin?: boolean;
    scope?: () => Promise<string>;
    authenticated?: boolean;
  }) =>
    createScopedAfferentClient(component, {
      resolveScope: options.scope ?? (async () => "trusted-scope"),
      resolveActor: options.actor,
      authorizeAdmin: async () => options.admin ?? false,
      isAuthenticated: async () => options.authenticated ?? false,
    });

  test(`${scenario.name}: public reads do not resolve or create actors`, async () => {
    const actor = vi.fn(scenario.authenticatedActor);
    const ctx = context({ readPolicy: "public" });
    const result = await makeClient({ actor }).read.listBoards(ctx as never, {});
    expect(result).toEqual({ contractVersion: 1, boards: [] });
    expect(actor).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  test(`${scenario.name}: authenticated-read policy requires verified authentication`, async () => {
    const ctx = context({ readPolicy: "authenticated" });
    const client = makeClient({ actor: scenario.anonymousActor });
    await expect(client.read.listBoards(ctx as never, {})).rejects.toThrow(
      "AUTHENTICATION_REQUIRED",
    );
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  test(`${scenario.name}: participation requires a verified actor before component invocation`, async () => {
    const ctx = context();
    const client = makeClient({ actor: scenario.anonymousActor });
    await expect(
      client.participation.createPost(ctx as never, {
        boardId: "board" as BoardId,
        title: "Safe",
        body: "Intent only",
      }),
    ).rejects.toThrow("AUTHENTICATION_REQUIRED");
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  test(`${scenario.name}: host authorization is independent and checked on every admin call`, async () => {
    const denied = context();
    const deniedClient = makeClient({
      actor: scenario.authenticatedActor,
      admin: false,
    });
    await expect(
      deniedClient.admin.configureInstallation(denied as never, {
        readPolicy: "public",
        boards: [],
      }),
    ).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    expect(denied.runMutation).not.toHaveBeenCalled();

    const allowed = context();
    const authorizeAdmin = vi.fn(async () => true);
    const allowedClient = createScopedAfferentClient(component, {
      resolveScope: async () => "trusted-scope",
      resolveActor: scenario.authenticatedActor,
      authorizeAdmin,
    });
    await allowedClient.admin.configureInstallation(allowed as never, {
      readPolicy: "public",
      boards: [],
    });
    await allowedClient.admin.configureInstallation(allowed as never, {
      readPolicy: "authenticated",
      boards: [],
    });
    expect(authorizeAdmin).toHaveBeenCalledTimes(2);
  });

  test(`${scenario.name}: missing or throwing scope fails closed before authority and data access`, async () => {
    for (const scope of [
      async () => "",
      async () => {
        throw new Error("SCOPE_LOOKUP_FAILED");
      },
    ]) {
      const actor = vi.fn(scenario.authenticatedActor);
      const ctx = context();
      const client = makeClient({ actor, scope });
      await expect(
        client.participation.createPost(ctx as never, {
          boardId: "board" as BoardId,
          title: "Safe",
          body: "Intent only",
        }),
      ).rejects.toThrow();
      expect(actor).not.toHaveBeenCalled();
      expect(ctx.runMutation).not.toHaveBeenCalled();
    }
  });

  test(`${scenario.name}: forged browser authority cannot alter trusted call facts`, async () => {
    const ctx = context();
    const client = makeClient({ actor: scenario.authenticatedActor });
    await client.participation.createPost(ctx as never, {
      boardId: "board" as BoardId,
      title: "Safe",
      body: "Intent only",
      userId: "attacker",
      externalKey: "attacker:key",
      isAdmin: true,
      scopeId: "attacker-scope",
      providerRecord: { email: "attacker@example.test", role: "admin" },
    } as never);

    const args = ctx.runMutation.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args).toMatchObject({
      scopeId: "trusted-scope",
      actor: await scenario.authenticatedActor(),
      boardId: "board",
      title: "Safe",
      body: "Intent only",
    });
    expect(args).not.toHaveProperty("userId");
    expect(args).not.toHaveProperty("isAdmin");
    expect(args).not.toHaveProperty("providerRecord");
  });
}
