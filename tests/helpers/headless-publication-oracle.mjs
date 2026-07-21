import assert from "node:assert/strict";

function clone(value) {
  return structuredClone(value);
}

function normalizedBoundary(boundary) {
  return {
    cursor: boundary.cursor,
    ...(boundary.endCursor === undefined
      ? {}
      : { endCursor: boundary.endCursor }),
    numItems: boundary.numItems,
  };
}

export function assertExactDescriptorChain(actual, expected) {
  assert.ok(Array.isArray(actual), "descriptor chain must be an array");
  assert.ok(actual.length > 0, "descriptor chain must not be empty");
  const boundaries = actual.map(normalizedBoundary);
  assert.equal(
    boundaries[0].cursor,
    null,
    "descriptor chain must start at null",
  );
  const tails = boundaries.filter(
    (boundary) => boundary.endCursor === undefined,
  );
  assert.equal(tails.length, 1, "descriptor chain must have exactly one tail");
  assert.equal(
    boundaries.at(-1)?.endCursor,
    undefined,
    "the unbounded descriptor must be the final tail",
  );
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const current = boundaries[index];
    const next = boundaries[index + 1];
    assert.notEqual(
      current.endCursor,
      undefined,
      `descriptor ${index} must have a pinned endCursor`,
    );
    assert.equal(
      current.endCursor,
      next.cursor,
      `descriptor boundary ${index} must be contiguous`,
    );
    assert.equal(
      boundaries.filter((boundary) => boundary.cursor === next.cursor).length,
      1,
      `descriptor cursor ${String(next.cursor)} must be unique`,
    );
  }
  if (expected !== undefined) {
    assert.deepEqual(boundaries, expected.map(normalizedBoundary));
  }
  return boundaries;
}

function assertPublicationShape(publication, reader, generation) {
  assert.equal(publication.reader, reader);
  assert.equal(publication.generation, generation);
  assert.ok(Array.isArray(publication.ids));
  assert.equal(typeof publication.status, "string");
  assertExactDescriptorChain(publication.boundaries);
  if (publication.status === "Error") {
    assert.equal(
      typeof publication.errorCode,
      "string",
      "an Error publication must couple its typed code",
    );
  } else {
    assert.equal(
      publication.errorCode,
      undefined,
      "a non-error publication must not carry an error code",
    );
  }
}

export function createExpectedPublicationModel({
  reader,
  generation,
  publications,
  deferredDeliveries = [],
}) {
  assert.equal(typeof reader, "string");
  assert.equal(typeof generation, "number");
  assert.ok(Array.isArray(publications));
  for (const publication of publications) {
    assertPublicationShape(publication, reader, generation);
  }
  return clone({ reader, generation, publications, deferredDeliveries });
}

export function assertExactPublicationSequence(
  actualPublications,
  expectedModel,
  actualDeferredDeliveries = [],
) {
  assert.equal(
    actualPublications.length,
    expectedModel.publications.length,
    "publication count must match the exact model",
  );
  for (let index = 0; index < actualPublications.length; index += 1) {
    const actual = actualPublications[index];
    const expected = expectedModel.publications[index];
    assertPublicationShape(
      actual,
      expectedModel.reader,
      expectedModel.generation,
    );
    assertExactDescriptorChain(actual.boundaries, expected.boundaries);
    assert.deepEqual(
      actual,
      expected,
      `publication ${index} must equal its exact expected sequence slot`,
    );
  }
  assert.deepEqual(
    actualDeferredDeliveries,
    expectedModel.deferredDeliveries,
    "deferred result/error rejection evidence must match exactly",
  );
}

export function createPublicationRecorder() {
  const publications = [];
  const listeners = [];
  return {
    publications,
    push(publication) {
      publications.push(clone(publication));
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    },
    at(index) {
      return publications[index];
    },
  };
}

