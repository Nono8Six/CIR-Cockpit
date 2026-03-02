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
  const tab = page.getByRole('tab', { name: /saisie/i });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
  await expect(page.getByTestId('cockpit-form-shell')).toBeVisible();
};

const selectClientAndContact = async (
  page: Page,
  payload: { firstName: string; lastName: string; email: string }
): Promise<void> => {
  const leftPane = page.getByTestId('cockpit-left-pane');

  const relationGroup = leftPane.getByTestId('cockpit-relation-group');
  const clientRadio = relationGroup.getByRole('radio', { name: /client/i });
  await clientRadio.click();
  await expect(clientRadio).toBeChecked();

  const firstRecentEntity = leftPane
    .getByTestId('interaction-search-recents-row')
    .locator('button')
    .first();
  await expect(firstRecentEntity).toBeVisible();
  await firstRecentEntity.click();

  await leftPane.getByRole('button', { name: /ajouter un contact/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Prenom').fill(payload.firstName);
  await dialog.getByLabel('Nom', { exact: true }).fill(payload.lastName);
  await dialog.getByLabel('Email').fill(payload.email);
  await dialog.getByRole('button', { name: /^ajouter$/i }).click();
  await expect(dialog).toHaveCount(0);

  const selectedContactChangeButton = leftPane.getByRole('button', { name: /changer/i });
  if (await selectedContactChangeButton.isVisible().catch(() => false)) {
    return;
  }

  const contactTrigger = leftPane.getByLabel('Selectionner un contact');
  if (!await contactTrigger.isVisible().catch(() => false)) {
    return;
  }
  await contactTrigger.click();

  const options = page.locator('[role="option"]');
  const optionCount = await options.count();
  if (optionCount < 2) {
    return;
  }

  const preferredOption = options
    .filter({ hasText: new RegExp(payload.lastName, 'i') })
    .first();

  if (await preferredOption.isVisible().catch(() => false)) {
    await preferredOption.click();
    return;
  }

  const fallbackOption = options.nth(1);
  await expect(fallbackOption).toBeVisible();
  await fallbackOption.click();
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

  const resetButton = page.getByRole('button', { name: /effacer le formulaire/i });
  if (await resetButton.isVisible().catch(() => false)) {
    await resetButton.click();
  }

  await selectClientAndContact(page, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email
  });

  await page.getByLabel('Sujet et technique').fill('');
  await page.getByLabel('Sujet et technique').fill(payload.subject);
};

const submitInteraction = async (page: Page): Promise<void> => {
  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/functions/v1/api/trpc/data.interactions')
      && response.request().method() === 'POST',
    { timeout: 60000 }
  );

  const submitButton = page.getByTestId('cockpit-submit-button');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  const saveResponse = await saveResponsePromise;
  expect(saveResponse.status()).toBe(200);
  await expect(page.getByLabel('Sujet et technique')).toHaveValue('', { timeout: 15000 });
};

const waitForDraftSave = async (page: Page, subject: string): Promise<void> => {
  const response = await page.waitForResponse(
    (candidate) => {
      if (!candidate.url().includes('/rest/v1/interaction_drafts')) return false;
      if (candidate.request().method() !== 'POST') return false;
      if (!candidate.ok()) return false;

      const postData = candidate.request().postData();
      return typeof postData === 'string' && postData.includes(subject);
    },
    { timeout: 60000 }
  );

  expect(response.ok()).toBeTruthy();
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
  const draftSaveResponsePromise = waitForDraftSave(page, subject);

  await fillCockpitMinimum(page, {
    firstName: `Prenom${suffix}`,
    lastName: `Nom${suffix}`,
    subject,
    email: `e2e.cockpit.draft.${suffix}@example.test`
  });

  await draftSaveResponsePromise;
  await page.reload();
  await openCockpitTab(page);
  await expect(page.getByLabel('Sujet et technique')).toHaveValue(subject, { timeout: 20000 });
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
  await expect(page.getByLabel('Sujet et technique')).toHaveValue('');
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

  const dashboardTab = page.getByRole('tab', { name: /pilotage/i });
  await dashboardTab.click();
  await expect(dashboardTab).toHaveAttribute('data-state', 'active');
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
