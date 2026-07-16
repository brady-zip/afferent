import { convexTest } from "convex-test";
import { componentsGeneric, type UserIdentity } from "convex/server";
import { describe, expect, test, vi } from "vitest";

import type { ComponentApi } from "../../src/component/_generated/component.js";
import type {
  AfferentClient,
  AfferentClientOptions,
  BoardId,
} from "../../src/client/index.js";
import { createScopedAfferentClient } from "../../src/client/server.js";
import schema from "../../src/component/schema.js";
import { register } from "../../src/test.js";

type Backend = ReturnType<typeof convexTest>;
type AuthorizeAdmin = AfferentClientOptions["authorizeAdmin"];
type HostContext = Parameters<AfferentClient["participation"]["createPost"]>[0];

const components = componentsGeneric() as unknown as {
  afferent: ComponentApi;
};
const modules = import.meta.glob("../../src/component/**/*.ts");

export type ProviderFactoryScenario = Readonly<{
  name: string;
  identity: Partial<UserIdentity>;
  expectedDisplayName?: string;
  assertTrustedIdentityResolution?: () => void;
  createClient: (
    component: ComponentApi,
    authorizeAdmin: AuthorizeAdmin,
  ) => AfferentClient;
}>;

function createBackend() {
  const backend = convexTest(schema, modules);
  register(backend, "afferent");
  return backend;
}

function runWithContext<T>(
  backend: Backend,
  identity: Partial<UserIdentity> | null,
  operation: (ctx: HostContext) => Promise<T>,
) {
  const accessor = identity === null ? backend : backend.withIdentity(identity);
  return accessor.run((ctx) => operation(ctx as unknown as HostContext));
}

async function configure(
  scenario: ProviderFactoryScenario,
  backend: Backend,
  client: AfferentClient,
) {
  return runWithContext(backend, scenario.identity, (ctx) =>
    client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    }),
  );
}

