import { test, expect } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);

test.skip(!isConfigured, 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD');

test('switch tabs between Cockpit and Dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: /se connecter/i }).click();

  const cockpitTab = page.getByRole('tab', { name: /saisie/i });
  const dashboardTab = page.getByRole('tab', { name: /pilotage/i });

  await expect(cockpitTab).toBeVisible();
  await dashboardTab.click();
  await expect(dashboardTab).toHaveAttribute('data-state', 'active');
});
