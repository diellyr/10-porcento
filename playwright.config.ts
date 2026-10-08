import { defineConfig } from "@playwright/test";

/**
 * E2E contra o app em modo dev com FIXTURES sintéticas (sem Supabase nem rede externa).
 * Local sem baixar navegadores: PW_CHROMIUM_PATH=/caminho/do/chromium npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3120",
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined, args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npx next dev -p 3120",
    url: "http://localhost:3120/glossario",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { BRASIL_FISCAL_DEV_FIXTURES: "1", CREDENTIALS_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString("base64"), NEXT_PUBLIC_SITE_URL: "http://localhost:3120" },
  },
});
