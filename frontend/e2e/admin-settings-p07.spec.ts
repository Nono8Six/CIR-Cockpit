import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const isConfigured = Boolean(email && password);

const P07_VIEWPORTS = [
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
  await expect(page.getByTestId('app-header-tabs-scroll')).toBeVisible();
};

const openAdminTab = async (page: Page) => {
  const adminTab = page.getByRole('tab', { name: /admin \(f4\)/i });
  await expect(adminTab).toBeVisible();
  await adminTab.click();
  await expect(adminTab).toHaveAttribute('data-state', 'active');
  await expect(page.getByTestId('admin-panel')).toBeVisible();
};

const openSettingsTab = async (page: Page) => {
  await page.keyboard.press('F3');
  await expect(page.getByTestId('settings-root')).toBeVisible();
};

test.skip(!isConfigured, 'E2E env missing: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD');

test('P07 - Admin/Settings mobile-first, actions, tabs, erreurs et anti-overflow', async ({
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
  await openAdminTab(page);

  const tabsList = page.getByTestId('admin-tabs-list');
  const usersTab = tabsList.getByRole('tab', { name: /utilisateurs/i });
  const agenciesTab = tabsList.getByRole('tab', { name: /agences/i });
  const auditTab = tabsList.getByRole('tab', { name: /audit logs/i });

  await usersTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(agenciesTab).toHaveAttribute('data-state', 'active');
  await page.keyboard.press('ArrowRight');
  await expect(auditTab).toHaveAttribute('data-state', 'active');
  await page.keyboard.press('ArrowLeft');
  await expect(agenciesTab).toHaveAttribute('data-state', 'active');

  await usersTab.click();
  await page.getByTestId('admin-users-create-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /annuler/i }).first().click();

  const resetButtons = page.locator('[data-testid^="admin-user-reset-password-"]');
  if ((await resetButtons.count()) > 0) {
    await resetButtons.first().click();
    await expect(page.getByText(/reinitialiser le mot de passe/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /annuler/i }).first().click();
  }

  await agenciesTab.click();
  const renameButtons = page.locator('[data-testid^="admin-agency-rename-"]');
  if ((await renameButtons.count()) > 0) {
    await renameButtons.first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /annuler/i }).first().click();
  }

  await auditTab.click();
  await expect(page.getByTestId('admin-audit-filters')).toBeVisible();
  await page.getByTestId('admin-audit-filter-agency-trigger').click();
  await page.getByRole('option', { name: /toutes les agences/i }).click();
  const userFilter = page.getByTestId('admin-audit-filter-user-trigger');
  if ((await userFilter.count()) > 0) {
    await userFilter.click();
    await page.getByRole('option', { name: /tous les utilisateurs/i }).click();
  }
  await page.getByTestId('admin-audit-filter-table-input').fill('clients');

  await openSettingsTab(page);
  const statusCategoryTrigger = page.getByTestId('settings-status-row-category-0');
  if ((await statusCategoryTrigger.count()) > 0) {
    await statusCategoryTrigger.click();
    await page.getByRole('option', { name: /en cours/i }).first().click();
  }

  for (const viewport of P07_VIEWPORTS) {
    await page.setViewportSize(viewport);

    await page.keyboard.press('F4');
    await expect(page.getByTestId('admin-panel')).toBeVisible();
    const adminMetrics = await page.evaluate(() => {
      return {
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    expect(adminMetrics.documentHasHorizontalOverflow).toBe(false);

    await page.keyboard.press('F3');
    await expect(page.getByTestId('settings-root')).toBeVisible();
    const settingsMetrics = await page.evaluate(() => {
      const settingsRoot = document.querySelector<HTMLElement>('[data-testid="settings-root"]');
      const sections = document.querySelector<HTMLElement>('[data-testid="settings-sections"]');

      return {
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        settingsHasHorizontalOverflow: settingsRoot ? settingsRoot.scrollWidth > settingsRoot.clientWidth : false,
        sectionsHasHorizontalOverflow: sections ? sections.scrollWidth > sections.clientWidth : false
      };
    });
    expect(settingsMetrics.documentHasHorizontalOverflow).toBe(false);
    expect(settingsMetrics.settingsHasHorizontalOverflow).toBe(false);
    expect(settingsMetrics.sectionsHasHorizontalOverflow).toBe(false);
  }

  expect(criticalRadixWarnings).toEqual([]);
});

test('P07 - etat erreur utilisateur sur les audits admin', async ({ page }) => {
  await page.route('**/rest/v1/audit_logs*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Erreur backend P07' })
    });
  });

  await login(page);
  await openAdminTab(page);

  await page.getByTestId('admin-tab-audit').click();
  await expect(page.getByText(/la liste des audits est indisponible/i)).toBeVisible();
  await page.getByRole('button', { name: /reessayer/i }).click();
  await expect(page.getByText(/la liste des audits est indisponible/i)).toBeVisible();
});
