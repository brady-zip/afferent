import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  assertExactPublicationSequence,
  createExpectedPublicationModel,
  extractDescriptorChain,
} from "../helpers/headless-publication-oracle.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const chain = [
  { cursor: null, endCursor: "after-2", numItems: 2 },
  { cursor: "after-2", numItems: 2 },
];

function publication(overrides = {}) {
  return {
    reader: "comments",
    generation: 7,
    status: "Exhausted",
    ids: ["a", "b", "c", "d"],
    boundaries: chain,
    ...overrides,
  };
}

function exactModel(publications, deferredDeliveries = []) {
  return createExpectedPublicationModel({
    reader: "comments",
    generation: 7,
    publications,
    deferredDeliveries,
  });
}

test("the exact publication oracle rejects every unsound evidence class", () => {
  const exact = publication();
  const cases = [
    {
      label: "shorter non-error publication",
      model: exactModel([exact]),
      actual: [publication({ ids: ["a", "b"] })],
    },
    {
      label: "correct fault code with wrong prefix",
      model: exactModel([
        publication({
          status: "Error",
          ids: ["a", "b"],
          errorCode: "TRANSIENT",
        }),
      ]),
      actual: [
        publication({
          status: "Error",
          ids: ["a"],
          errorCode: "TRANSIENT",
        }),
      ],
    },
    {
      label: "wrong fault code with correct prefix",
      model: exactModel([
        publication({
          status: "Error",
          ids: ["a", "b"],
          errorCode: "TRANSIENT",
        }),
      ]),
      actual: [
        publication({
          status: "Error",
          ids: ["a", "b"],
          errorCode: "UNKNOWN",
        }),
      ],
    },
    {
      label: "overlapping descriptor boundaries",
      model: exactModel([exact]),
      actual: [
        publication({
          boundaries: [
            { cursor: null, endCursor: "after-2", numItems: 2 },
            { cursor: "after-1", numItems: 2 },
          ],
        }),
      ],
    },
    {
      label: "gapped descriptor boundaries",
      model: exactModel([exact]),
      actual: [
        publication({
          boundaries: [
            { cursor: null, endCursor: "after-1", numItems: 2 },
            { cursor: "after-2", numItems: 2 },
          ],
        }),
      ],
    },
    {
      label: "zero publications",
      model: exactModel([exact]),
      actual: [],
    },
  ];
  for (const { label, model, actual } of cases) {
    assert.throws(
      () => assertExactPublicationSequence(actual, model),
      undefined,
      label,
    );
  }

  for (const kind of ["result", "error"]) {
    assert.throws(
      () =>
        assertExactPublicationSequence(
          [exact],
          exactModel([exact], [{ originGeneration: 6, kind, rejected: true }]),
          [{ originGeneration: 6, kind, rejected: false }],
        ),
      undefined,
      `accepted stale ${kind}`,
    );
  }
});

test("the exact publication oracle accepts coupled first middle and tail faults", () => {
  const publications = [
    publication({
      status: "Error",
      ids: [],
      errorCode: "TRANSIENT",
    }),
    publication({
      status: "Error",
      ids: ["a", "b"],
      errorCode: "TRANSIENT",
    }),
    publication({
      status: "Error",
      ids: ["a", "b", "c", "d"],
      errorCode: "TRANSIENT",
    }),
  ];
  assert.doesNotThrow(() =>
    assertExactPublicationSequence(publications, exactModel(publications)),
  );
});

