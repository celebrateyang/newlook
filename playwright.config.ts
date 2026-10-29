import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
try { loadEnvFile(".env.local"); } catch { /* CI supplies environment directly. */ }
const live = process.env.E2E_LIVE === "1";
export default defineConfig({
  testDir: "./e2e",
  testMatch: live ? "live.spec.ts" : "public.spec.ts",
  globalSetup: live ? "./e2e/setup.ts" : undefined,
  globalTeardown: live ? "./e2e/teardown.ts" : undefined,
  fullyParallel: false,
  workers: 1,
  retries: 0, // Never silently repeat paid model calls.
  timeout: live ? 360_000 : 30_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3000", trace: "off", screenshot: "off", video: "off" },
  projects: live ? [{ name: "live", use: { ...devices["Desktop Chrome"] } }] : [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: { command: "pnpm start --port 3000", url: "http://localhost:3000/en", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
