import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);
const SKIP_REASON = 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD';

const agencyId = '11111111-1111-1111-1111-111111111111';
const prospectId = '22222222-2222-4222-8222-222222222222';
const seaId = '33333333-3333-4333-8333-333333333333';
const cashId = '44444444-4444-4444-8444-444444444444';

const listRows = [
  {
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
  },
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
  },
  {
    id: cashId,
    entity_type: 'Client',
    client_kind: 'company',
    client_number: '98568547',
    account_type: 'cash',
    name: 'Test comptant',
    city: 'Merignac',
    postal_code: '33700',
    department: '33',
    siret: null,
    siren: null,
    official_name: null,
    agency_id: agencyId,
    agency_name: 'CIR Bordeaux',
    cir_commercial_id: null,
    cir_commercial_name: null,
    archived_at: null,
    updated_at: '2026-02-02T10:00:00.000Z'
  }
] as const;

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

const cashRecord = {
  id: cashId,
  entity_type: 'Client',
  client_kind: 'company',
  client_number: '98568547',
  account_type: 'cash',
  name: 'Test comptant',
  address: '1 RUE BOBARD',
  postal_code: '33700',
  department: '33',
  city: 'Merignac',
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
  created_at: '2026-02-02T10:00:00.000Z',
  updated_at: '2026-02-02T10:00:00.000Z'
};

const buildTrpcEnvelope = (data: unknown) => ({ result: { data } });

const installDirectoryMocks = async (page: Page): Promise<void> => {
  await page.route('**/functions/v1/api/trpc/**', async (route) => {
    const url = new URL(route.request().url());
    const procedurePath = url.pathname.split('/functions/v1/api/trpc/')[1] ?? url.pathname.split('/trpc/')[1] ?? '';
    const procedures = procedurePath.split(',').filter(Boolean);
    const input = url.searchParams.get('input') ?? '';
    const hasListContext = /SEA/i.test(input);

    const responses = procedures.map((procedure) => {
      switch (procedure) {
        case 'directory.list':
          return buildTrpcEnvelope({
            request_id: 'req-directory-list',
            ok: true,
            rows: hasListContext ? listRows : [],
            total: hasListContext ? listRows.length : 0,
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
            record: input.includes('98568547') ? cashRecord : seaRecord
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

test('P05 - la fiche full page conserve le contexte liste et le prev-next remplace l historique', async ({
  page
}) => {
  await installDirectoryMocks(page);
  await login(page);
  await openDirectory(page);

  const searchInput = page.getByRole('textbox', { name: /recherche annuaire/i });
  await searchInput.fill('SEA');
  await searchInput.press('Enter');
  await page.waitForURL(/(?:\?|&)q=SEA/i);

  const listUrl = page.url();
  await expect(page.getByRole('button', { name: /ouvrir la fiche pontac thierry/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /ouvrir la fiche sea/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /ouvrir la fiche test comptant/i })).toBeVisible();

  await page.getByRole('button', { name: /ouvrir la fiche sea/i }).click();

  await expect(page).toHaveURL(/\/clients\/116277(?:\?|$)/);
  await expect(page).toHaveURL(/(?:\?|&)q=SEA/i);
  await expect(page.getByRole('heading', { name: /^SEA$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /clients et prospects/i })).toHaveCount(0);

  const detailPathWithoutContext = new URL(page.url()).pathname;
  const previousButton = page.getByRole('button', { name: /Fiche pr.c.dente/i });
  const nextButton = page.getByRole('button', { name: 'Fiche suivante' });

  await expect(previousButton).toBeVisible();
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeVisible();
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(page).toHaveURL(/\/clients\/98568547(?:\?|$)/);
  await expect(page).toHaveURL(/(?:\?|&)q=SEA/i);
  await expect(page.getByRole('heading', { name: /^Test comptant$/i })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(listUrl);
  await expect(page.getByRole('heading', { name: /clients et prospects/i })).toBeVisible();

  await page.goto(detailPathWithoutContext);
  await expect(page.getByRole('heading', { name: /^SEA$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fiche pr.c.dente/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Fiche suivante' })).toHaveCount(0);
});


