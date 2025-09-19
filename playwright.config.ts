// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

/**
 * We default to your local Next port 3001 (matches package.json scripts).
 * Override with PLAYWRIGHT_BASE_URL if needed in CI or locally.
 */
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: process.env.CI
    ? [
        // In CI we start the already-built Next app
        {
          command: `npx next start -p ${PORT}`,
          url: BASE_URL,
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
      ]
    : [
        // Local dev run
        {
          command: `npx next dev -p ${PORT}`,
          url: BASE_URL,
          timeout: 120_000,
          reuseExistingServer: true,
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
