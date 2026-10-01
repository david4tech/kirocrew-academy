import { defineConfig } from '@playwright/test';

/**
 * Smoke test config. Points at BASE_URL (the built app served somewhere), so
 * this never launches a dev server itself. The spec skips cleanly when
 * BASE_URL is unset, per the brief.
 */
export default defineConfig({
  testDir: './playwright',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
  },
});
