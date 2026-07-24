import type { ComponentApi } from "afferent/_generated/component.js";
import { createAfferentClient } from "afferent";
import type {
  AfferentActionResult,
  BoardId,
  CommentDto,
  PostDto,
  PostId,
  VerifiedActor,
} from "afferent";

import type { MutationCtx } from "./_generated/server.js";

export const SEED_VERSION = 1;

type StatusKey =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "complete"
  | "closed";

type SeedEntity = Readonly<{
  semanticKey: string;
  kind: "board" | "post" | "comment" | "changelog";
  entityId: string;
}>;

export const REPRESENTATIVE_SEED = {
  version: SEED_VERSION,
  actors: [
    {
      key: "admin",
      externalKey: "demo-seed:admin",
      displayName: "Avery from Afferent",
    },
    {
      key: "alex",
      externalKey: "demo-seed:alex",
      displayName: "Alex Chen",
    },
    {
      key: "priya",
      externalKey: "demo-seed:priya",
      displayName: "Priya Shah",
    },
  ],
  boards: [
    { key: "product", slug: "product", name: "Product feedback" },
    {
      key: "integrations",
      slug: "integrations",
      name: "Integrations",
    },
  ],
  posts: [
    {
      key: "billing-history",
      actorKey: "alex",
      boardKey: "product",
      title: "Make invoice history easier to export",
      body: "A CSV export would help our finance team reconcile renewals.",
      status: "complete" as StatusKey,
    },
    {
      key: "dark-mode",
      actorKey: "priya",
      boardKey: "product",
      title: "Add a dark appearance for feedback boards",
      body: "Our support team works across both light and dark product shells.",
      status: "in_progress" as StatusKey,
    },
    {
      key: "slack-notifications",
      actorKey: "alex",
      boardKey: "integrations",
      title: "Send status updates to Slack",
      body: "Let a host delivery worker route Afferent events to our team.",
      status: "planned" as StatusKey,
    },
    {
      key: "mobile-sdk",
      actorKey: "priya",
      boardKey: "integrations",
      title: "Document a React Native integration path",
      body: "We want to collect feedback from our companion mobile app.",
      status: "under_review" as StatusKey,
    },
    {
      key: "keyboard-shortcuts",
      actorKey: "alex",
      boardKey: "product",
      title: "Add keyboard shortcuts to admin triage",
      body: "Quick status and board actions would speed up weekly triage.",
      status: "open" as StatusKey,
    },
    {
      key: "generic-webhooks",
      actorKey: "priya",
      boardKey: "integrations",
      title: "Ship a built-in generic webhook URL",
      body: "A typed host-owned delivery worker is safer for the first release.",
      status: "closed" as StatusKey,
    },
  ],
  comments: [
    {
      key: "billing-admin-reply",
      actorKey: "admin",
      postKey: "billing-history",
      body: "This shipped through the same scoped export contract used by the app.",
    },
    {
      key: "dark-mode-context",
      actorKey: "alex",
      postKey: "dark-mode",
      body: "Please preserve system preference and forced-colors behavior.",
    },
    {
      key: "slack-admin-reply",
      actorKey: "admin",
      postKey: "slack-notifications",
      body: "The delivery outbox is ready; the host-specific Slack worker stays optional.",
    },
    {
      key: "mobile-follow-up",
      actorKey: "alex",
      postKey: "mobile-sdk",
      body: "An example using the headless bindings would cover our needs.",
    },
  ],
  votes: [
    { key: "vote-dark", actorKey: "alex", postKey: "dark-mode" },
    { key: "vote-slack", actorKey: "priya", postKey: "slack-notifications" },
    { key: "vote-mobile", actorKey: "alex", postKey: "mobile-sdk" },
    {
      key: "vote-shortcuts",
      actorKey: "priya",
      postKey: "keyboard-shortcuts",
    },
  ],
  changelog: {
    key: "invoice-export-shipped",
    actorKey: "admin",
    title: "Invoice export is now available",
    slug: "invoice-export-is-now-available",
    body: "Finance teams can now export invoice history as CSV while keeping their data in the host application.",
    linkedPostKeys: ["billing-history"],
    published: true,
  },
} as const;

export type SeedOperations = Readonly<{
  restoreEntities?: (entities: readonly SeedEntity[]) => Promise<void>;
  configureInstallation: (
    boards: typeof REPRESENTATIVE_SEED.boards,
  ) => Promise<void | readonly SeedEntity[]>;
  createPost: (
    post: (typeof REPRESENTATIVE_SEED.posts)[number],
  ) => Promise<void | readonly SeedEntity[]>;
  setPostStatus: (
    postKey: string,
    status: StatusKey,
  ) => Promise<void | readonly SeedEntity[]>;
  addComment: (
    comment: (typeof REPRESENTATIVE_SEED.comments)[number],
  ) => Promise<void | readonly SeedEntity[]>;
  setVote: (
    vote: (typeof REPRESENTATIVE_SEED.votes)[number],
  ) => Promise<void | readonly SeedEntity[]>;
  createPublishedChangelog: (
    entry: typeof REPRESENTATIVE_SEED.changelog,
  ) => Promise<void | readonly SeedEntity[]>;
}>;

