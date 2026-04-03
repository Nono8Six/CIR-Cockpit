import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);
const SKIP_REASON = 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD';

const agencyId = '11111111-1111-1111-1111-111111111111';
const prospectId = '22222222-2222-4222-8222-222222222222';
const seaId = '33333333-3333-4333-8333-333333333333';

const seaRow = {
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
};

const prospectRow = {
  id: prospectId,
  entity_type: 'Particulier prospect',
  client_kind: 'individual',
  client_number: null,
  account_type: null,
  name: 'PONTAC Thierry',
  city: null,
  postal_code: null,
  department: null,
  siret: null,
  siren: null,
  official_name: null,
  agency_id: agencyId,
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-02-03T10:00:00.000Z'
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

const prospectRecord = {
  id: prospectId,
  entity_type: 'Particulier prospect',
  client_kind: 'individual',
  client_number: null,
  account_type: null,
  name: 'PONTAC Thierry',
  address: null,
  postal_code: null,
  department: null,
  city: null,
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

const installDirectoryMocks = async (page: Page): Promise<void> => {
  await page.route('**/functions/v1/api/trpc/**', async (route) => {
    const url = new URL(route.request().url());
    const procedurePath = url.pathname.split('/functions/v1/api/trpc/')[1] ?? url.pathname.split('/trpc/')[1] ?? '';
    const procedures = procedurePath.split(',').filter(Boolean);
    const input = url.searchParams.get('input') ?? '';
    const normalizedInput = input.toUpperCase();

    const rows = normalizedInput.includes('PONTAC')
      ? [prospectRow]
      : normalizedInput.includes('SEA')
        ? [seaRow]
        : [prospectRow, seaRow];

    const responses = procedures.map((procedure) => {
      switch (procedure) {
        case 'directory.list':
          return buildTrpcEnvelope({
            request_id: 'req-directory-list',
            ok: true,
            rows,
            total: rows.length,
            page: 1,
            page_size: 50
          });
        case 'directory.saved-views.list':
          return buildTrpcEnvelope({
            request_id: 'req-directory-saved-views',
            ok: true,
            views: []
          });
        case 'directory.options':
          return buildTrpcEnvelope({
            request_id: 'req-directory-options',
            ok: true,
            agencies: [{ id: agencyId, name: 'CIR Bordeaux' }],
            commercials: [],
            departments: ['33']
          });
        case 'directory.record':
          return buildTrpcEnvelope({
            request_id: 'req-directory-record',
            ok: true,
            record: input.includes(prospectId) ? prospectRecord : seaRecord
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

  await page.route('**/rest/v1/entity_contacts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
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

const openDirectory = async (page: Page): Promise<void> => {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: /clients et prospects/i })).toBeVisible();
};

test.skip(!isConfigured, SKIP_REASON);

test('annuaire full page: creation et edition restent accessibles sans perdre le contexte liste', async ({
  page
}) => {
  await installDirectoryMocks(page);
  await login(page);
  await openDirectory(page);

  const searchInput = page.getByRole('textbox', { name: /recherche annuaire/i });
  await searchInput.fill('SEA');
  await searchInput.press('Enter');
  await page.waitForURL(/(?:\?|&)q=SEA/i);

  const filteredListUrl = page.url();

  await page.getByRole('button', { name: /nouvelle fiche/i }).click();
  await expect(page).toHaveURL(/\/clients\/new(?:\?|$)/);
  await expect(page.getByRole('button', { name: /retour aux resultats/i })).toBeVisible();
  await expect(page.getByText(/type de profil/i).first()).toBeVisible();

  await page.getByRole('button', { name: /retour aux resultats/i }).click();
  await expect(page).toHaveURL(filteredListUrl);
  await expect(searchInput).toHaveValue('SEA');

  await page.getByRole('button', { name: /ouvrir la fiche sea/i }).click();
  await expect(page).toHaveURL(/\/clients\/116277(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /^SEA$/i })).toBeVisible();

  await page.getByRole('button', { name: /^modifier$/i }).click();
  const editDialog = page.getByRole('dialog', { name: /modifier un client/i });
  await expect(editDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editDialog).toHaveCount(0);
});

test('annuaire full page: la conversion prospect reste un parcours dedie', async ({ page }) => {
  await installDirectoryMocks(page);
  await login(page);

  await page.goto(`/clients/prospects/${prospectId}?q=PONTAC`);
  await expect(page).toHaveURL(new RegExp(`/clients/prospects/${prospectId}(?:\\?|$)`));
  await expect(page.getByRole('heading', { name: /^PONTAC Thierry$/i })).toBeVisible();

  await page.getByRole('button', { name: /convertir en client/i }).click();
  await expect(page).toHaveURL(new RegExp(`/clients/prospects/${prospectId}/convert(?:\\?|$)`));
  await expect(page.getByRole('button', { name: /retour au prospect/i })).toBeVisible();

  await page.getByRole('button', { name: /retour au prospect/i }).click();
  await expect(page).toHaveURL(new RegExp(`/clients/prospects/${prospectId}(?:\\?|$)`));
  await expect(page).toHaveURL(/(?:\?|&)q=PONTAC/i);
  await expect(page.getByRole('heading', { name: /^PONTAC Thierry$/i })).toBeVisible();
});

