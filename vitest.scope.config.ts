import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/integration/scope-matrix.test.ts",
      "tests/integration/pagination-backend.test.ts",
      "tests/integration/tag-cleanup-backend.test.ts",
    ],
    exclude: [...configDefaults.exclude, "fixtures/**"],
  },
});
