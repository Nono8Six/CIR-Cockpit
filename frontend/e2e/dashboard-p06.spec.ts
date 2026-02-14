import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);

const DASHBOARD_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 }
];

const toIsoString = (date: Date) => date.toISOString();

const toFrenchDate = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);

const login = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: /se connecter/i }).click();
};

const openDashboardTab = async (page: Page) => {
  const dashboardTab = page.getByRole('tab', { name: /pilotage/i });
  if ((await dashboardTab.getAttribute('data-state')) !== 'active') {
    await dashboardTab.click({ force: true });
  }
  await expect(dashboardTab).toHaveAttribute('data-state', 'active');
};

const setupDashboardFixture = async (page: Page) => {
  const now = new Date();
  const oneHourEarlier = new Date(now.getTime() - 60 * 60 * 1000);
  const nowIso = toIsoString(now);
  const oneHourEarlierIso = toIsoString(oneHourEarlier);

  await page.route('**/rest/v1/interactions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'interaction-p06-1',
          agency_id: 'agency-1',
          channel: 'Téléphone',
          company_name: 'P06_CLIENT_TEST',
          contact_email: 'contact@p06.fr',
          contact_id: null,
          contact_name: 'Alice P06',
          contact_phone: '0102030405',
          contact_service: 'Atelier',
          created_at: oneHourEarlierIso,
          created_by: 'user-1',
          entity_id: null,
          entity_type: 'Client',
          interaction_type: 'Demande',
          last_action_at: nowIso,
          mega_families: ['Freinage', 'Pneumatique'],
          notes: null,
          order_ref: 'P06-001',
          reminder_at: null,
          status: 'Nouveau',
          status_id: null,
          status_is_terminal: false,
          subject: 'Demande de suivi P06',
          timeline: [
            {
              id: 'event-p06-1',
              date: oneHourEarlierIso,
              type: 'creation',
              content: 'Creation'
            }
          ],
          updated_at: nowIso,
          updated_by: null
        }
      ])
    });
  });
};

test.skip(!isConfigured, 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD');

test('P06 - toolbar pilotage, vue kanban/liste, overlay detail, erreur utilisateur et responsive anti-overflow', async ({
  page
}) => {
  const expectedTodayLabel = toFrenchDate(new Date());
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

  await setupDashboardFixture(page);
  await login(page);
  await openDashboardTab(page);

  await expect(page.getByTestId('dashboard-toolbar')).toBeVisible();
  await expect(page.getByTestId('dashboard-kanban')).toBeVisible();
  await expect(page.locator('[data-testid^="dashboard-kanban-card-"]').first()).toContainText(
    expectedTodayLabel
  );

  const viewTabs = page.getByTestId('dashboard-view-mode-tabs');
  const kanbanTab = viewTabs.getByRole('tab', { name: /tableau/i });
  const listTab = viewTabs.getByRole('tab', { name: /historique/i });

  await kanbanTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(listTab).toHaveAttribute('data-state', 'active');
  await page.keyboard.press('ArrowLeft');
  await expect(kanbanTab).toHaveAttribute('data-state', 'active');

  await page.locator('[data-testid^="dashboard-kanban-card-"]').first().click();
  await expect(page.getByTestId('dashboard-details-sheet')).toBeVisible();
  await page.getByRole('button', { name: /fermer le panneau/i }).click();
  await expect(page.getByTestId('dashboard-details-sheet')).toHaveCount(0);

  await page.getByTestId('dashboard-period-select').click();
  await page.getByRole('option', { name: /periode personnalisee/i }).click();
  await expect(page.getByTestId('dashboard-date-range-help')).toBeVisible();
  await page.getByTestId('dashboard-date-range-help-trigger').hover();
  await expect(page.getByText(/Selectionnez une plage pour afficher les dossiers/i)).toBeVisible();
  await page.getByTestId('dashboard-date-range-trigger').click();
  await expect(page.getByTestId('dashboard-date-range-popover')).toBeVisible();
  await page
    .locator('[data-testid="dashboard-date-range-popover"] button[data-day]')
    .first()
    .click();
  await expect(page.getByTestId('dashboard-date-range-popover')).toBeVisible();
  await page.getByTestId('dashboard-date-range-apply').click();
  await expect(page.getByTestId('dashboard-date-range-popover')).toHaveCount(0);

  await page.getByTestId('dashboard-date-range-trigger').click();
  await expect(page.getByTestId('dashboard-date-range-popover')).toBeVisible();
  await page.getByTestId('dashboard-date-range-cancel').click();
  await expect(page.getByTestId('dashboard-date-range-popover')).toHaveCount(0);

  await page.evaluate(() => {
    const startInput = document.querySelector<HTMLInputElement>('[data-testid="dashboard-start-date"]');
    const endInput = document.querySelector<HTMLInputElement>('[data-testid="dashboard-end-date"]');

    if (!startInput || !endInput) return;

    const setInputValue = (input: HTMLInputElement, value: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      );
      descriptor?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    setInputValue(startInput, '2026-02-10');
    setInputValue(endInput, '2026-02-01');
  });
  await expect(page.getByTestId('dashboard-period-error')).toBeVisible();

  await page.getByTestId('dashboard-search-input').fill('P06_CLIENT_TEST');

  await listTab.click();
  await expect(page.getByTestId('dashboard-list')).toBeVisible();

  for (const viewport of DASHBOARD_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openDashboardTab(page);

    const metrics = await page.evaluate(() => {
      const toolbar = document.querySelector<HTMLElement>('[data-testid="dashboard-toolbar"]');
      const root = document.querySelector<HTMLElement>('[data-testid="dashboard-root"]');
      const kanban = document.querySelector<HTMLElement>('[data-testid="dashboard-kanban"]');
      const list = document.querySelector<HTMLElement>('[data-testid="dashboard-list"]');
      const visiblePane = list ?? kanban;

      return {
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        toolbarHasHorizontalOverflow: toolbar ? toolbar.scrollWidth > toolbar.clientWidth : true,
        rootHasHorizontalOverflow: root ? root.scrollWidth > root.clientWidth : true,
        paneHasHorizontalOverflow: visiblePane ? visiblePane.scrollWidth > visiblePane.clientWidth : true
      };
    });

    expect(metrics.documentHasHorizontalOverflow).toBe(false);
    expect(metrics.toolbarHasHorizontalOverflow).toBe(false);
    expect(metrics.rootHasHorizontalOverflow).toBe(false);
    expect(metrics.paneHasHorizontalOverflow).toBe(false);
  }

  expect(criticalRadixWarnings).toEqual([]);
});
