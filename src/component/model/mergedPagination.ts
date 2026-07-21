import type { PaginationOptions, PaginationResult } from "convex/server";
import { mergedStream, stream } from "convex-helpers/server/stream";
import { jsonToConvex } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import type { QueryCtx } from "../_generated/server.js";
import schema from "../schema.js";
import { invalidInput } from "./errors.js";

type ReaderKind = "comments" | "activity";
type OrderKind = "creation_asc" | "occurred_desc";

interface MergedPaginationArgs {
  scopeId: string;
  postIds: readonly Id<"posts">[];
  paginationOpts: PaginationOptions;
}

type CommentPaginationArgs = MergedPaginationArgs & {
  reader: "comments";
  order: "creation_asc";
};

type ActivityPaginationArgs = MergedPaginationArgs & {
  reader: "activity";
  order: "occurred_desc";
};

interface CursorIdentity {
  reader: ReaderKind;
  order: OrderKind;
  streams: string;
}

interface CursorEnvelope extends CursorIdentity {
  version: 1;
  position: string;
}

const CURSOR_PREFIX = "afferent-page:v1:";

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

function streamSetSignature(scopeId: string, postIds: readonly Id<"posts">[]) {
  const input = `${scopeId}\u0000${postIds.map(String).sort().join("\u0000")}`;
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function encodeCursor(position: string, identity: CursorIdentity) {
  const envelope: CursorEnvelope = {
    version: 1,
    ...identity,
    position,
  };
  return `${CURSOR_PREFIX}${encodeBase64Url(JSON.stringify(envelope))}`;
}

function isHelperCursorPosition(position: string) {
  try {
    return Array.isArray(jsonToConvex(JSON.parse(position)));
  } catch {
    return false;
  }
}

function decodeCursor(
  cursor: string,
  identity: CursorIdentity,
) {
  try {
    if (!cursor.startsWith(CURSOR_PREFIX)) return undefined;
    const parsed = JSON.parse(
      decodeBase64Url(cursor.slice(CURSOR_PREFIX.length)),
    ) as Partial<CursorEnvelope>;
    if (
      parsed.version !== 1 ||
      parsed.reader !== identity.reader ||
      parsed.order !== identity.order ||
      parsed.streams !== identity.streams ||
      typeof parsed.position !== "string" ||
      !isHelperCursorPosition(parsed.position)
    ) {
      return undefined;
    }
    return parsed.position;
  } catch {
    return undefined;
  }
}

function validateReadBudget(name: string, value: number | undefined) {
  if (value !== undefined && (!Number.isFinite(value) || value < 1)) {
    invalidInput(`${name} must be a positive finite number`);
  }
}

export async function paginateMergedPostStream(
  ctx: QueryCtx,
  args: CommentPaginationArgs,
): Promise<PaginationResult<Doc<"comments">>>;
export async function paginateMergedPostStream(
  ctx: QueryCtx,
  args: ActivityPaginationArgs,
): Promise<PaginationResult<Doc<"postActivity">>>;
export async function paginateMergedPostStream(
  ctx: QueryCtx,
  args: CommentPaginationArgs | ActivityPaginationArgs,
): Promise<PaginationResult<Doc<"comments"> | Doc<"postActivity">>> {
  if (args.postIds.length < 1 || args.postIds.length > 2) {
    throw new Error("MERGED_PAGINATION_STREAM_SET_INVARIANT");
  }
  validateReadBudget(
    "pagination maximumRowsRead",
    args.paginationOpts.maximumRowsRead,
  );
  validateReadBudget(
    "pagination maximumBytesRead",
    args.paginationOpts.maximumBytesRead,
  );

  const identity = {
    reader: args.reader,
    order: args.order,
    streams: streamSetSignature(args.scopeId, args.postIds),
  } satisfies CursorIdentity;
  const cursor =
    args.paginationOpts.cursor === null
      ? null
      : decodeCursor(args.paginationOpts.cursor, identity);
  const endCursor =
    args.paginationOpts.endCursor === undefined ||
    args.paginationOpts.endCursor === null
      ? args.paginationOpts.endCursor
      : decodeCursor(args.paginationOpts.endCursor, identity);
  const reset =
    cursor === undefined ||
    (endCursor === undefined && args.paginationOpts.endCursor !== undefined);
  const paginationOpts = {
    ...args.paginationOpts,
    cursor: reset ? null : cursor,
    ...(reset ? { endCursor: undefined } : { endCursor }),
  };

  const reader = stream(ctx.db, schema);
  const result =
    args.reader === "comments"
      ? await mergedStream(
          args.postIds.map((postId) =>
            reader
              .query("comments")
              .withIndex("by_scope_post", (q) =>
                q.eq("scopeId", args.scopeId).eq("postId", postId),
              )
              .order("asc"),
          ),
          ["_creationTime", "_id"],
        ).paginate(paginationOpts)
      : await mergedStream(
          args.postIds.map((postId) =>
            reader
              .query("postActivity")
              .withIndex("by_scope_post_occurred", (q) =>
                q.eq("scopeId", args.scopeId).eq("postId", postId),
              )
              .order("desc"),
          ),
          ["occurredAt", "_creationTime", "_id"],
        ).paginate(paginationOpts);

  return {
    ...result,
    continueCursor: encodeCursor(result.continueCursor, identity),
    ...(result.splitCursor === undefined || result.splitCursor === null
      ? {}
      : {
          splitCursor: encodeCursor(result.splitCursor, identity),
        }),
  };
}
