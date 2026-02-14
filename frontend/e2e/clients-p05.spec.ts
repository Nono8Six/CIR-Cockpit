import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);

const CLIENTS_VIEWPORTS = [
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

const openClientsTab = async (page: Page) => {
  const clientsTab = page.getByRole('tab', { name: /clients \(f5\)/i });
  await clientsTab.click();
  await expect(clientsTab).toHaveAttribute('data-state', 'active');
};

const setupDeepFocusFixture = async (page: Page) => {
  await page.route('**/rest/v1/entities*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'entity-p05-deep-focus',
          account_type: 'term',
          address: null,
          agency_id: 'agency-1',
          archived_at: null,
          city: 'Paris',
          client_number: 'P05001',
          country: 'FR',
          created_at: '2025-01-01T00:00:00Z',
          created_by: null,
          department: '75',
          entity_type: 'Client',
          name: 'P05_DEEP_FOCUS_CLIENT',
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

test('P05 - toolbar clients, selection list/detail, clavier et responsive anti-overflow', async ({
  page
}) => {
  const criticalRadixWarnings: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'warning') return;
    const text = msg.text();
    if (
      text.includes('DialogContent requires a DialogTitle')
      || text.includes('Missing `Description`')
      || text.includes('aria-describedby')
    ) {
      criticalRadixWarnings.push(text);
    }
  });

  await login(page);
  await openClientsTab(page);

  await expect(page.getByTestId('clients-toolbar')).toBeVisible();
  await expect(page.getByTestId('clients-toolbar-search')).toBeVisible();

  const viewModeTabs = page.getByTestId('clients-toolbar-view-mode');
  const clientsModeTab = viewModeTabs.getByRole('tab', { name: /clients/i });
  const prospectsModeTab = viewModeTabs.getByRole('tab', { name: /prospects/i });
  await clientsModeTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(prospectsModeTab).toHaveAttribute('data-state', 'active');
  await page.keyboard.press('ArrowLeft');
  await expect(clientsModeTab).toHaveAttribute('data-state', 'active');

  const firstClientRow = page.locator('[data-testid^="clients-list-row-"]').first();
  if (await firstClientRow.count()) {
    await firstClientRow.click();
    await expect(firstClientRow).toHaveAttribute('data-state', 'selected');
    await expect(page.getByTestId('clients-detail-pane')).toBeVisible();
  }

  for (const viewport of CLIENTS_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openClientsTab(page);

    const metrics = await page.evaluate(() => {
      const toolbar = document.querySelector<HTMLElement>('[data-testid="clients-toolbar"]');
      const listPane = document.querySelector<HTMLElement>('[data-testid="clients-list-pane"]');
      const detailPane = document.querySelector<HTMLElement>('[data-testid="clients-detail-pane"]');
      const clientsList = document.querySelector<HTMLElement>('[data-testid="clients-list"]');
      const prospectsList = document.querySelector<HTMLElement>('[data-testid="prospects-list"]');
      const activeList = clientsList ?? prospectsList;

      return {
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        toolbarHasHorizontalOverflow: toolbar ? toolbar.scrollWidth > toolbar.clientWidth : false,
        listPaneHasHorizontalOverflow: listPane ? listPane.scrollWidth > listPane.clientWidth : false,
        detailPaneHasHorizontalOverflow: detailPane ? detailPane.scrollWidth > detailPane.clientWidth : false,
        listHasHorizontalOverflow: activeList ? activeList.scrollWidth > activeList.clientWidth : false
      };
    });

    expect(metrics.documentHasHorizontalOverflow).toBe(false);
    expect(metrics.toolbarHasHorizontalOverflow).toBe(false);
    expect(metrics.listPaneHasHorizontalOverflow).toBe(false);
    expect(metrics.detailPaneHasHorizontalOverflow).toBe(false);
    expect(metrics.listHasHorizontalOverflow).toBe(false);
  }

  expect(criticalRadixWarnings).toEqual([]);
});

test('P05 - deep focus client depuis la recherche globale', async ({ page }) => {
  await setupDeepFocusFixture(page);
  await login(page);
  await openClientsTab(page);

  await page.keyboard.press('Control+k');
  const searchInput = page.getByTestId('app-search-input');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('P05_DEEP_FOCUS_CLIENT');

  const clientId = 'entity-p05-deep-focus';
  const searchResult = page.getByTestId(`app-search-client-${clientId}`);
  await expect(searchResult).toBeVisible();
  await searchResult.click();

  await openClientsTab(page);
  await expect(page.getByTestId(`clients-list-row-${clientId}`)).toHaveAttribute('data-state', 'selected');
});

test('P05 - etat erreur utilisateur sur la liste clients', async ({ page }) => {
  await login(page);

  await page.route('**/rest/v1/entities*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Erreur backend P05' })
    });
  });

  await openClientsTab(page);
  const errorMessage = page.getByText(/la liste clients est indisponible/i);
  await expect(errorMessage).toBeVisible();
  await page.getByRole('button', { name: /reessayer/i }).click();
  await expect(errorMessage).toBeVisible();
});
