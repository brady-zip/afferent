import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/scope-matrix.test.ts"],
    exclude: [...configDefaults.exclude, "fixtures/**"],
  },
});