export type SeedProgressStore = Readonly<{
  read: (
    physicalScopeId: string,
  ) => Promise<{ version: number; completedStep: number } | null>;
  write: (
    physicalScopeId: string,
    version: number,
    completedStep: number,
  ) => Promise<void>;
  listEntities: (physicalScopeId: string) => Promise<readonly SeedEntity[]>;
  writeEntities: (
    physicalScopeId: string,
    entities: readonly SeedEntity[],
  ) => Promise<void>;
}>;

export function createMemorySeedProgressStore(): SeedProgressStore {
  const progress = new Map<
    string,
    { version: number; completedStep: number }
  >();
  const entities = new Map<string, SeedEntity[]>();
  return {
    read: async (scope) => progress.get(scope) ?? null,
    write: async (scope, version, completedStep) => {
      progress.set(scope, { version, completedStep });
    },
    listEntities: async (scope) => entities.get(scope) ?? [],
    writeEntities: async (scope, next) => {
      const current = entities.get(scope) ?? [];
      const byKey = new Map(
        current.map((entity) => [entity.semanticKey, entity]),
      );
      for (const entity of next) byKey.set(entity.semanticKey, entity);
      entities.set(scope, [...byKey.values()]);
    },
  };
}

export async function runRepresentativeSeed(input: {
  physicalScopeId: string;
  operations: SeedOperations;
  progress: SeedProgressStore;
}) {
  const existing = await input.progress.read(input.physicalScopeId);
  if (existing !== null && existing.version > SEED_VERSION) {
    throw new Error("SANDBOX_SEED_VERSION_UNSUPPORTED");
  }
  await input.operations.restoreEntities?.(
    await input.progress.listEntities(input.physicalScopeId),
  );

  const steps: Array<() => Promise<void | readonly SeedEntity[]>> = [
    () => input.operations.configureInstallation(REPRESENTATIVE_SEED.boards),
    ...REPRESENTATIVE_SEED.posts.map(
      (post) => () => input.operations.createPost(post),
    ),
    ...REPRESENTATIVE_SEED.posts
      .filter(({ status }) => status !== "open")
      .map(
        (post) => () =>
          input.operations.setPostStatus(post.key, post.status),
      ),
    ...REPRESENTATIVE_SEED.comments.map(
      (comment) => () => input.operations.addComment(comment),
    ),
    ...REPRESENTATIVE_SEED.votes.map(
      (vote) => () => input.operations.setVote(vote),
    ),
    () =>
      input.operations.createPublishedChangelog(
        REPRESENTATIVE_SEED.changelog,
      ),
  ];

  let completedStep =
    existing?.version === SEED_VERSION ? existing.completedStep : 0;
  for (const [index, step] of steps.entries()) {
    const stepNumber = index + 1;
    if (stepNumber <= completedStep) continue;
    const created = await step();
    if (created !== undefined) {
      await input.progress.writeEntities(input.physicalScopeId, created);
    }
    await input.progress.write(
      input.physicalScopeId,
      SEED_VERSION,
      stepNumber,
    );
    completedStep = stepNumber;
  }
  return { version: SEED_VERSION, complete: true as const };
}

export function createConvexSeedProgressStore(
  ctx: MutationCtx,
): SeedProgressStore {
  return {
    read: async (physicalScopeId) => {
      const row = await ctx.db
        .query("demoSeedProgress")
        .withIndex("by_physical_scope", (query) =>
          query.eq("physicalScopeId", physicalScopeId),
        )
        .unique();
      return row === null
        ? null
        : { version: row.seedVersion, completedStep: row.completedStep };
    },
    write: async (physicalScopeId, seedVersion, completedStep) => {
      const row = await ctx.db
        .query("demoSeedProgress")
        .withIndex("by_physical_scope", (query) =>
          query.eq("physicalScopeId", physicalScopeId),
        )
        .unique();
      if (row === null) {
        await ctx.db.insert("demoSeedProgress", {
          physicalScopeId,
          seedVersion,
          completedStep,
        });
      } else {
        await ctx.db.patch(row._id, { seedVersion, completedStep });
      }
    },
    listEntities: async (physicalScopeId) => {
      const rows = await ctx.db
        .query("demoSeedEntities")
        .filter((query) =>
          query.eq(query.field("physicalScopeId"), physicalScopeId),
        )
        .collect();
      return rows.map(({ semanticKey, kind, entityId }) => ({
        semanticKey,
        kind,
        entityId,
      }));
    },
    writeEntities: async (physicalScopeId, entities) => {
      for (const entity of entities) {
        const existing = await ctx.db
          .query("demoSeedEntities")
          .withIndex("by_scope_key", (query) =>
            query
              .eq("physicalScopeId", physicalScopeId)
              .eq("semanticKey", entity.semanticKey),
          )
          .unique();
        if (existing === null) {
          await ctx.db.insert("demoSeedEntities", {
            physicalScopeId,
            ...entity,
          });
        } else if (
          existing.entityId !== entity.entityId ||
          existing.kind !== entity.kind
        ) {
          throw new Error("SANDBOX_SEED_ENTITY_CONFLICT");
        }
      }
    },
  };
}

