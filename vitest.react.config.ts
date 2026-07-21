import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@/components/afferent": fileURLToPath(
        new URL("./ui/afferent", import.meta.url),
      ),
      "afferent/react.js": fileURLToPath(
        new URL("./src/react/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/react/**/*.test.tsx", "tests/ui/**/*.test.tsx"],
  },
});
