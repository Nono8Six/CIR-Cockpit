import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);
const SKIP_REASON = 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD';

const SEARCH_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 }
];

const agencyId = '11111111-1111-1111-1111-111111111111';
const seaId = '33333333-3333-4333-8333-333333333333';

const seaEntity = {
  id: seaId,
  entity_type: 'Client',
  client_kind: 'company',
  client_number: '116277',
  account_type: 'term',
  name: 'SEA',
  address: '6 CHEMIN DU SOLARIUM',
  postal_code: '33170',
  department: '33',
  city: 'GRADIGNAN',
  country: 'France',
  siret: null,
  notes: null,
  agency_id: agencyId,
  cir_commercial_id: null,
  archived_at: null,
  created_at: '2026-02-03T10:00:00.000Z',
  updated_at: '2026-02-03T10:00:00.000Z',
  siren: null,
  naf_code: null,
  official_name: null,
  official_data_source: null,
  official_data_synced_at: null
};

const seaRecord = {
  id: seaId,
  entity_type: 'Client',
  client_kind: 'company',
  client_number: '116277',
  account_type: 'term',
  name: 'SEA',
  address: '6 CHEMIN DU SOLARIUM',
  postal_code: '33170',
  department: '33',
  city: 'GRADIGNAN',
  country: 'France',
  siret: null,
  siren: null,
  naf_code: null,
  official_name: null,
  official_data_source: null,
  official_data_synced_at: null,
  notes: null,
  agency_id: agencyId,
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  created_at: '2026-02-03T10:00:00.000Z',
  updated_at: '2026-02-03T10:00:00.000Z'
};

const buildTrpcEnvelope = (data: unknown) => ({ result: { data } });

const installQuickSearchMocks = async (page: Page): Promise<void> => {
  await page.route('**/rest/v1/entities*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([seaEntity])
    });
  });

  await page.route('**/rest/v1/entity_contacts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await page.route('**/functions/v1/api/trpc/**', async (route) => {
    const url = new URL(route.request().url());
    const procedurePath = url.pathname.split('/functions/v1/api/trpc/')[1] ?? url.pathname.split('/trpc/')[1] ?? '';
    const procedures = procedurePath.split(',').filter(Boolean);
    const input = url.searchParams.get('input') ?? '';

    const responses = procedures.map((procedure) => {
      switch (procedure) {
        case 'directory.record':
          return buildTrpcEnvelope({
            request_id: 'req-directory-record',
            ok: true,
            record: seaRecord
          });
        case 'directory.list':
          return buildTrpcEnvelope({
            request_id: 'req-directory-list',
            ok: true,
            rows: input.includes('SEA') ? [
              {
                id: seaId,
                entity_type: 'Client',
                client_kind: 'company',
                client_number: '116277',
                account_type: 'term',
                name: 'SEA',
                city: 'GRADIGNAN',
                postal_code: '33170',
                department: '33',
                siret: null,
                siren: null,
                official_name: null,
                agency_id: agencyId,
                agency_name: 'CIR Bordeaux',
                cir_commercial_id: null,
                cir_commercial_name: null,
                archived_at: null,
                updated_at: '2026-02-03T10:00:00.000Z'
              }
            ] : [],
            total: input.includes('SEA') ? 1 : 0,
            page: 1,
            page_size: 50
          });
        case 'directory.options':
          return buildTrpcEnvelope({
            request_id: 'req-directory-options',
            ok: true,
            agencies: [{ id: agencyId, name: 'CIR Bordeaux' }],
            commercials: [],
            departments: ['33']
          });
        case 'directory.saved-views.list':
          return buildTrpcEnvelope({
            request_id: 'req-directory-saved-views',
            ok: true,
            views: []
          });
        default:
          return null;
      }
    });

    if (responses.some((response) => response === null)) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responses)
    });
  });

  await page.route('**/rest/v1/agencies*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: agencyId, name: 'CIR Bordeaux', archived_at: null }])
    });
  });
};

const login = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email ?? '');
  await page.getByLabel('Mot de passe').fill(password ?? '');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('button', { name: /ouvrir la recherche rapide/i })).toBeVisible();
};

test.skip(!isConfigured, SKIP_REASON);

test('global search opens a full-page client record and remains responsive', async ({ page }) => {
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

  await installQuickSearchMocks(page);
  await login(page);

  await page.getByRole('button', { name: /ouvrir la recherche rapide/i }).click();
  const searchInput = page.getByTestId('app-search-input');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('SEA');

  const seaResult = page.getByTestId(`app-search-client-${seaId}`);
  await expect(seaResult).toBeVisible();
  await seaResult.click();

  await expect(searchInput).toHaveCount(0);
  await expect(page).toHaveURL(/\/clients\/116277(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /^SEA$/i })).toBeVisible();

  await page.getByRole('button', { name: /ouvrir la recherche rapide/i }).click();
  await expect(page.getByTestId('app-search-input')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('app-search-input')).toHaveCount(0);

  for (const viewport of SEARCH_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: /ouvrir la recherche rapide/i }).click();
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

  await page.getByRole('button', { name: /ouvrir la recherche rapide/i }).click();
  const errorMessage = page.getByText(/recherche indisponible\.\s*veuillez reessayer\./i).first();
  await expect(errorMessage).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /reessayer/i }).click();
  await expect(errorMessage).toBeVisible({ timeout: 20_000 });
});


