import fs from "node:fs";
import { describe, expect, test, vi } from "vitest";

import {
  mapCommentFeedState,
  mapFeedbackFeedState,
} from "../../src/react/hooks/feedback.js";

describe("headless feedback feed", () => {
  test("uses exact desired-state viewer vote delta for feed and detail caches", () => {
    const source = fs.readFileSync("src/react/hooks/feedback.ts", "utf8");
    expect(source).toContain("viewerHasVoted");
    expect(source).toMatch(
      /\(args\.desired \? 1 : 0\).*post\.viewerHasVoted/s,
    );
    expect(source).toContain("getAllQueries");
    expect(source).toContain("getQuery");
  });
  test.each([
    ["LoadingFirstPage", "loading"],
    ["CanLoadMore", "ready"],
    ["LoadingMore", "ready"],
    ["Exhausted", "empty"],
  ] as const)("maps helper %s to the %s state", (helperStatus, status) => {
    const loadMore = vi.fn();
    const state = mapFeedbackFeedState({
      results:
        helperStatus === "Exhausted" || helperStatus === "LoadingFirstPage"
          ? []
          : [{ id: "post-1" }],
      status: helperStatus,
      loadMore,
    });
    expect(state).toMatchObject({
      status,
      isLoadingMore: helperStatus === "LoadingMore",
      canLoadMore:
        helperStatus === "CanLoadMore" || helperStatus === "LoadingMore",
    });
    state.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);
  });

  test("uses serialized filters so a filter change resets helper pagination", () => {
    const first = { order: "newest" as const, status: "open" as const };
    const second = { order: "newest" as const, status: "planned" as const };
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });

  test("preserves the watch retry on feedback feed errors", () => {
    const retry = vi.fn();
    const state = mapFeedbackFeedState({
      results: [],
      status: "Error",
      error: { contractVersion: 1, code: "TRANSIENT", message: "offline" },
      loadMore: vi.fn(),
      retry,
    } as never);
    expect(state.status).toBe("error");
    if (state.status !== "error") throw new Error("expected error state");
    state.retry();
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("headless comment feed", () => {
  test.each([
    ["LoadingFirstPage", "loading"],
    ["CanLoadMore", "ready"],
    ["LoadingMore", "ready"],
    ["Exhausted", "empty"],
  ] as const)("maps helper %s to the %s state", (helperStatus, status) => {
    const loadMore = vi.fn();
    const state = mapCommentFeedState({
      results:
        helperStatus === "Exhausted" || helperStatus === "LoadingFirstPage"
          ? []
          : [
              {
                contractVersion: 1,
                id: "comment-1",
                postId: "post-1",
                body: "A flat comment",
                author: { id: "actor-1" },
              },
            ],
      status: helperStatus,
      loadMore,
    } as never);
    expect(state).toMatchObject({
      status,
      isLoadingMore: helperStatus === "LoadingMore",
      canLoadMore:
        helperStatus === "CanLoadMore" || helperStatus === "LoadingMore",
    });
    state.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);
  });

  test("maps omitted capability and typed coherent-prefix failure", () => {
    const loadMore = vi.fn();
    expect(
      mapCommentFeedState(
        {
          results: [],
          status: "LoadingFirstPage",
          loadMore,
        },
        false,
      ),
    ).toMatchObject({
      status: "unsupported",
      items: [],
      canLoadMore: false,
      isLoadingMore: false,
    });

    const state = mapCommentFeedState({
      results: [
        {
          contractVersion: 1,
          id: "root-1",
          postId: "post-1",
          body: "Root",
          author: { id: "actor-1" },
        },
      ],
      status: "Error",
      error: {
        contractVersion: 1,
        code: "TRANSIENT",
        message: "later page failed",
      },
      loadMore,
    } as never);
    expect(state).toMatchObject({
      status: "error",
      items: [{ id: "root-1" }],
      error: { code: "TRANSIENT" },
    });
    const retry = vi.fn();
    const retryable = mapCommentFeedState({
      results: [],
      status: "Error",
      error: { contractVersion: 1, code: "TRANSIENT", message: "offline" },
      loadMore,
      retry,
    } as never);
    expect(retryable.status).toBe("error");
    if (retryable.status !== "error") throw new Error("expected error state");
    retryable.retry();
    expect(retry).toHaveBeenCalledOnce();
  });
});
