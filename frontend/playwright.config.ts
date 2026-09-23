import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", timeout: 30000, workers: 1,
  use: { baseURL: "http://localhost:5175", channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true },
  webServer: { command: "npm run dev -- --port 5175 --strictPort", url: "http://localhost:5175", reuseExistingServer: !process.env.CI },
});
