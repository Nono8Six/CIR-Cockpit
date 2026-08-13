import { expect, test } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);

test.skip(!isConfigured, 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD');

test('B3-6 réel : la surface Tâches lit le backend déployé sans rappel legacy', async ({ page }) => {
  const taskResponses: Array<{ url: string; status: number }> = [];
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/functions/v1/api/trpc/tasks.') || url.includes('/functions/v1/api/trpc/task-types.')) {
      taskResponses.push({ url, status: response.status() });
    }
  });

  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();

  await page.goto('/tasks');
  await expect(page.getByTestId('tasks-page')).toBeVisible();
  await expect(page.getByText('Aucune tâche dans cette vue')).toBeVisible();
  await expect(page.getByText('Les tâches n’ont pas pu être chargées.')).toHaveCount(0);
  await expect.poll(() => taskResponses.length).toBeGreaterThanOrEqual(2);
  expect(taskResponses.every((response) => response.status === 200)).toBe(true);

  await page.goto('/');
  await expect(page.getByText('Relances en retard')).toHaveCount(0);
  await expect(page.getByText('À faire aujourd’hui')).toHaveCount(0);
});
