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

  test("closes the audited admin hierarchy, token, formatting, and controlled-phone contracts", () => {
    const adminFiles = [
      "admin-screen.tsx",
      "feedback-queue.tsx",
      "moderation-form.tsx",
      "tag-manager.tsx",
      "merge-dialog.tsx",
      "changelog-editor.tsx",
      "confirmation-dialog.tsx",
    ];
    const admin = adminFiles
      .map((file) => fs.readFileSync(`${root}/admin/${file}`, "utf8"))
      .join("\n");
    expect(fs.existsSync(`${root}/core/format.ts`)).toBe(true);
    expect(admin).toMatch(/mobileView/);
    expect(admin).toMatch(/onMobileViewChange/);
    expect(admin).toMatch(/aria-current/);
    expect(admin).toMatch(/pending/);
    expect(admin).toMatch(/errors/);
    expect(admin).toMatch(/reset/);
    expect(admin).not.toMatch(
      /window\.|matchMedia|useMediaQuery|react-router|next\/navigation|sonner|from ["'][^"']*convex|userId|isAdmin|scopeId/,
    );

    const styles = fs.readFileSync(`${root}/afferent.css`, "utf8");
    expect(styles).toMatch(/\[data-selected="true"\]/);
    expect(styles).toMatch(/\[data-tone="error"\]/);
    expect(styles).toMatch(/\[data-tone="destructive"\]/);
    expect(styles).toMatch(/\[data-mobile-view="queue"\]/);
    expect(styles).toMatch(/\[data-mobile-view="detail"\]/);
    expect(styles).not.toMatch(/(?:font-size|gap|padding):[^;\n]*12px/);
    expect(styles).not.toMatch(
      /(?:padding(?:-inline|-block|-top|-right|-bottom|-left)?|margin(?:-inline|-block|-top|-right|-bottom|-left)?|row-gap|column-gap):[^;\n]*\b(?:6|12|20|40)px/,
    );
    expect(styles).toMatch(/\.afferent-dialog\s*\{[^}]*font: 400 16px\/1\.5/s);
    expect(styles).toMatch(/\.afferent-dialog button\s*\{[^}]*min-height: 44px/s);
    expect(styles).toMatch(/\.afferent-dialog button\s*\{[^}]*padding: 8px 16px/s);
    expect(styles).toMatch(/\.afferent-admin-section/);
    for (const size of styles.matchAll(/font-size:\s*(?<size>\d+)px/g)) {
      expect([14, 16, 20, 28]).toContain(Number(size.groups?.size));
    }
  });

  test("keeps every public recovery action query-owned and activity domain-formatted", () => {
    const sources = Object.fromEntries(
      [
        "board/board-screen.tsx",
        "board/similar-feedback.tsx",
        "board/post-detail.tsx",
        "board/discussion.tsx",
        "board/activity.tsx",
        "changelog/changelog-screen.tsx",
      ].map((file) => [file, fs.readFileSync(`${root}/${file}`, "utf8")]),
    );
    expect(sources["board/board-screen.tsx"]).toMatch(/onClick=\{feed\.retry\}/);
    expect(sources["board/board-screen.tsx"]).toMatch(/onClick=\{state\.retry\}/);
    expect(sources["board/similar-feedback.tsx"]).toMatch(/onClick=\{state\.retry\}/);
    expect(sources["board/post-detail.tsx"]).toMatch(/onClick=\{lookup\.retry\}/);
    expect(sources["board/discussion.tsx"]).toMatch(/onClick=\{comments\.retry\}/);
    expect(sources["board/activity.tsx"]).toMatch(/formatActivityDescription/);
    expect(sources["board/activity.tsx"]).not.toMatch(/replace\([^)]*_\)/);
    expect(sources["changelog/changelog-screen.tsx"]).toMatch(/feed\.retry/);
    expect(sources["changelog/changelog-screen.tsx"]).toMatch(/detail\.retry/);
  });

  test("centralizes approved query recovery guidance across every public error surface", () => {
    const copy = fs.readFileSync(`${root}/core/copy.ts`, "utf8");
    expect(copy).toContain("queryErrorGuidance: string");
    expect(copy).toContain(
      'queryErrorGuidance: "Try loading it again. If the problem continues, contact the application owner."',
    );
    for (const file of [
      "board/board-screen.tsx",
      "board/similar-feedback.tsx",
      "board/post-detail.tsx",
      "board/discussion.tsx",
      "board/activity.tsx",
      "roadmap/roadmap-group.tsx",
      "changelog/changelog-screen.tsx",
      "notifications/notifications-list.tsx",
    ]) {
      expect(fs.readFileSync(`${root}/${file}`, "utf8")).toContain(
        "copy.common.queryErrorGuidance",
      );
    }
  });
});
