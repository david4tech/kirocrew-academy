import { test, expect } from '@playwright/test';

/**
 * Loads the built app against BASE_URL and asserts the landing page renders
 * with the ghost SVG present. Skips cleanly when BASE_URL is unset so this
 * spec never fails a run that has nothing deployed to point at yet.
 */
test.skip(!process.env.BASE_URL, 'BASE_URL is not set, skipping the smoke test.');

test('landing page renders with the Kiro ghost mark', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'KiroCrew Academy' })).toBeVisible();
  await expect(page.getByTestId('kiro-ghost')).toBeVisible();
});
