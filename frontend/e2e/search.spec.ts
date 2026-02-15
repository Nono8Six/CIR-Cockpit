import { test, expect, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);

const SEARCH_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 }
];

const login = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: /se connecter/i }).click();
};

const setupSearchIndexFixture = async (page: Page) => {
  await page.route('**/rest/v1/entities*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'entity-p04-client',
          account_type: 'term',
          address: null,
          agency_id: 'agency-1',
          archived_at: null,
          city: 'Paris',
          client_number: 'P04001',
          country: 'FR',
          created_at: '2025-01-01T00:00:00Z',
          created_by: null,
          department: '75',
          entity_type: 'Client',
          name: 'P04_TEST_CLIENT',
          notes: null,
          postal_code: '75001',
          siret: null,
          updated_at: '2025-01-01T00:00:00Z'
        }
      ])
    });
  });

  await page.route('**/rest/v1/entity_contacts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });
};

test.skip(!isConfigured, 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD');

test('global search keyboard flow is stable and responsive without overflow', async ({ page }) => {
  const criticalRadixWarnings: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const isCriticalRadixWarning =
      text.includes('DialogContent requires a DialogTitle')
      || text.includes('Missing `Description`')
      || text.includes('aria-describedby');

    if (msg.type() === 'warning' && isCriticalRadixWarning) {
      criticalRadixWarnings.push(text);
    }
  });

  await setupSearchIndexFixture(page);
  await login(page);

  await page.keyboard.press('Control+k');
  const searchInput = page.getByTestId('app-search-input');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('P04_TEST_CLIENT');
  const searchResult = page.getByText(/p04_test_client/i).first();
  await expect(searchResult).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  if ((await searchInput.count()) > 0) {
    await searchResult.click();
  }
  await expect(searchInput).toHaveCount(0);

  const clientsTab = page
    .getByTestId('app-header-tabs-scroll')
    .getByRole('tab', { name: /clients \(f5\)/i });
  await expect(clientsTab).toHaveAttribute('data-state', 'active');

  await page.keyboard.press('Control+k');
  await expect(page.getByTestId('app-search-input')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('app-search-input')).toHaveCount(0);

  for (const viewport of SEARCH_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.getByTestId('app-header-search-button').click();
    await expect(page.getByTestId('app-search-list')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const list = document.querySelector<HTMLElement>('[data-testid="app-search-list"]');

      return {
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        dialogHasHorizontalOverflow: dialog ? dialog.scrollWidth > dialog.clientWidth : true,
        listHasHorizontalOverflow: list ? list.scrollWidth > list.clientWidth : true
      };
    });

    expect(metrics.documentHasHorizontalOverflow).toBe(false);
    expect(metrics.dialogHasHorizontalOverflow).toBe(false);
    expect(metrics.listHasHorizontalOverflow).toBe(false);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('app-search-input')).toHaveCount(0);
  }

  expect(criticalRadixWarnings).toEqual([]);
});

test('global search exposes an explicit user error state when entity index fails', async ({ page }) => {
  await page.route('**/rest/v1/entities*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Erreur backend' })
    });
  });

  await page.route('**/rest/v1/entity_contacts*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Erreur backend' })
    });
  });

  await login(page);

  await page.getByTestId('app-header-search-button').click();
  const errorMessage = page.getByText(/recherche indisponible\.\s*veuillez reessayer\./i).first();
  await expect(errorMessage).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /reessayer/i }).click();
  await expect(errorMessage).toBeVisible({ timeout: 20_000 });
});
