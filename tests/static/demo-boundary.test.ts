import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(path, "utf8");

describe("local demo static boundary", () => {
  it("installs exactly two named Afferent instances with Convex Auth ingress", async () => {
    const config = await read("example/convex/convex.config.ts");
    expect(config.match(/app\.use\(afferent/g)).toHaveLength(2);
    expect(config).toMatch(/name:\s*"showcase"/);
    expect(config).toMatch(/name:\s*"sandbox"/);

    const auth = await read("example/convex/auth.ts");
    expect(auth).toMatch(/convexAuth/);
    expect(auth).toMatch(/Password/);
    const http = await read("example/convex/http.ts");
    expect(http).toMatch(/auth\.addHttpRoutes\(http\)/);
  });

  it("preserves fixed normal scope and excludes providers from component source", async () => {
    expect(await read("src/client/index.ts")).toMatch(
      /afferent:single-product:v1/,
    );
    const componentFiles = [
      "src/component/convex.config.ts",
      "src/component/schema.ts",
    ];
    for (const file of componentFiles) {
      expect(await read(file)).not.toMatch(
        /@convex-dev\/auth|clerk|better-auth/,
      );
    }
  });

  it("mounts showcase reads only and keeps sandbox authority server-side", async () => {
    const showcase = await read("example/convex/showcase.ts");
    expect(showcase).toMatch(/export const \w+\s*=\s*query\(\{/);
    expect(showcase).not.toMatch(
      /\bmutation\b|createPost|admin\.|seed|reset|cleanup/,
    );
    const authority = await read("example/convex/sandboxAuthority.ts");
    expect(authority).toMatch(/getAuthUserId/);
    expect(authority).toMatch(/normalizeConvexAuthUserId/);
    expect(authority).not.toMatch(
      /args\.(?:userId|isAdmin|scopeId|generation)|v\.(?:string|boolean)\(/,
    );
    expect(await read("example/convex/afferent.ts")).toMatch(
      /createScopedAfferentClient/,
    );
  });

  it("consumes headless cache generations at the host wrapper boundary", async () => {
    for (const path of [
      "example/convex/showcase.ts",
      "example/convex/sandbox.ts",
    ]) {
      const wrapper = await read(path);
      expect(wrapper).toContain(
        "const cacheGenerationValidator = { sessionGeneration: v.number() }",
      );
      expect(wrapper).toContain("withoutSessionGeneration(args)");
      expect(wrapper).toMatch(
        /listFeedbackIntentValidator\.fields,\s*\.\.\.cacheGenerationValidator/,
      );
      expect(wrapper).toMatch(
        /searchFeedbackIntentValidator\.fields,\s*\.\.\.cacheGenerationValidator/,
      );
    }
  });

  it("starts first-access preparation after Convex Auth succeeds", async () => {
    const entrypoint = await read("example/src/main.tsx");
    expect(entrypoint).toContain(
      '["signed_out", "preparing"].includes(lifecycle.state)',
    );
    expect(entrypoint).toMatch(
      /ensurePending\.current = true;[\s\S]*ensureSandbox\(\{\}\)/,
    );
  });

  it("commits generated references for both component instances", async () => {
    await access("example/convex/_generated/api.d.ts");
    await access("example/convex/_generated/server.d.ts");
    const api = await read("example/convex/_generated/api.d.ts");
    expect(api).toMatch(/showcase/);
    expect(api).toMatch(/sandbox/);
  });
});
