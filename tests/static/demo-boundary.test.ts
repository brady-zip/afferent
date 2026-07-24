import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(path, "utf8");

describe("hosted demo static boundary", () => {
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
      expect(await read(file)).not.toMatch(/@convex-dev\/auth|clerk|better-auth/);
    }
  });
});