export function runFactoryAuthorityConformance(
  scenario: ProviderFactoryScenario,
) {
  describe(`${scenario.name} factory authority matrix`, () => {
    test("public reads use the registered component without creating an actor", async () => {
      const backend = createBackend();
      const client = scenario.createClient(
        components.afferent,
        async () => true,
      );
      await configure(scenario, backend, client);

      const boards = await runWithContext(backend, null, (ctx) =>
        client.read.listBoards(ctx, {}),
      );

      expect(boards).toMatchObject({
        contractVersion: 1,
        boards: [{ slug: "feedback", name: "Feedback" }],
      });
    });

    test("missing authentication rejects participation before persistence", async () => {
      const backend = createBackend();
      const client = scenario.createClient(
        components.afferent,
        async () => true,
      );
      const configured = await configure(scenario, backend, client);

      await expect(
        runWithContext(backend, null, (ctx) =>
          client.participation.createPost(ctx, {
            boardId: configured.boards[0].id,
            title: "Rejected",
            body: "No verified provider identity",
          }),
        ),
      ).rejects.toThrow("AUTHENTICATION_REQUIRED");

      const posts = await runWithContext(backend, null, (ctx) =>
        client.read.listPosts(ctx, { boardId: configured.boards[0].id }),
      );
      expect(posts.posts).toEqual([]);
    });

    test("admin authorization is independent and recomputed for every call", async () => {
      const backend = createBackend();
      const authorizeAdmin = vi
        .fn<AuthorizeAdmin>()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      const client = scenario.createClient(
        components.afferent,
        authorizeAdmin,
      );

      await expect(
        runWithContext(backend, scenario.identity, (ctx) =>
          client.admin.configureInstallation(ctx, {
            readPolicy: "public",
            boards: [{ slug: "forbidden", name: "Forbidden" }],
          }),
        ),
      ).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");

      await runWithContext(backend, scenario.identity, (ctx) =>
        client.admin.configureInstallation(ctx, {
          readPolicy: "public",
          boards: [{ slug: "feedback", name: "Feedback" }],
        }),
      );
      await runWithContext(backend, scenario.identity, (ctx) =>
        client.admin.configureInstallation(ctx, {
          readPolicy: "authenticated",
          boards: [{ slug: "feedback", name: "Updated Feedback" }],
        }),
      );

      expect(authorizeAdmin).toHaveBeenCalledTimes(3);
      const boards = await runWithContext(backend, scenario.identity, (ctx) =>
        client.read.listBoards(ctx, {}),
      );
      expect(boards.boards).toMatchObject([
        { slug: "feedback", name: "Updated Feedback" },
      ]);
    });

    test("forged browser authority cannot alter the persisted trusted actor", async () => {
      const backend = createBackend();
      const client = scenario.createClient(
        components.afferent,
        async () => true,
      );
      const configured = await configure(scenario, backend, client);

      const created = await runWithContext(
        backend,
        scenario.identity,
        (ctx) =>
          client.participation.createPost(ctx, {
            boardId: configured.boards[0].id,
            title: "Trusted",
            body: "Provider-derived",
            userId: "attacker",
            externalKey: "attacker:key",
            isAdmin: true,
            scopeId: "attacker-scope",
            providerRecord: {
              email: "attacker@example.test",
              role: "admin",
            },
          } as never),
      );

      expect(created.author).toMatchObject({
        id: created.author.id,
        ...(scenario.expectedDisplayName === undefined
          ? {}
          : { displayName: scenario.expectedDisplayName }),
      });
      expect(created).not.toHaveProperty("userId");
      expect(created).not.toHaveProperty("externalKey");
      expect(created).not.toHaveProperty("isAdmin");
      expect(created).not.toHaveProperty("scopeId");
      expect(created).not.toHaveProperty("providerRecord");

      const persisted = await runWithContext(backend, null, (ctx) =>
        client.read.getPost(ctx, { postId: created.id }),
      );
      expect(persisted).toEqual(created);
    });

    test("a cross-scope board identifier fails without persisting a post", async () => {
      const backend = createBackend();
      const client = scenario.createClient(
        components.afferent,
        async () => true,
      );
      const scoped = createScopedAfferentClient(components.afferent, {
        resolveScope: async () => "other-server-scope",
        resolveActor: async () => ({ externalKey: "fixture:other" }),
        authorizeAdmin: async () => true,
        isAuthenticated: async () => true,
      });
      const otherConfiguration = await runWithContext(
        backend,
        scenario.identity,
        (ctx) =>
          scoped.admin.configureInstallation(ctx, {
            readPolicy: "public",
            boards: [{ slug: "other", name: "Other" }],
          }),
      );

      await expect(
        runWithContext(backend, scenario.identity, (ctx) =>
          client.participation.createPost(ctx, {
            boardId: otherConfiguration.boards[0].id,
            title: "Cross scope",
            body: "Must not persist",
          }),
        ),
      ).rejects.toMatchObject({
        data: { code: "NOT_FOUND", resource: "board" },
      });

      const otherPosts = await runWithContext(
        backend,
        scenario.identity,
        (ctx) =>
          scoped.read.listPosts(ctx, {
            boardId: otherConfiguration.boards[0].id,
          }),
      );
      expect(otherPosts.posts).toEqual([]);
    });

    test("successful participation persists one provider-derived actor", async () => {
      const backend = createBackend();
      const client = scenario.createClient(
        components.afferent,
        async () => true,
      );
      const configured = await configure(scenario, backend, client);

      const first = await runWithContext(backend, scenario.identity, (ctx) =>
        client.participation.createPost(ctx, {
          boardId: configured.boards[0].id,
          title: "First",
          body: "Persisted",
        }),
      );
      const second = await runWithContext(backend, scenario.identity, (ctx) =>
        client.participation.createPost(ctx, {
          boardId: configured.boards[0].id,
          title: "Second",
          body: "Same provider actor",
        }),
      );

      scenario.assertTrustedIdentityResolution?.();
      expect(second.author.id).toBe(first.author.id);
      const page = await runWithContext(backend, null, (ctx) =>
        client.read.listPosts(ctx, { boardId: configured.boards[0].id }),
      );
      expect(page.posts).toHaveLength(2);
      expect(page.posts.map((post) => post.author.id)).toEqual([
        first.author.id,
        first.author.id,
      ]);
    });
  });
}
