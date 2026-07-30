import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const requireDemoProvenance =
  process.env.AFFERENT_REQUIRE_DEMO_PROVENANCE === "1";
const demoUiRoot = process.env.AFFERENT_DEMO_UI_ROOT;
const demoPackageRoot = process.env.AFFERENT_DEMO_PACKAGE_ROOT;

if (requireDemoProvenance && (!demoUiRoot || !demoPackageRoot)) {
  throw new Error(
    "candidate UI and package roots are required for local demo tests",
  );
}

const uiRoot = demoUiRoot
  ? resolve(demoUiRoot)
  : fileURLToPath(new URL("ui/afferent", import.meta.url));
const reactEntry = demoPackageRoot
  ? resolve(demoPackageRoot, "dist/react/index.js")
  : fileURLToPath(new URL("src/react/index.ts", import.meta.url));
const clientEntry = demoPackageRoot
  ? resolve(demoPackageRoot, "dist/client/index.js")
  : fileURLToPath(new URL("src/client/index.ts", import.meta.url));
const candidateModules = demoPackageRoot
  ? resolve(demoPackageRoot, "..")
  : undefined;
const candidateRuntimeAliases = candidateModules
  ? [
      {
        find: /^react$/,
        replacement: resolve(candidateModules, "react/index.js"),
      },
      {
        find: "react/jsx-runtime",
        replacement: resolve(candidateModules, "react/jsx-runtime.js"),
      },
      {
        find: "react/jsx-dev-runtime",
        replacement: resolve(candidateModules, "react/jsx-dev-runtime.js"),
      },
      {
        find: /^react-dom$/,
        replacement: resolve(candidateModules, "react-dom/index.js"),
      },
      {
        find: "react-dom/client",
        replacement: resolve(candidateModules, "react-dom/client.js"),
      },
      {
        find: /^react-router$/,
        replacement: resolve(
          candidateModules,
          "react-router/dist/production/index.js",
        ),
      },
      {
        find: "convex/react",
        replacement: resolve(
          candidateModules,
          "convex/dist/cjs/react/index.js",
        ),
      },
      {
        find: /^radix-ui$/,
        replacement: resolve(candidateModules, "radix-ui/dist/index.js"),
      },
      {
        find: /^lucide-react$/,
        replacement: resolve(
          candidateModules,
          "lucide-react/dist/cjs/lucide-react.js",
        ),
      },
    ]
  : [];

export default defineConfig({
  resolve: {
    dedupe: ["convex", "react", "react-dom"],
    alias: [
      ...candidateRuntimeAliases,
      { find: "@/components/afferent", replacement: uiRoot },
      { find: "afferent/react.js", replacement: reactEntry },
      { find: /^afferent$/, replacement: clientEntry },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/react/**/*.test.tsx", "tests/ui/**/*.test.tsx"],
  },
});
