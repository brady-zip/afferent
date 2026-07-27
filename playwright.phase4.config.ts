import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PHASE4_BASE_URL;
if (!baseURL) {
  throw new Error(
    "PHASE4_BASE_URL is required; run through scripts/test-hosted-demo.mjs",
  );
}

const remote = process.env.PHASE4_REMOTE === "1";
const localServer = remote
  ? undefined
  : {
      command: "node scripts/serve-hosted-demo.mjs --from-env",
      url: new URL("/__phase4/identity", baseURL).href,
      reuseExistingServer: false,
      timeout: 60_000,
    };

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir:
    process.env.PHASE4_OUTPUT_DIR ??
    ".demo-candidate/.phase4-playwright-results",
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    browserName: "chromium",
    colorScheme: "light",
    locale: "en-US",
    reducedMotion: "reduce",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      testMatch: [
        "hosted-demo.spec.ts",
        "sandbox-isolation.spec.ts",
        "sandbox-lifecycle.spec.ts",
        "hosted-accessibility.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "tablet",
      testMatch: "hosted-accessibility.spec.ts",
      use: { ...devices["iPad (gen 7)"] },
    },
    {
      name: "mobile",
      testMatch: "hosted-accessibility.spec.ts",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: localServer,
});
