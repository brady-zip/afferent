import { describe, expect, test } from "vitest";

import {
  SAFE_MARKDOWN_LIMITS,
  normalizePlainText,
  validateSafeMarkdown,
} from "../../src/component/model/content.js";

describe("safe content model", () => {
  test("normalizes bounded plain text without accepting empty labels", () => {
    expect(normalizePlainText("  Product   feedback  ", "title")).toBe(
      "Product feedback",
    );
    expect(() => normalizePlainText("   ", "title")).toThrow();
    expect(() =>
      normalizePlainText("x".repeat(SAFE_MARKDOWN_LIMITS.plainText + 1), "title"),
    ).toThrow();
  });

  test("accepts the documented closed Markdown subset", () => {
    const source = [
      "# Heading",
      "",
      "A **strong** and *emphasized* [safe link](https://example.test/path).",
      "",
      "> Quoted",
      "",
      "- one",
      "- two",
      "",
      "`inline code`",
      "",
      "```ts",
      "const safe = true;",
      "```",
      "",
      "[email](mailto:team@example.test)",
    ].join("\n");

    expect(validateSafeMarkdown(`\r\n${source}\r\n`, "body")).toBe(source);
  });

  test.each([
    ["raw HTML", "<script>alert(1)</script>"],
    ["inline image", "![tracking](https://example.test/a.png)"],
    ["javascript link", "[click](javascript:alert(1))"],
    ["data link", "[click](data:text/html,boom)"],
    ["iframe", "<iframe src=\"https://example.test\"></iframe>"],
    ["style", "<style>body{display:none}</style>"],
  ])("rejects %s", (_label, source) => {
    expect(() => validateSafeMarkdown(source, "body")).toThrow();
  });

  test("rejects empty and over-limit Markdown", () => {
    expect(() => validateSafeMarkdown("   ", "body")).toThrow();
    expect(() =>
      validateSafeMarkdown(
        "x".repeat(SAFE_MARKDOWN_LIMITS.markdown + 1),
        "body",
      ),
    ).toThrow();
  });
});
