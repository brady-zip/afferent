import { fromMarkdown } from "mdast-util-from-markdown";

import { invalidInput } from "./errors.js";

export const SAFE_MARKDOWN_LIMITS = {
  plainText: 160,
  markdown: 10_000,
} as const;

export const SAFE_MARKDOWN_NODE_TYPES = new Set([
  "root",
  "paragraph",
  "text",
  "heading",
  "strong",
  "emphasis",
  "blockquote",
  "list",
  "listItem",
  "inlineCode",
  "code",
  "link",
]);

export const SAFE_MARKDOWN_URL_SCHEMES = new Set([
  "http:",
  "https:",
  "mailto:",
]);

type MarkdownNode = Readonly<{
  type: string;
  url?: string;
  children?: readonly MarkdownNode[];
}>;

function normalizedLineEndings(value: string) {
  return value.replace(/\r\n?/gu, "\n").trim();
}

export function normalizePlainText(
  value: string,
  field: string,
  maximum = SAFE_MARKDOWN_LIMITS.plainText,
) {
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (!normalized || normalized.length > maximum) {
    invalidInput(`${field} must contain 1 to ${maximum} characters`);
  }
  return normalized;
}

function requireSafeUrl(url: string, field: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    invalidInput(`${field} contains a non-absolute link`);
  }
  if (!SAFE_MARKDOWN_URL_SCHEMES.has(parsed.protocol.toLowerCase())) {
    invalidInput(`${field} contains an unsafe link scheme`);
  }
}

function validateNode(node: MarkdownNode, field: string): void {
  if (!SAFE_MARKDOWN_NODE_TYPES.has(node.type)) {
    invalidInput(`${field} contains unsupported Markdown (${node.type})`);
  }
  if (node.type === "link") requireSafeUrl(node.url ?? "", field);
  for (const child of node.children ?? []) validateNode(child, field);
}

export function validateSafeMarkdown(
  value: string,
  field: string,
  maximum = SAFE_MARKDOWN_LIMITS.markdown,
) {
  const normalized = normalizedLineEndings(value);
  if (!normalized || normalized.length > maximum) {
    invalidInput(`${field} must contain 1 to ${maximum} characters`);
  }
  validateNode(fromMarkdown(normalized) as MarkdownNode, field);
  return normalized;
}
