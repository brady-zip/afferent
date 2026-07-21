import fs from "node:fs";
import { describe, expect, test } from "vitest";

const root = "ui/afferent";

describe("copied UI distribution contract", () => {
  test("keeps six namespaced items and exact safe runtime metadata", () => {
    const catalog = JSON.parse(
      fs.readFileSync("registry/registry.json", "utf8"),
    );
    expect(catalog.items.map((item: { name: string }) => item.name)).toEqual([
      "afferent-admin",
      "afferent-board",
      "afferent-changelog",
      "afferent-notifications",
      "afferent-roadmap",
      "afferent-ui-core",
    ]);
    for (const item of catalog.items) {
      expect(item.dependencies).toEqual([
        "class-variance-authority@0.7.1",
        "clsx@2.1.1",
        "lucide-react@1.20.0",
        "radix-ui@1.6.0",
        "tailwind-merge@3.6.0",
      ]);
      expect(JSON.stringify(item)).not.toMatch(
        /playwright|typescript|vite|vitest|shadcn@/,
      );
    }
  });

  test("marks every hook consumer as a route-agnostic deterministic client boundary", () => {
    const files = fs
      .readdirSync(root, { recursive: true })
      .filter((path) => String(path).endsWith(".tsx"));
    for (const relative of files) {
      const source = fs.readFileSync(`${root}/${relative}`, "utf8");
      if (
        /use(?:Admin|Feedback|Roadmap|Changelog|Notification|Post|Tag)/.test(
          source,
        )
      )
        expect(source).toMatch(/^"use client";/);
      expect(source).not.toMatch(
        /window\.|matchMedia|Math\.random|Date\.now|dangerouslySetInnerHTML|react-router|next\/navigation|sonner/,
      );
    }
    expect(fs.existsSync("components.json")).toBe(false);
  });
});