test("the scoped extraction seam rejects every extra or malformed active record", () => {
  const record = (paginationOpts) => ({
    active: 1,
    name: "harness:listProductComments",
    args: { scopeId: "scope-a", paginationOpts: { id: 17, ...paginationOpts } },
  });
  const exact = [
    record({ cursor: null, endCursor: "after-1", numItems: 1 }),
    record({ cursor: "after-1", endCursor: "after-2", numItems: 1 }),
    record({ cursor: "after-2", numItems: 1 }),
  ];
  assert.deepEqual(
    extractDescriptorChain(exact, {
      name: "harness:listProductComments",
      scopeId: "scope-a",
      sessionId: 17,
    }),
    exact.map((entry) => ({
      cursor: entry.args.paginationOpts.cursor,
      ...(entry.args.paginationOpts.endCursor === undefined
        ? {}
        : { endCursor: entry.args.paginationOpts.endCursor }),
      numItems: entry.args.paginationOpts.numItems,
    })),
  );
  for (const [label, records] of [
    [
      "overlap",
      [...exact, record({ cursor: "after-1", numItems: 1 })],
    ],
    [
      "gap",
      [exact[0], record({ cursor: "after-gap", numItems: 1 })],
    ],
    [
      "extra active tail",
      [...exact, record({ cursor: "orphan", numItems: 1 })],
    ],
  ]) {
    assert.throws(
      () =>
        extractDescriptorChain(records, {
          name: "harness:listProductComments",
          scopeId: "scope-a",
          sessionId: 17,
        }),
      undefined,
      label,
    );
  }
});

test("the oracle rejects cross-page cleanup loss duplication and stale publications", () => {
  const exact = publication({ ids: ["a", "b", "c", "d", "e", "f"] });
  for (const [label, actual] of [
    [
      "cleanup dropped cross-page row",
      publication({ ids: ["a", "b", "d", "e", "f"] }),
    ],
    [
      "cleanup duplicated cross-page row",
      publication({ ids: ["a", "b", "c", "c", "d", "e", "f"] }),
    ],
    [
      "store accepted stale result",
      [exact, publication({ ids: ["old-a", "old-b"] })],
    ],
    [
      "store surfaced stale error",
      [
        exact,
        publication({ status: "Error", ids: [], errorCode: "TRANSIENT" }),
      ],
    ],
  ]) {
    assert.throws(
      () =>
        assertExactPublicationSequence(
          Array.isArray(actual) ? actual : [actual],
          exactModel([exact]),
        ),
      undefined,
      label,
    );
  }
});

test("the Phase 2 gate includes mounted headless and real watch-query proofs", async () => {
  const manifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.match(manifest.scripts["test:react"], /vitest\.react\.config\.ts/);
  assert.match(
    manifest.scripts["test:backend:phase2"],
    /scripts\/test-headless-backend\.mjs/,
  );
  assert.match(manifest.scripts["test:phase2"], /test:react/);
  assert.match(manifest.scripts["test:phase2"], /test:backend:phase2/);
});

