import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/demo-artifacts.test.mjs",
      "tests/integration/phase4-gate.test.mjs",
      "tests/integration/release-workflows.test.mjs",
      "tests/integration/version-sync.test.mjs",
    ],
    exclude: [
      ...configDefaults.exclude,
      "tests/integration/!(demo-artifacts.test.mjs|phase4-gate.test.mjs|release-workflows.test.mjs|version-sync.test.mjs)",
      "fixtures/**",
    ],
  },
});
