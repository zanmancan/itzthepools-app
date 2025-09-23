// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  // 👇 Your tests folder
  testDir: "./tests/e2e",

  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  reporter: [["list"]],
});