test("the real watch harness distinguishes setup failures from assertions", async () => {
  const source = await readFile(
    join(repositoryRoot, "scripts/test-headless-backend.mjs"),
    "utf8",
  );
  assert.match(source, /Headless backend harness setup failed/);
  assert.match(source, /Headless backend contract assertion failed/);
  assert.match(source, /ConvexReactClient/);
  assert.match(source, /watchQuery/);
  assert.match(source, /createDirectWatchStore/);
  assert.match(source, /createPaginatedWatchStore/);
  assert.match(source, /assert\.deepEqual/);
  assert.match(source, /results\.map\(\(item\) => item\.label\)/);
  assert.match(source, /assertCanonicalWindow/);
  assert.match(source, /assertActiveBoundaries/);
  assert.match(source, /assertAllWatchesDisposedOnce/);
  assert.match(source, /insertItem/);
  assert.match(source, /deleteItem/);
  assert.match(source, /moveItem/);
  assert.match(source, /revision/);
  assert.match(source, /proveAtomicClientTransition/);
  assert.match(source, /sibling\.localQueryResult\(\)/);
  assert.match(source, /one installed client transition/);
  assert.match(source, /recordEveryPublication/);
  assert.match(source, /assertExactSince/);
  assert.match(source, /allowedKeys\.includes/);
  assert.match(source, /cross-window sort movement/);
  assert.match(source, /assertFaultSince/);
  assert.match(source, /first-page failure/);
  assert.match(source, /middle-page failure/);
  assert.match(source, /tail-page failure/);
  assert.match(source, /reverse cross-window sort movement/);
  assert.match(source, /seedComments/);
  assert.match(source, /insertComment/);
  assert.match(source, /deleteComment/);
  assert.match(source, /parentCommentId/);
  assert.match(source, /comment feed/);
  assert.match(source, /comment identity replacement/);
  assert.doesNotMatch(source, /new Set\(/);
  assert.doesNotMatch(source, /results\.length > 0/);

  const querySource = await readFile(
    join(repositoryRoot, "src/react/query.ts"),
    "utf8",
  );
  assert.doesNotMatch(querySource, /\b(?:revision|watermark)\b/i);
});

test("the real watch harness drives installed merged comment and activity publications", async () => {
  const source = await readFile(
    join(repositoryRoot, "scripts/test-headless-backend.mjs"),
    "utf8",
  );
  assert.match(source, /app\.use\(afferent, \{ name: "afferent" \}\)/);
  assert.match(source, /components\.afferent\.public\.comments\.listComments/);
  assert.match(
    source,
    /components\.afferent\.admin\.activity\.listPostActivity/,
  );
  assert.match(source, /createExpectedPublicationModel/);
  assert.match(source, /assertExactPublicationSequence/);
  assert.match(source, /awaitNextPublication/);
  assert.match(source, /extractDescriptorChain/);
  assert.match(source, /createDeferredWatchTransport/);
  assert.doesNotMatch(source, /exactPrefixes/);
  assert.doesNotMatch(source, /assertPrefixesSince/);
  assert.match(source, /product merge length 1 to 2/);
  assert.match(source, /product merge cleaning repoint/);
  assert.match(source, /product merge length 2 to 1/);
  assert.match(source, /cleanupPublications\.comments > 0/);
  assert.match(source, /cleanupPublications\.activity > 0/);
  assert.match(source, /initialNumItems = 1/);
  assert.match(source, /minimumDescriptorCount\s*=\s*3/);
  assert.match(source, /betaPublications/);
  assert.match(source, /currentPublications/);
  assert.match(source, /publicationCount/);
  assert.match(source, /product comment identity A to B to A/i);
  assert.match(source, /product activity identity A to B to A/i);
});

test("the packed fixture wires the optional comment feed through trusted host boundaries", async () => {
  const [wrapperSource, applicationSource] = await Promise.all([
    readFile(
      join(repositoryRoot, "fixtures/packed-vite-convex/convex/afferent.ts"),
      "utf8",
    ),
    readFile(
      join(repositoryRoot, "fixtures/packed-vite-convex/src/App.tsx"),
      "utf8",
    ),
  ]);

  assert.match(wrapperSource, /export const listComments = query/);
  assert.match(wrapperSource, /listCommentsIntentValidator/);
  assert.match(wrapperSource, /commentPageResultValidator/);
  assert.match(wrapperSource, /client\.read\.listComments/);
  assert.match(wrapperSource, /withoutSessionGeneration\(args\)/);

  assert.match(applicationSource, /useComments/);
  assert.match(
    applicationSource,
    /listComments:\s*api\.afferent\.listComments/,
  );
  assert.doesNotMatch(applicationSource, /\.\.\/\.\.\/src\//);
});

test("the real merge harness drives installed comment and activity pagination", async () => {
  const source = await readFile(
    join(repositoryRoot, "scripts/test-merge-backend.mjs"),
    "utf8",
  );
  assert.match(source, /listComments/);
  assert.match(source, /listPostActivity/);
  assert.match(source, /paginationOpts/);
  assert.match(source, /endCursor/);
  assert.match(source, /maximumRowsRead/);
  assert.match(source, /malformed/);
});