type SeedClient = ReturnType<typeof createAfferentClient>;

function requireSeedResult<T>(
  result: AfferentActionResult<T>,
  operation: string,
): T {
  if (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    result.ok === false
  ) {
    throw new Error(`SANDBOX_SEED_${operation}_FAILED`);
  }
  return result as T;
}

export function createComponentSeedOperations(input: {
  component: ComponentApi;
  context: Parameters<
    SeedClient["admin"]["configureInstallation"]
  >[0];
}): SeedOperations {
  const actors = new Map<string, VerifiedActor>(
    REPRESENTATIVE_SEED.actors.map((actor) => [
      actor.key,
      {
        externalKey: actor.externalKey,
        displayName: actor.displayName,
      },
    ]),
  );
  const clients = new Map<string, SeedClient>();
  const boards = new Map<string, BoardId>();
  const posts = new Map<string, PostId>();

  function client(actorKey: string) {
    const actor = actors.get(actorKey);
    if (actor === undefined) throw new Error("SANDBOX_SEED_ACTOR_MISSING");
    let existing = clients.get(actorKey);
    if (existing === undefined) {
      existing = createAfferentClient(input.component, {
        resolveActor: async () => actor,
        resolveViewerActor: async () => actor,
        authorizeAdmin: async () => true,
        isAuthenticated: async () => true,
      });
      clients.set(actorKey, existing);
    }
    return existing;
  }

  const admin = () => client("admin");
  return {
    restoreEntities: async (entities) => {
      for (const entity of entities) {
        if (entity.kind === "board") {
          boards.set(entity.semanticKey, entity.entityId as BoardId);
        } else if (entity.kind === "post") {
          posts.set(entity.semanticKey, entity.entityId as PostId);
        }
      }
    },
    configureInstallation: async (manifestBoards) => {
      const result = await admin().admin.configureInstallation(input.context, {
        readPolicy: "public",
        boards: manifestBoards.map(({ slug, name }) => ({ slug, name })),
      });
      return manifestBoards.map((board) => {
        const created = result.boards.find(
          ({ slug }) => slug === board.slug,
        );
        if (created === undefined) {
          throw new Error("SANDBOX_SEED_BOARD_MISSING");
        }
        boards.set(board.key, created.id);
        return {
          semanticKey: board.key,
          kind: "board" as const,
          entityId: created.id,
        };
      });
    },
    createPost: async (post) => {
      const boardId = boards.get(post.boardKey);
      if (boardId === undefined) throw new Error("SANDBOX_SEED_BOARD_MISSING");
      const created = requireSeedResult<PostDto>(
        await client(post.actorKey).participation.createPost(input.context, {
          boardId,
          title: post.title,
          body: post.body,
        }),
        "POST",
      );
      posts.set(post.key, created.id);
      return [
        {
          semanticKey: post.key,
          kind: "post" as const,
          entityId: created.id,
        },
      ];
    },
    setPostStatus: async (postKey, status) => {
      const postId = posts.get(postKey);
      if (postId === undefined) throw new Error("SANDBOX_SEED_POST_MISSING");
      await admin().admin.setPostStatus(input.context, { postId, status });
    },
    addComment: async (comment) => {
      const postId = posts.get(comment.postKey);
      if (postId === undefined) throw new Error("SANDBOX_SEED_POST_MISSING");
      const created = requireSeedResult<CommentDto>(
        await client(comment.actorKey).participation.addComment(input.context, {
          postId,
          body: comment.body,
        }),
        "COMMENT",
      );
      return [
        {
          semanticKey: comment.key,
          kind: "comment" as const,
          entityId: created.id,
        },
      ];
    },
    setVote: async (vote) => {
      const postId = posts.get(vote.postKey);
      if (postId === undefined) throw new Error("SANDBOX_SEED_POST_MISSING");
      await client(vote.actorKey).participation.setVote(input.context, {
        postId,
        desired: true,
      });
    },
    createPublishedChangelog: async (entry) => {
      const draft = await client(entry.actorKey).admin.createChangelogDraft(
        input.context,
        {
          title: entry.title,
          body: entry.body,
          slug: entry.slug,
        },
      );
      const postIds = entry.linkedPostKeys.map((key) => {
        const postId = posts.get(key);
        if (postId === undefined) throw new Error("SANDBOX_SEED_POST_MISSING");
        return postId;
      });
      await client(entry.actorKey).admin.setChangelogLinks(input.context, {
        entryId: draft.id,
        postIds,
      });
      if (entry.published) {
        await client(entry.actorKey).admin.publishChangelog(input.context, {
          entryId: draft.id,
        });
      }
      return [
        {
          semanticKey: entry.key,
          kind: "changelog" as const,
          entityId: draft.id,
        },
      ];
    },
  };
}
