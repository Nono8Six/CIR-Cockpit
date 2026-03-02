import { expect, test, type Locator, type Page } from '@playwright/test';

import { ensureE2eUser } from './helpers/backend-fixtures';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const isConfigured = Boolean(adminEmail && adminPassword);
const SKIP_REASON = 'E2E env missing: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD';

type CreateUserParams = {
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'agency_admin' | 'tcs';
  password?: string;
  expectGeneratedPassword?: boolean;
};

const uniqueSuffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const loginAsAdmin = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByLabel('Email').fill(adminEmail ?? '');
  await page.getByLabel('Mot de passe').fill(adminPassword ?? '');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByTestId('app-header-tabs-scroll')).toBeVisible();
};

const openAdminUsersPanel = async (page: Page): Promise<void> => {
  const adminTab = page.getByRole('tab', { name: /admin \(f4\)/i });
  await adminTab.click();
  await expect(page.getByTestId('admin-panel')).toBeVisible();
  await page.getByTestId('admin-tab-users').click();
  await expect(page.getByTestId('admin-users-panel')).toBeVisible();
};

const openCreateDialog = async (page: Page): Promise<void> => {
  await page.getByTestId('admin-users-create-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/creer un utilisateur/i)).toBeVisible();
};

const selectRole = async (page: Page, role: CreateUserParams['role']): Promise<void> => {
  const trigger = page.getByRole('combobox', { name: /role/i });
  await trigger.click();
  const roleLabel =
    role === 'super_admin' ? /super admin/i : role === 'agency_admin' ? /admin agence/i : /^tcs$/i;
  await page.getByRole('option', { name: roleLabel }).click();
};

const selectFirstAgency = async (page: Page): Promise<void> => {
  await page.locator('#create-user-agencies-trigger').click();
  const agencyItems = page.locator('[cmdk-item]');
  await expect(agencyItems.first()).toBeVisible();
  await agencyItems.first().click();
  await page.keyboard.press('Escape');
};

const extractTemporaryPassword = async (dialog: Locator): Promise<string> => {
  const value = (await dialog.locator('.font-mono').first().textContent())?.trim() ?? '';
  return value;
};

const createUser = async (
  page: Page,
  params: CreateUserParams
): Promise<{ generatedPassword?: string }> => {
  const createDialog = page.getByRole('dialog', { name: /creer un utilisateur/i });
  await openCreateDialog(page);
  await page.locator('#create-user-email').fill(params.email);
  await page.locator('#create-user-last-name').fill(params.lastName);
  await page.locator('#create-user-first-name').fill(params.firstName);
  await selectRole(page, params.role);

  if (params.password) {
    await page.locator('#user-create-temp-password').fill(params.password);
  }

  if (params.role === 'tcs') {
    await selectFirstAgency(page);
  }

  const submitButton = createDialog.getByRole('button', { name: /^creer$/i });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  if (!params.expectGeneratedPassword) {
    if ((await createDialog.count()) > 0) {
      const cancelButton = createDialog.getByRole('button', { name: /annuler/i });
      if ((await cancelButton.count()) > 0) {
        await cancelButton.click();
      }
    }
    return {};
  }

  const passwordDialog = page
    .getByRole('dialog')
    .filter({ hasText: /mot de passe temporaire/i });
  await expect(passwordDialog).toBeVisible();
  const generatedPassword = await extractTemporaryPassword(passwordDialog);
  await passwordDialog.getByRole('button', { name: /fermer/i }).click();
  await expect(passwordDialog).toHaveCount(0);

  return { generatedPassword };
};

const findUserCardByEmail = (page: Page, email: string): Locator =>
  page.locator('[data-testid^="admin-user-card-"]').filter({ hasText: email }).first();

test.skip(!isConfigured, SKIP_REASON);

test('super admin cree un utilisateur avec role tcs', async ({ page }) => {
  const userEmail = `e2e-admin-create-${uniqueSuffix()}@cir.invalid`;
  const userPassword = `Tmp#${Date.now()}A1`;

  await loginAsAdmin(page);
  await openAdminUsersPanel(page);
  await createUser(page, {
    email: userEmail,
    firstName: 'E2E',
    lastName: 'CreateTcs',
    role: 'tcs',
    password: userPassword
  });

  const card = findUserCardByEmail(page, userEmail);
  await expect(card).toBeVisible();
  await expect(card).toContainText(userEmail);
});

test("email duplique rejete a la creation d'utilisateur", async ({ page }) => {
  const userEmail = `e2e-admin-duplicate-${uniqueSuffix()}@cir.invalid`;
  const userPassword = `Dup#${Date.now()}A1`;

  await loginAsAdmin(page);
  await openAdminUsersPanel(page);

  await ensureE2eUser({
    email: userEmail,
    password: userPassword,
    firstName: 'E2E',
    lastName: 'Duplicate',
    mustChangePassword: false,
    role: 'tcs'
  });

  await openCreateDialog(page);
  await page.locator('#create-user-email').fill(userEmail);
  await page.locator('#create-user-last-name').fill('Duplicate');
  await page.locator('#create-user-first-name').fill('Bis');
  await selectRole(page, 'tcs');
  await selectFirstAgency(page);
  await page.getByRole('button', { name: /^creer$/i }).click();

  const duplicateMessage = page.getByText(/deja utilise|déjà utilisé|déjà utilise|existe deja|existe déjà/i);
  if ((await duplicateMessage.count()) > 0) {
    await expect(duplicateMessage.first()).toBeVisible();
  }

  const searchInput = page.getByTestId('admin-users-search-input');
  await searchInput.fill(userEmail);
  await expect(page.locator('[data-testid^="admin-user-card-"]').filter({ hasText: userEmail })).toHaveCount(1);
});

test('mot de passe genere conforme a la politique', async ({ page }) => {
  const userEmail = `e2e-admin-generated-${uniqueSuffix()}@cir.invalid`;

  await loginAsAdmin(page);
  await openAdminUsersPanel(page);

  const created = await createUser(page, {
    email: userEmail,
    firstName: 'E2E',
    lastName: 'Generated',
    role: 'tcs',
    expectGeneratedPassword: true
  });

  const generatedPassword = created.generatedPassword ?? '';
  expect(generatedPassword.length).toBeGreaterThanOrEqual(8);
  expect(/\d/.test(generatedPassword)).toBe(true);
  expect(/[^a-zA-Z0-9]/.test(generatedPassword)).toBe(true);
});

test('utilisateur visible dans la liste apres creation', async ({ page }) => {
  const userEmail = `e2e-admin-visible-${uniqueSuffix()}@cir.invalid`;

  await loginAsAdmin(page);
  await openAdminUsersPanel(page);

  await createUser(page, {
    email: userEmail,
    firstName: 'E2E',
    lastName: 'Visible',
    role: 'tcs',
    password: `Vis#${Date.now()}A1`
  });

  const searchInput = page.getByTestId('admin-users-search-input');
  await searchInput.fill(userEmail);
  await expect(findUserCardByEmail(page, userEmail)).toBeVisible();
});