export function awaitNextPublication(recorder, cursor, deadline, ...labels) {
  const label = labels[0];
  const existing = recorder.at(cursor);
  if (existing !== undefined) {
    return Promise.resolve({ publication: existing, cursor: cursor + 1 });
  }
  return new Promise((resolve, reject) => {
    const remaining = Math.max(0, deadline - Date.now());
    const stop = recorder.subscribe(() => {
      const publication = recorder.at(cursor);
      if (publication === undefined) return;
      clearTimeout(timeout);
      stop();
      resolve({ publication, cursor: cursor + 1 });
    });
    const timeout = setTimeout(() => {
      stop();
      reject(new Error(`Timed out waiting for ${label} publication ${cursor}`));
    }, remaining);
  });
}

export function extractDescriptorChain(records, { name, scopeId, sessionId }) {
  const active = records.filter(
    (record) =>
      record.active > 0 &&
      record.name === name &&
      record.args.scopeId === scopeId &&
      record.args.paginationOpts?.id === sessionId,
  );
  assert.ok(active.length > 0, "expected one scoped active descriptor chain");
  const ordered = [];
  let cursor = null;
  while (ordered.length < active.length) {
    const matches = active.filter(
      (record) =>
        !ordered.includes(record) &&
        record.args.paginationOpts.cursor === cursor,
    );
    assert.equal(
      matches.length,
      1,
      `expected exactly one active descriptor at ${String(cursor)}`,
    );
    const record = matches[0];
    ordered.push(record);
    const endCursor = record.args.paginationOpts.endCursor;
    if (endCursor === undefined) break;
    cursor = endCursor;
  }
  assert.equal(
    ordered.length,
    active.length,
    "every scoped active record must belong to the one descriptor chain",
  );
  return assertExactDescriptorChain(
    ordered.map((record) => normalizedBoundary(record.args.paginationOpts)),
  );
}

export function createDeferredWatchTransport(
  client,
  { generationOf = (args) => args.sessionGeneration } = {},
) {
  let pending;
  const held = [];
  const heldListeners = [];
  const deferredDeliveries = [];
  return {
    client: {
      watchQuery(reference, args = {}) {
        const watch = client.watchQuery(reference, args);
        const generation = generationOf(args);
        return {
          ...watch,
          onUpdate(listener) {
            const wrapped = () => {
              let kind = "result";
              try {
                watch.localQueryResult();
              } catch {
                kind = "error";
              }
              if (
                pending &&
                pending.generation === generation &&
                pending.kind === kind &&
                (pending.predicate === undefined || pending.predicate(args))
              ) {
                held.push({ listener, originGeneration: generation, kind });
                pending = undefined;
                for (const heldListener of heldListeners) heldListener();
                return;
              }
              listener();
            };
            return watch.onUpdate(wrapped);
          },
        };
      },
    },
    deferNext({ generation, kind, predicate }) {
      assert.equal(pending, undefined, "a deferred delivery is already armed");
      pending = { generation, kind, predicate };
    },
    releaseNext(observe) {
      const delivery = held.shift();
      assert.ok(delivery, "no deferred delivery is available");
      const before = clone(observe());
      delivery.listener();
      const after = clone(observe());
      const evidence = {
        originGeneration: delivery.originGeneration,
        kind: delivery.kind,
        rejected: JSON.stringify(before) === JSON.stringify(after),
      };
      deferredDeliveries.push(evidence);
      return evidence;
    },
    heldCount: () => held.length,
    awaitHeld(deadline, label, minimumCount = 1) {
      if (held.length >= minimumCount) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const stop = () => {
          const index = heldListeners.indexOf(onHeld);
          if (index !== -1) heldListeners.splice(index, 1);
        };
        const onHeld = () => {
          if (held.length < minimumCount) return;
          clearTimeout(timeout);
          stop();
          resolve();
        };
        heldListeners.push(onHeld);
        const timeout = setTimeout(() => {
          stop();
          reject(new Error(`Timed out waiting for ${label}`));
        }, Math.max(0, deadline - Date.now()));
      });
    },
    deferredDeliveries,
  };
}
