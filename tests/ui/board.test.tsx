// @vitest-environment jsdom

import fs from "node:fs";
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { AfferentBoardScreen } from "../../ui/afferent/board/board-screen.js";
import {
  ControlledUiClient,
  board,
  click,
  feedbackPost,
  renderUi,
  setInput,
} from "./harness.js";

const approvedGuidance =
  "Try loading it again. If the problem continues, contact the application owner.";
const sentinelGuidance = "SENTINEL: use the host recovery channel.";

async function assertQueryRecovery(
  mounted: ReturnType<typeof renderUi>,
  options: {
    binding: string;
    heading: string;
    label: string;
    guidance: string;
    args: Record<string, unknown>;
    retainedText?: string;
  },
) {
  act(() => mounted.client.fail(options.binding, new Error(`${options.binding} offline`)));
  expect(mounted.container.textContent).toContain(options.heading);
  expect(mounted.container.textContent).toContain(options.guidance);
  expect(mounted.container.textContent).toContain(`${options.binding} offline`);
  if (options.guidance === sentinelGuidance) {
    expect(mounted.container.textContent).not.toContain(approvedGuidance);
  }
  if (options.retainedText) {
    expect(mounted.container.textContent).toContain(options.retainedText);
  }

  const priorAttempts = mounted.client.attempts(options.binding);
  const originatingArgs = priorAttempts.at(-1)?.args;
  expect(originatingArgs).toMatchObject(options.args);
  const recordCount = mounted.client.records.length;
  const action = [...mounted.container.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === options.label,
  );
  expect(action).toBeDefined();
  click(action!);
  await act(async () => {});
  const expectedArgs = withoutPaginationAttemptId(originatingArgs!);
  expect(
    mounted.client.records.slice(recordCount).map(({ name, args }) => ({
      name,
      args: withoutPaginationAttemptId(args),
    })),
  ).toEqual([{ name: `ui:${options.binding}`, args: expectedArgs }]);
}

