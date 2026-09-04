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
  const currentSubject = await page.getByLabel(/titre/i).inputValue().catch(() => '');
  if (currentSubject && !currentSubject.startsWith('E2E cockpit')) {
    throw new Error(`Le compte E2E porte déjà un brouillon non isolé: ${currentSubject}`);
  }
  const draftDeleted = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && response.request().postData()?.includes('"action":"draft_delete"') === true,
    { timeout: 20000 }
  );
  await resetButton.click();
  expect((await draftDeleted).status()).toBe(200);
  await expect(page.getByRole('heading', { name: /par quel canal avez-vous échangé/i })).toBeVisible({ timeout: 10000 });
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
  const searchResult = page
    .getByRole('region', { name: /rechercher ou créer le tiers/i })
    .getByRole('option', { name: /SEA.*116277/i })
    .first();
  await expect(searchResult).toBeVisible({ timeout: 20000 });
  await searchResult.click();
  await expect(page.getByRole('button', { name: /tiers SEA/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: /avec qui avez-vous échangé/i })).toBeVisible({ timeout: 20000 });
  const contact = page.getByRole('button').filter({ hasText: /Kévin CHAUCHET|E2E_Prenom/ }).first();
  await expect(contact).toBeVisible({ timeout: 20000 });
  await contact.click();
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
  const firstFamily = page.getByRole('button', { name: /^MOTORISATION$/i }).first();
  if (await firstFamily.isVisible().catch(() => false)) {
    await firstFamily.click();
    if ((await firstFamily.getAttribute('aria-pressed').catch(() => null)) !== 'true') {
      await firstFamily.press(' ');
    }
    await expect(firstFamily).toHaveAttribute('aria-pressed', 'true');
  }
};

const validationButton = (page: Page) =>
  page.locator('button:has-text("Enregistrer")').last();

const submitInteraction = async (page: Page): Promise<void> => {
  const continueButton = page.getByRole('button', { name: /^continuer/i }).first();
  if (await continueButton.isEnabled().catch(() => false)) {
    await continueButton.click();
  }
  await expect(validationButton(page)).toBeVisible({ timeout: 10_000 });

  const [saveResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/trpc/data.interactions')
        && response.request().method() === 'POST',
      { timeout: 60000 }
    ),
    page.keyboard.press('Control+Enter')
  ]);
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

  await expect(validationButton(page)).toBeEnabled();
  await resetCockpitForm(page);
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
  const resumedSubject = `${subject} repris`;
  const draftSaved = page.waitForRequest(
    (request) => request.method() === 'POST'
      && request.postData()?.includes(resumedSubject) === true,
    { timeout: 20000 }
  );
  await page.getByLabel(/titre/i).fill(resumedSubject);
  const draftRequest = await draftSaved;
  expect((await draftRequest.response())?.status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId('cockpit-form-shell')).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /tiers SEA/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel(/titre/i)).toHaveValue(resumedSubject, { timeout: 20000 });
  await resetCockpitForm(page);
});

test('detail canonique Activity v2 visible depuis le pilotage', async ({ page }) => {
  await ensureLoggedIn(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /vue d'ensemble/i })).toBeVisible({ timeout: 20000 });

  await page
    .getByRole('region', { name: /dossiers à traiter/i })
    .getByRole('button', { name: /^ouvrir /i })
    .first()
    .click();
  await expect(page.getByTestId('dashboard-details-dialog')).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('region', { name: /données canoniques de l’activité/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/événement\(s\).*correction\(s\).*pièce\(s\) jointe\(s\)/i)).toBeVisible();
});

test.skip("soumettre l'interaction depuis le cockpit", async ({ page }) => {
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

test.skip('interaction soumise visible dans la timeline', async ({ page }) => {
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

  await expect(page.getByTestId('dashboard-details-dialog')).toBeVisible();
  await expect(page.getByText(/dossier cree|dossier créé/i)).toBeVisible();
  await page.getByRole('button', { name: /fermer le détail/i }).click();
  await expect(page.getByTestId('dashboard-details-dialog')).toHaveCount(0);
});
