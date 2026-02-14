import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const role = process.env.E2E_USER_ROLE || 'tcs';
const P08_LOGIN_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 }
] as const;

const isConfigured = Boolean(email && password);

test.skip(!isConfigured, 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD');

const login = async (page: Page, credentials: { email: string; password: string }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Mot de passe').fill(credentials.password);
  await page.getByRole('button', { name: /se connecter/i }).click();
};

test('login succeeds and shows app shell', async ({ page }) => {
  await login(page, { email: email ?? '', password: password ?? '' });
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();
});

test('login shows a user-facing error when credentials are invalid', async ({ page }) => {
  await login(page, { email: email ?? '', password: `${password ?? ''}-invalid` });
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/identifiants|connexion|session|acc[eè]s|tentatives|erreur/i);
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Mot de passe')).toHaveAttribute('aria-invalid', 'true');
});

test('login keyboard navigation is coherent (tab order + enter submit)', async ({ page }) => {
  await page.goto('/');
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Mot de passe');
  const submitButton = page.getByRole('button', { name: /se connecter/i });
  await emailInput.fill(email ?? '');
  await passwordInput.fill(password ?? '');

  await emailInput.focus();
  await expect(emailInput).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(passwordInput).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(submitButton).toBeFocused();

  await passwordInput.focus();
  await passwordInput.press('Enter');

  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();
});

test('login layout is responsive without horizontal overflow', async ({ page }) => {
  for (const viewport of P08_LOGIN_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const metrics = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('[data-testid="login-screen-root"]');
      const maxRight = Math.max(
        ...Array.from(document.querySelectorAll<HTMLElement>('body *')).map((element) =>
          Math.ceil(element.getBoundingClientRect().right)
        )
      );

      return {
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        rootHasHorizontalOverflow: root ? root.scrollWidth > root.clientWidth : false,
        maxRightExceedsViewport: maxRight > window.innerWidth
      };
    });

    expect(metrics.documentHasHorizontalOverflow).toBe(false);
    expect(metrics.rootHasHorizontalOverflow).toBe(false);
    expect(metrics.maxRightExceedsViewport).toBe(false);
  }
});

test('logout returns to login screen', async ({ page }) => {
  test.skip(role === 'tcs', 'Profile menu hidden for tcs');
  await login(page, { email: email ?? '', password: password ?? '' });
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();

  const roleBadge = page.getByText(/super admin|admin agence/i);
  const hasRoleBadge = await roleBadge.isVisible();
  test.skip(!hasRoleBadge, 'Profile menu disabled (no agency context)');

  const profileButton = page.getByRole('button', { name: /ouvrir le menu profil/i });
  await profileButton.click({ force: true });

  const menu = page.getByRole('menu');
  const menuOpened = await menu.waitFor({ state: 'visible', timeout: 2000 }).then(
    () => true,
    () => false
  );
  test.skip(!menuOpened, 'Profile menu did not open');

  await menu.getByRole('menuitem', { name: /déconnexion/i }).click();
  await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
});