function withoutPaginationAttemptId(args: Record<string, unknown>) {
  const pagination = args.paginationOpts as
    | Record<string, unknown>
    | undefined;
  if (!pagination) return args;
  const { id: _attemptId, ...paginationOpts } = pagination;
  return { ...args, paginationOpts };
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("public feedback board", () => {
  test("discovery exposes labelled board, search, filter, sort, native links, and pagination", async () => {
    const mounted = renderUi(
      <AfferentBoardScreen boards={[board]} feedArgs={{ order: "top" }} />,
    );
    await act(async () => {});

    expect(mounted.container.querySelectorAll("main")).toHaveLength(1);
    expect(mounted.container.querySelector("h1")?.textContent).toBe("Feedback");
    expect(mounted.container.querySelector("label[for]")).not.toBeNull();
    expect(
      mounted.container.querySelector("select[name='board']"),
    ).not.toBeNull();
    expect(
      mounted.container.querySelector("select[name='sort']"),
    ).not.toBeNull();
    expect(
      mounted.container.querySelector("select[name='status']"),
    ).not.toBeNull();
    expect(
      mounted.container.querySelector("input[type='search']"),
    ).not.toBeNull();
    expect(
      mounted.container.querySelector(`a[href='/feedback/${feedbackPost.id}']`)
        ?.textContent,
    ).toContain(feedbackPost.title);
    expect(mounted.container.textContent).toContain("4 votes");
    expect(mounted.container.textContent).toContain("2 comments");
    mounted.unmount();
  });

  test("create feedback uses hook-owned similar and mutation state", async () => {
    const mounted = renderUi(<AfferentBoardScreen boards={[board]} />);
    await act(async () => {});
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Create feedback",
      )!,
    );
    const form = mounted.container.querySelector(
      "form[data-afferent-composer]",
    );
    expect(form).not.toBeNull();
    const title = form!.querySelector<HTMLInputElement>("input[name='title']")!;
    const body = form!.querySelector<HTMLTextAreaElement>(
      "textarea[name='body']",
    )!;
    setInput(title, "Keyboard shortcuts");
    setInput(body, "Please add editor shortcuts.");
    await act(async () => {});
    expect(mounted.container.textContent).toContain("Similar feedback");
    expect(mounted.container.textContent).toContain(feedbackPost.title);
    click(
      [...form!.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Post feedback",
      )!,
    );
    await act(async () => {});
    expect(mounted.client.mutationCalls).toContainEqual({
      name: "ui:createPost",
      args: {
        boardId: board.id,
        title: "Keyboard shortcuts",
        body: "Please add editor shortcuts.",
      },
    });
    mounted.unmount();
  });

  test("deep-link participation renders exact server capabilities and flat discussion order", async () => {
    const mounted = renderUi(
      <AfferentBoardScreen boards={[board]} postId={feedbackPost.id} />,
    );
    await act(async () => {});
    expect(mounted.container.textContent).toContain(feedbackPost.body);
    expect(mounted.container.textContent).toContain(
      "Alex created the feedback.",
    );
    for (const label of [
      "Vote for feedback",
      "Subscribe to updates",
      "Edit feedback",
      "Withdraw feedback",
      "Post comment",
      "Reply",
    ]) {
      expect(mounted.container.textContent).toContain(label);
    }
    const comments = [
      ...mounted.container.querySelectorAll("[data-comment-id]"),
    ];
    expect(
      comments.map((comment) => comment.getAttribute("data-comment-id")),
    ).toEqual(["comment:root", "comment:reply"]);
    expect(comments[1].getAttribute("data-parent-comment-id")).toBe(
      "comment:root",
    );
    const results = mounted.container.querySelector(
      ".afferent-board__results",
    )!;
    const detail = mounted.container.querySelector(".afferent-post-detail")!;
    expect(
      results.compareDocumentPosition(detail) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Vote for feedback",
      )!,
    );
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Subscribe to updates",
      )!,
    );
    const comment = mounted.container.querySelector<HTMLTextAreaElement>(
      "textarea[name='comment']",
    )!;
    setInput(comment, "A new root comment");
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Post comment",
      )!,
    );
    await act(async () => {});
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Reply",
      )!,
    );
    const reply = mounted.container.querySelector<HTMLTextAreaElement>(
      "textarea[name='reply']",
    )!;
    setInput(reply, "A flat reply");
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Post reply",
      )!,
    );
    await act(async () => {});
    expect(mounted.client.mutationCalls).toEqual(
      expect.arrayContaining([
        {
          name: "ui:setVote",
          args: { postId: feedbackPost.id, desired: true },
        },
        {
          name: "ui:setSubscription",
          args: { postId: feedbackPost.id, desired: true },
        },
        {
          name: "ui:addComment",
          args: { postId: feedbackPost.id, body: "A new root comment" },
        },
        {
          name: "ui:addComment",
          args: {
            postId: feedbackPost.id,
            body: "A flat reply",
            parentCommentId: "comment:root",
          },
        },
      ]),
    );
    mounted.unmount();
  });

  test("edit and withdraw confirmation preserve server capability and focus", async () => {
    const mounted = renderUi(
      <AfferentBoardScreen boards={[board]} postId={feedbackPost.id} />,
    );
    await act(async () => {});
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Edit feedback",
      )!,
    );
    const editTitle = mounted.container.querySelector<HTMLInputElement>(
      "input[name='edit-title']",
    )!;
    setInput(editTitle, "Keyboard navigation");
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Save feedback changes",
      )!,
    );
    await act(async () => {});
    expect(mounted.client.mutationCalls).toContainEqual({
      name: "ui:editPost",
      args: {
        postId: feedbackPost.id,
        title: "Keyboard navigation",
        body: feedbackPost.body,
      },
    });

    const withdraw = [...mounted.container.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Withdraw feedback",
    )! as HTMLButtonElement;
    click(withdraw);
    await act(async () => {});
    expect(document.body.querySelector("[role='dialog']")).not.toBeNull();
    click(
      [...document.body.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Keep feedback",
      )!,
    );
    await act(async () => {});
    expect(document.activeElement).toBe(withdraw);
    mounted.unmount();
  });

  test("closed states use approved feedback recovery copy", async () => {
    const client = new ControlledUiClient();
    client.values.set("ui:feed", undefined);
    const loading = renderUi(<AfferentBoardScreen boards={[board]} />, {
      client,
    });
    await act(async () => {});
    expect(loading.container.textContent).toContain("Loading feedback…");
    act(() =>
      loading.client.publish("feed", {
        contractVersion: 3,
        page: [],
        posts: [],
        isDone: true,
        continueCursor: "done",
      }),
    );
    expect(loading.container.textContent).toContain("No feedback yet");
    act(() => loading.client.fail("feed", new Error("offline")));
    expect(loading.container.getAttribute("role")).not.toBe("alert");
    expect(loading.container.textContent).toContain(
      "We couldn't load feedback",
    );
    expect(loading.container.textContent).toContain(
      "Try loading it again. If the problem continues, contact the application owner.",
    );
    expect(loading.container.textContent).toContain("Reload feedback");
    const watchCount = loading.client.records.filter(
      (record) => record.name === "ui:feed",
    ).length;
    click(
      [...loading.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Reload feedback",
      )!,
    );
    expect(
      loading.client.records.filter((record) => record.name === "ui:feed"),
    ).toHaveLength(watchCount + 1);
    loading.unmount();
  });

  test("every board query error preserves its domain action and exact watch arguments under default and custom guidance", async () => {
    for (const guidance of [approvedGuidance, sentinelGuidance]) {
      const copy =
        guidance === sentinelGuidance
          ? { common: { queryErrorGuidance: sentinelGuidance } }
          : undefined;

      const feed = renderUi(<AfferentBoardScreen boards={[board]} />, {
        client: new ControlledUiClient(),
        copy,
      });
      await act(async () => {});
      await assertQueryRecovery(feed, {
        binding: "feed",
        heading: "We couldn't load feedback",
        label: "Reload feedback",
        guidance,
        args: { order: "top", boardId: board.id, sessionGeneration: 1 },
      });
      feed.unmount();

      const search = renderUi(<AfferentBoardScreen boards={[board]} />, {
        client: new ControlledUiClient(),
        copy,
      });
      await act(async () => {});
      setInput(
        search.container.querySelector<HTMLInputElement>("input[name='search']")!,
        "keyboard",
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await assertQueryRecovery(search, {
        binding: "search",
        heading: "We couldn't search feedback",
        label: "Retry feedback search",
        guidance,
        args: {
          query: "keyboard",
          boardId: board.id,
          sessionGeneration: 1,
        },
      });
      search.unmount();

      const similar = renderUi(<AfferentBoardScreen boards={[board]} />, {
        client: new ControlledUiClient(),
        copy,
      });
      await act(async () => {});
      click(
        [...similar.container.querySelectorAll("button")].find(
          (button) => button.textContent?.trim() === "Create feedback",
        )!,
      );
      setInput(
        similar.container.querySelector<HTMLInputElement>("input[name='title']")!,
        "Keyboard shortcuts",
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await assertQueryRecovery(similar, {
        binding: "similar",
        heading: "We couldn't load similar feedback",
        label: "Retry similar feedback",
        guidance,
        args: {
          title: "Keyboard shortcuts",
          body: "",
          sessionGeneration: 1,
        },
      });
      similar.unmount();

      const detail = renderUi(
        <AfferentBoardScreen boards={[board]} postId={feedbackPost.id} />,
        { client: new ControlledUiClient(), copy },
      );
      await act(async () => {});
      await assertQueryRecovery(detail, {
        binding: "post",
        heading: "We couldn't load feedback detail",
        label: "Retry feedback detail",
        guidance,
        args: { postId: feedbackPost.id, sessionGeneration: 1 },
      });
      detail.unmount();

      const discussion = renderUi(
        <AfferentBoardScreen boards={[board]} postId={feedbackPost.id} />,
        { client: new ControlledUiClient(), copy },
      );
      await act(async () => {});
      await assertQueryRecovery(discussion, {
        binding: "comments",
        heading: "We couldn't load discussion",
        label: "Retry discussion",
        guidance,
        args: { postId: feedbackPost.id, sessionGeneration: 1 },
      });
      discussion.unmount();

      const activity = renderUi(
        <AfferentBoardScreen boards={[board]} postId={feedbackPost.id} />,
        { client: new ControlledUiClient(), copy },
      );
      await act(async () => {});
      await assertQueryRecovery(activity, {
        binding: "activity",
        heading: "We couldn't load activity",
        label: "Retry activity",
        guidance,
        args: { postId: feedbackPost.id, sessionGeneration: 1 },
      });
      activity.unmount();
    }
  });

  test("merged and not-found detail states use a real canonical link", async () => {
    const merged = renderUi(
      <AfferentBoardScreen boards={[board]} postId={"post:old" as never} />,
    );
    await act(async () => {});
    act(() =>
      merged.client.publish("post", {
        contractVersion: 2,
        status: "merged",
        requestedPostId: "post:old",
        canonicalPostId: feedbackPost.id,
      }),
    );
    expect(merged.container.textContent).toContain("This feedback was merged");
    expect(
      [
        ...merged.container.querySelectorAll("a[href='/feedback/post:one']"),
      ].some((link) => link.textContent === "View canonical feedback"),
    ).toBe(true);
    act(() =>
      merged.client.publish("post", { contractVersion: 2, status: "notFound" }),
    );
    expect(merged.container.textContent).toContain("Feedback not found");
    expect(merged.container.textContent).toContain(
      "It may have been withdrawn, archived, or made unavailable.",
    );
    merged.unmount();
  });

  test("account generation removes actor-owned pending and source contains no forbidden UI authority", async () => {
    const mounted = renderUi(
      <AfferentBoardScreen boards={[board]} postId={feedbackPost.id} />,
    );
    await act(async () => {});
    mounted.rerender({ status: "unauthenticated" });
    expect(mounted.container.textContent).toContain("Sign in to continue");
    expect(mounted.container.querySelector("[aria-busy='true']")).toBeNull();
    mounted.unmount();

    const source = [
      "board-screen.tsx",
      "feedback-composer.tsx",
      "post-detail.tsx",
      "discussion.tsx",
    ]
      .map((file) => fs.readFileSync(`ui/afferent/board/${file}`, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /from ["']convex|window\.|useMediaQuery|dangerouslySetInnerHTML/,
    );
    expect(source).not.toMatch(/userId|actorId|isAdmin|scopeId|toast\s*\(/);
    expect(source).not.toContain("client.read.listComments");

    const styles = fs.readFileSync("ui/afferent/afferent.css", "utf8");
    expect(styles).toMatch(/@media \(min-width: 640px\)/);
    expect(styles).toMatch(/@media \(min-width: 768px\)/);
    expect(styles).toMatch(/@media \(min-width: 1024px\)/);
    expect(styles).toMatch(
      /grid-template-columns: minmax\(320px, 2fr\) minmax\(320px, 3fr\)/,
    );
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
