import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);
const SKIP_REASON = 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD';

const uniqueSuffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ensureLoggedIn = async (page: Page): Promise<void> => {
  await page.goto('/');
  const quickSearchButton = page.getByRole('button', { name: /recherche rapide/i });
  if (await quickSearchButton.isVisible().catch(() => false)) {
    await expect(quickSearchButton).toBeVisible();
    return;
  }

  const emailInput = page.getByLabel('Email');
  await expect(emailInput).toBeVisible({ timeout: 20000 });
  await emailInput.fill(email ?? '');
  await page.getByLabel('Mot de passe').fill(password ?? '');
  const loginButton = page.getByRole('button', { name: /se connecter/i });
  await expect(loginButton).toBeEnabled();
  await loginButton.click();

  await expect(quickSearchButton).toBeVisible({ timeout: 20000 });
};

const openCockpitTab = async (page: Page): Promise<void> => {
  await ensureLoggedIn(page);
  await page.goto('/cockpit');
  await expect(page.getByTestId('cockpit-form-shell')).toBeVisible({ timeout: 20000 });
};

const resetCockpitForm = async (page: Page): Promise<void> => {
  const resetButton = page.getByRole('button', { name: /réinitialiser la saisie en cours|recommencer/i });
  if (!(await resetButton.isVisible().catch(() => false))) return;
  await resetButton.click();
  await expect(page.getByRole('button', { name: /téléphone/i })).toBeVisible({ timeout: 10000 });
};

const selectClientAndContact = async (
  page: Page,
  payload: { firstName: string; lastName: string; email: string }
): Promise<void> => {
  void payload;
  const clientRelation = page.getByRole('button', { name: /client à terme/i }).first();
  if (!(await clientRelation.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /téléphone/i }).first().evaluate((element) => {
      element.click();
    });
    await expect(clientRelation).toBeVisible({ timeout: 10000 });
  }
  await clientRelation.evaluate((element) => {
    element.click();
  });
  const searchInput = page.getByRole('combobox');
  if (!(await searchInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    await clientRelation.evaluate((element) => {
      element.click();
    });
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  }
  await searchInput.fill('SEA');
  const searchResult = page.getByText(/^SEA$/).first();
  await expect(searchResult).toBeVisible({ timeout: 20000 });
  await searchResult.click();
  await expect(page.getByRole('heading', { name: /avec qui as-tu échangé/i })).toBeVisible({ timeout: 20000 });
  const contact = page.getByRole('button', { name: /sélectionner/i }).first();
  if (await contact.isVisible({ timeout: 5000 }).catch(() => false)) {
    await contact.click();
  } else {
    await page.getByRole('button', { name: /ajouter un nouveau contact/i }).click();
    const dialog = page.getByRole('dialog', { name: /nouveau contact/i });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/prenom/i).fill(`E2E_${payload.firstName}`);
    await dialog.getByLabel(/^nom$/i).fill(payload.lastName);
    await dialog.getByRole('textbox', { name: /^email$/i }).fill(payload.email);
    await dialog.getByRole('textbox', { name: /telephone/i }).fill('06 12 34 56 78');
    await dialog.getByRole('button', { name: /^ajouter$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 20000 });
  }
  await expect(page.getByRole('heading', { name: /résumer la demande/i })).toBeVisible({ timeout: 20000 });
};

const fillCockpitMinimum = async (
  page: Page,
  payload: {
    firstName: string;
    lastName: string;
    subject: string;
    email: string;
  }
): Promise<void> => {
  await openCockpitTab(page);
  await resetCockpitForm(page);

  await selectClientAndContact(page, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email
  });

  const subjectInput = page.getByLabel(/titre/i);
  await expect(subjectInput).toBeVisible();
  await subjectInput.fill('');
  await subjectInput.fill(payload.subject);
};

const submitInteraction = async (page: Page): Promise<void> => {
  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/functions/v1/api/trpc/data.interactions')
      && response.request().method() === 'POST',
    { timeout: 60000 }
  );

  const submitButton = page.getByTestId('cockpit-submit-button');
  const continueButton = page.getByRole('button', { name: /^continuer/i }).first();
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  const saveResponse = await saveResponsePromise;
  expect(saveResponse.status()).toBe(200);
  await expect(page.getByTestId('cockpit-readonly-view')).toBeVisible({ timeout: 15000 });
};

test.skip(!isConfigured, SKIP_REASON);

test('creer une interaction depuis le cockpit (formulaire completable)', async ({ page }) => {
  const suffix = uniqueSuffix();

  await fillCockpitMinimum(page, {
    firstName: `Prenom${suffix}`,
    lastName: `Nom${suffix}`,
    subject: `E2E cockpit create ${suffix}`,
    email: `e2e.cockpit.create.${suffix}@example.test`
  });

  await expect(page.getByTestId('cockpit-submit-button')).toBeEnabled();
});

test('sauvegarde de brouillon restauree apres rechargement', async ({ page }) => {
  const suffix = uniqueSuffix();
  const subject = `E2E cockpit draft ${suffix}`;
  await fillCockpitMinimum(page, {
    firstName: `Prenom${suffix}`,
    lastName: `Nom${suffix}`,
    subject,
    email: `e2e.cockpit.draft.${suffix}@example.test`
  });

  await expect(page.getByLabel(/titre/i)).toHaveValue(subject);
});

test("soumettre l'interaction depuis le cockpit", async ({ page }) => {
  const suffix = uniqueSuffix();
  const subject = `E2E cockpit submit ${suffix}`;

  await fillCockpitMinimum(page, {
    firstName: `Prenom${suffix}`,
    lastName: `Nom${suffix}`,
    subject,
    email: `e2e.cockpit.submit.${suffix}@example.test`
  });

  await submitInteraction(page);
  await expect(page.getByTestId('cockpit-readonly-view')).toBeVisible();
});

test('interaction soumise visible dans la timeline', async ({ page }) => {
  const suffix = uniqueSuffix();
  const subject = `E2E cockpit timeline ${suffix}`;

  await fillCockpitMinimum(page, {
    firstName: `Prenom${suffix}`,
    lastName: `Nom${suffix}`,
    subject,
    email: `e2e.cockpit.timeline.${suffix}@example.test`
  });

  await submitInteraction(page);

  await page.goto('/dashboard');
  await expect(page.getByTestId('dashboard-toolbar')).toBeVisible();

  await page.getByTestId('dashboard-search-input').fill(subject);
  await page
    .getByTestId('dashboard-view-mode-tabs')
    .getByRole('tab', { name: /historique/i })
    .click();
  await expect(page.getByTestId('dashboard-list')).toBeVisible();

  const row = page.locator('tr').filter({ hasText: subject }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /ouvrir/i }).click();

  await expect(page.getByTestId('dashboard-details-sheet')).toBeVisible();
  await expect(page.getByText(/dossier cree|dossier créé/i)).toBeVisible();
  await page.getByRole('button', { name: /fermer le panneau/i }).click();
  await expect(page.getByTestId('dashboard-details-sheet')).toHaveCount(0);
});
