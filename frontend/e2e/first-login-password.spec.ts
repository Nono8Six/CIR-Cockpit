import { expect, test, type Page } from '@playwright/test';

import { deleteE2eUserByEmail, ensureE2eUser } from './helpers/backend-fixtures';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const isConfigured = Boolean(adminEmail && adminPassword);
const SKIP_REASON = 'E2E env missing: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD';

type RuntimeUser = {
  email: string;
  password: string;
};

const uniqueSuffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const RATE_LIMIT_WAIT_MS = 65_000;
const MAX_RATE_LIMIT_RETRIES = 2;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitError = (error: unknown): boolean =>
  error instanceof Error && /trop de requetes/i.test(error.message);

const withRateLimitRetry = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw error;
      }
      attempt += 1;
      await wait(RATE_LIMIT_WAIT_MS);
    }
  }
};

const loginWithCredentials = async (
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> => {
  await page.goto('/');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Mot de passe').fill(credentials.password);
  await page.getByRole('button', { name: /se connecter/i }).click();
};

const resetAuthState = async (page: Page): Promise<void> => {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
};

const createFirstLoginUser = async (): Promise<RuntimeUser> => {
  const suffix = uniqueSuffix();
  const runtimeUser = {
    email: `e2e-first-login-${suffix}@cir.invalid`,
    password: `Init#${Date.now()}A1`
  };

  await withRateLimitRetry(async () => {
    await ensureE2eUser({
      email: runtimeUser.email,
      password: runtimeUser.password,
      firstName: 'E2E',
      lastName: 'FirstLogin',
      role: 'tcs',
      mustChangePassword: true
    });
  });

  return runtimeUser;
};

const deleteUserByEmail = async (email: string): Promise<void> => {
  await deleteE2eUserByEmail(email);
};

const cleanupUserByEmail = async (email: string): Promise<void> => {
  try {
    await deleteUserByEmail(email);
  } catch (error) {
    if (error instanceof Error && /trop de requetes/i.test(error.message)) {
      return;
    }
    throw error;
  }
};

const expectMandatoryPasswordScreen = async (page: Page): Promise<void> => {
  await expect(page.getByRole('button', { name: /mettre a jour le mot de passe/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toHaveCount(0);
};

test.skip(!isConfigured, SKIP_REASON);

test.describe('first login password flow', () => {
  let guardUser: RuntimeUser | null = null;
  let validPasswordUser: RuntimeUser | null = null;

  test.beforeAll(async () => {
    guardUser = await createFirstLoginUser();
    validPasswordUser = await createFirstLoginUser();
  });

  test.afterAll(async () => {
    if (guardUser) {
      await cleanupUserByEmail(guardUser.email);
      guardUser = null;
    }
    if (validPasswordUser) {
      await cleanupUserByEmail(validPasswordUser.email);
      validPasswordUser = null;
    }
  });

  test.beforeEach(async ({ page }) => {
    expect(guardUser).not.toBeNull();
    if (!guardUser) return;
    await resetAuthState(page);
    await loginWithCredentials(page, guardUser);
    await expectMandatoryPasswordScreen(page);
  });

  test('utilisateur must_change_password redirige vers ecran de changement', async ({
    page
  }) => {
    await expectMandatoryPasswordScreen(page);
  });

  test('mot de passe faible rejete', async ({ page }) => {
    await page.getByLabel(/nouveau mot de passe/i).fill('abc');
    await page.getByLabel(/confirmer le mot de passe/i).fill('abc');
    const submitButton = page.getByRole('button', { name: /mettre a jour le mot de passe/i });
    await expect(submitButton).toBeDisabled();

    await expect(page.getByText(/au moins 8 caracteres/i).first()).toBeVisible();
    await expectMandatoryPasswordScreen(page);
  });

  test('mot de passe valide redirige vers dashboard/app shell', async ({ page }) => {
    expect(validPasswordUser).not.toBeNull();
    if (!validPasswordUser) return;

    await resetAuthState(page);
    await loginWithCredentials(page, validPasswordUser);
    await expectMandatoryPasswordScreen(page);

    const nextPassword = `Valid#${Date.now()}A1`;
    await page.getByLabel(/nouveau mot de passe/i).fill(nextPassword);
    await page.getByLabel(/confirmer le mot de passe/i).fill(nextPassword);
    await page.getByRole('button', { name: /mettre a jour le mot de passe/i }).click();

    await expect(
      page.getByRole('heading', { name: /changement de mot de passe obligatoire/i })
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();
  });

  test('retour impossible sans changement de mot de passe', async ({ page }) => {
    await page.keyboard.press('F2');
    await expectMandatoryPasswordScreen(page);

    await page.keyboard.press('F5');
    await expectMandatoryPasswordScreen(page);
  });
});
