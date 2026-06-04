import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const isConfigured = Boolean(email && password);
const SKIP_REASON = 'E2E env missing: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD';

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
  await expect(page.getByRole('button', { name: /ouvrir la recherche rapide/i })).toBeVisible();
};

const openAdminTab = async (page: Page) => {
  await page.goto('/admin');
  await expect(page.getByTestId('admin-panel')).toBeVisible();
};

const openSettingsTab = async (page: Page) => {
  await page.goto('/settings');
  await expect(page.getByTestId('settings-root')).toBeVisible();
};

test.skip(!isConfigured, SKIP_REASON);

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
  await expect(page.getByRole('button', { name: 'Archiver le statut Attente éléments du client' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Supprimer le statut Offre de prix envoyé' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Corriger le libellé du statut Attente éléments du client' })).toBeVisible();

  await page.getByRole('button', { name: 'Descendre le statut Attente éléments du client' }).click();
  await expect(page.getByRole('heading', { name: /modifications non enregistrées/i })).toBeVisible();
  await page.getByRole('button', { name: 'Archiver le statut Attente éléments du client' }).click();
  await page.getByRole('alertdialog', { name: /archiver le statut/i }).getByRole('button', { name: 'Archiver' }).click();
  await expect(page.getByText(/enregistrez ou annulez les changements en cours avant cette action/i)).toBeVisible();
  await expect(page.getByRole('alertdialog', { name: /archiver le statut/i })).toBeHidden();
  await page.getByRole('button', { name: /réinitialiser/i }).click();
  await page.getByRole('alertdialog', { name: /réinitialiser la configuration/i }).getByRole('button', { name: /réinitialiser/i }).click();

  const statusCategoryTrigger = page.getByTestId('settings-status-row-category-0');
  if ((await statusCategoryTrigger.count()) > 0) {
    await statusCategoryTrigger.click();
    await page.getByRole('option', { name: /en cours/i }).first().click();
  }
  await page.getByRole('button', { name: /historique & intégrité/i }).click();
  await expect(page.getByRole('heading', { name: 'Historique & intégrité' })).toBeVisible();
  const systemValues = page.getByText(/parcours automatiques \(\d+\)/i);
  await expect(systemValues).toBeVisible();
  await systemValues.click();
  await expect(page.getByText(/ils ne sont ni supprimés, ni à corriger/i)).toBeVisible();

  const inspectButtons = page.getByRole('button', { name: /examiner|voir les interactions/i });
  if ((await inspectButtons.count()) > 0) {
    await inspectButtons.first().click();
    const interactionsSheet = page.getByRole('dialog', { name: /inspecter les interactions/i });
    await expect(interactionsSheet).toBeVisible();
    const detailButtons = interactionsSheet.getByRole('button', { name: /détails/i });
    if ((await detailButtons.count()) > 0) await detailButtons.first().click();
    const openDashboard = interactionsSheet.getByRole('button', { name: /ouvrir dans le pilotage/i });
    if ((await openDashboard.count()) > 0) {
      await openDashboard.first().click();
      await expect(page).toHaveURL(/\/dashboard\?interactionId=/);
      await expect(page.getByRole('dialog', { name: /details interaction/i })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goto('/settings');
      await expect(page.getByTestId('settings-root')).toBeVisible();
    } else {
      await page.keyboard.press('Escape');
    }
  }

  for (const viewport of P07_VIEWPORTS) {
    await page.setViewportSize(viewport);

    await page.goto('/admin');
    await expect(page.getByTestId('admin-panel')).toBeVisible();
    const adminMetrics = await page.evaluate(() => {
      return {
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    expect(adminMetrics.documentHasHorizontalOverflow).toBe(false);

    await page.goto('/settings');
    await expect(page.getByTestId('settings-root')).toBeVisible();
    await page.getByRole('button', { name: /historique & intégrité/i }).click();
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
  await page.route('**/functions/v1/api/trpc/admin.audit-logs*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Erreur backend P07' })
    });
  });

  await login(page);
  await openAdminTab(page);

  await page.getByTestId('admin-tab-audit').click();
  await expect(page.getByText(/la liste des journaux d'audit est temporairement indisponible/i)).toBeVisible();
  await page.getByRole('button', { name: /réessayer/i }).click();
  await expect(page.getByText(/la liste des journaux d'audit est temporairement indisponible/i)).toBeVisible();
});
