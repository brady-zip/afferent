import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/accessibility",
  outputDir: ".playwright-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "light",
    locale: "en-US",
    reducedMotion: "reduce",
    timezoneId: "UTC",
    trace: "off",
    video: "off",
  },
  webServer: {
    command: "node scripts/serve-ui-evidence-fixture.mjs --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
