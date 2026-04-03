import { test, expect, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const role = process.env.E2E_USER_ROLE || 'tcs';
const isConfigured = Boolean(email && password);
const SKIP_REASON = 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD';
const KEY_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 }
];
const COCKPIT_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 }
];

const login = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();
};

test.skip(!isConfigured, SKIP_REASON);

test('switch tabs between Cockpit and Dashboard', async ({ page }) => {
  await login(page);

  const cockpitLink = page.getByTestId('app-shell-nav-cockpit');
  const dashboardLink = page.getByTestId('app-shell-nav-dashboard');

  await expect(cockpitLink).toBeVisible();
  await dashboardLink.click();
  await expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('deep links, refresh and browser history remain consistent', async ({ page }) => {
  await login(page);

  await page.goto('/clients');
  await expect(page).toHaveURL(/\/clients(?:\?|$)/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/clients(?:\?|$)/);

  await page.goForward();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/clients');
  await expect(page).toHaveURL(/\/clients(?:\?|$)/);

  await page.reload();
  await expect(page).toHaveURL(/\/clients(?:\?|$)/);
});

test('unauthorized admin deep link redirects to cockpit', async ({ page }) => {
  test.skip(role !== 'tcs', 'scenario cible uniquement les profils tcs');

  await login(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/cockpit$/);
});

test('header layout is collision-free on key breakpoints', async ({ page }) => {
  await login(page);

  for (const viewport of KEY_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId('app-header-search-button')).toBeVisible();

    if (viewport.width >= 768) {
      await expect(page.getByTestId('app-header-profile-button')).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: /ouvrir le menu$/i })).toBeVisible();
    }

    const headerMetrics = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('header');
      const searchLabel = document.querySelector<HTMLElement>('[data-testid="app-header-search-label"]');
      const profileButton = document.querySelector<HTMLElement>('[data-testid="app-header-profile-button"]');
      const mobileMenuButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.getAttribute('aria-label') === 'Ouvrir le menu'
      ) ?? null;

      const isVisible = (element: HTMLElement | null): boolean => {
        if (!element) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      return {
        headerVisible: isVisible(header),
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        searchLabelVisible: isVisible(searchLabel),
        profileButtonVisible: isVisible(profileButton),
        mobileMenuVisible: isVisible(mobileMenuButton)
      };
    });

    expect(headerMetrics.headerVisible).toBe(true);
    expect(headerMetrics.hasHorizontalOverflow).toBe(false);
    expect(headerMetrics.searchLabelVisible).toBe(viewport.width >= 1024);
    expect(headerMetrics.profileButtonVisible).toBe(viewport.width >= 768);
    expect(headerMetrics.mobileMenuVisible).toBe(viewport.width < 768);
  }
});

test('cockpit layout is fluid and status picker works on key breakpoints', async ({ page }) => {
  await login(page);
  await page.getByTestId('app-shell-nav-cockpit').click();
  await expect(page.getByText('Brouillon introuvable.')).toHaveCount(0);
  await expect(page.getByTestId('cockpit-submit-bar')).toBeVisible();
  await expect(page.getByTestId('cockpit-submit-button')).toBeVisible();
  await expect(page.getByTestId('cockpit-form-header').getByText('Enregistrer')).toHaveCount(0);

  const statusTrigger = page.getByTestId('cockpit-status-trigger');
  await expect(statusTrigger).toBeVisible();
  await statusTrigger.click();
  const statusGroups = page.locator('[data-testid^="cockpit-status-group-"]');
  await expect(statusGroups.first()).toBeVisible();
  expect(await statusGroups.count()).toBeGreaterThan(0);
  const statusOption = page.locator('[data-testid^="cockpit-status-item-"]').first();
  await expect(statusOption).toBeVisible();
  const selectedStatusLabel = (await statusOption.textContent())?.trim() ?? '';
  const normalizedStatusLabel = selectedStatusLabel.replace('Actuel', '').trim();
  await statusOption.click();
  if (normalizedStatusLabel) {
    await expect(statusTrigger).toContainText(normalizedStatusLabel);
  }

  for (const viewport of COCKPIT_VIEWPORTS) {
    await page.setViewportSize(viewport);

    const expectedToastPosition = viewport.width <= 768 ? 'top-center' : 'bottom-right';
    const toasterPosition = await page.evaluate(() => document.querySelector('[data-sonner-toaster]')?.getAttribute('data-position') ?? null);
    if (toasterPosition) {
      expect(toasterPosition).toBe(expectedToastPosition);
    }

    const cockpitMetrics = await page.evaluate(() => {
      const leftPane = document.querySelector<HTMLElement>('[data-testid="cockpit-left-pane"]');
      const rightPane = document.querySelector<HTMLElement>('[data-testid="cockpit-right-pane"]');
      const channelGroup = document.querySelector<HTMLElement>('[data-testid="cockpit-channel-group"]');
      const relationGroup = document.querySelector<HTMLElement>('[data-testid="cockpit-relation-group"]');
      const serviceQuickGroup = document.querySelector<HTMLElement>('[data-testid="cockpit-service-quick-group"]');
      const servicePickerTrigger = document.querySelector<HTMLElement>('[data-testid="cockpit-service-picker-trigger"]');
      const channelPickerTrigger = document.querySelector<HTMLElement>('[data-testid="cockpit-channel-picker-trigger"]');
      const relationPickerTrigger = document.querySelector<HTMLElement>('[data-testid="cockpit-relation-picker-trigger"]');

      if (!leftPane || !rightPane || !channelGroup || !relationGroup) {
        return {
          leftPaneHasInternalScrollMode: true,
          rightPaneHasInternalScrollMode: true,
          documentHasHorizontalOverflow: true,
          channelButtonsAreNotBold: false,
          relationButtonsAreNotBold: false,
          serviceButtonsAreNotBold: false,
          relationAlignedLeft: false,
          serviceQuickGroupVisible: false,
          servicePickerVisible: false,
          channelPickerVisible: false,
          relationPickerVisible: false
        };
      }

      const getFirstButtonWeight = (group: HTMLElement): number => {
        const firstButton = group.querySelector<HTMLElement>('button');
        if (!firstButton) return 700;
        const raw = Number.parseInt(getComputedStyle(firstButton).fontWeight, 10);
        return Number.isFinite(raw) ? raw : 700;
      };
      const isVisible = (element: HTMLElement | null): boolean => {
        if (!element) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const leftOverflowMode = getComputedStyle(leftPane).overflowY;
      const rightOverflowMode = getComputedStyle(rightPane).overflowY;
      const channelWeight = getFirstButtonWeight(channelGroup);
      const relationWeight = getFirstButtonWeight(relationGroup);
      const serviceWeight = serviceQuickGroup ? getFirstButtonWeight(serviceQuickGroup) : 400;

      return {
        leftPaneHasInternalScrollMode: leftOverflowMode === 'auto' || leftOverflowMode === 'scroll',
        rightPaneHasInternalScrollMode: rightOverflowMode === 'auto' || rightOverflowMode === 'scroll',
        documentHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        channelButtonsAreNotBold: channelWeight <= 500,
        relationButtonsAreNotBold: relationWeight <= 500,
        serviceButtonsAreNotBold: serviceWeight <= 500,
        relationAlignedLeft: getComputedStyle(relationGroup).justifyContent === 'flex-start',
        serviceQuickGroupVisible: isVisible(serviceQuickGroup),
        servicePickerVisible: isVisible(servicePickerTrigger),
        channelPickerVisible: isVisible(channelPickerTrigger),
        relationPickerVisible: isVisible(relationPickerTrigger)
      };
    });

    expect(cockpitMetrics.documentHasHorizontalOverflow).toBe(false);
    expect(cockpitMetrics.channelButtonsAreNotBold).toBe(true);
    expect(cockpitMetrics.relationButtonsAreNotBold).toBe(true);
    expect(cockpitMetrics.relationAlignedLeft).toBe(true);

    if (viewport.width <= 768) {
      expect(cockpitMetrics.serviceQuickGroupVisible).toBe(false);
      expect(cockpitMetrics.servicePickerVisible).toBe(true);
      expect(cockpitMetrics.channelPickerVisible).toBe(true);
      expect(cockpitMetrics.relationPickerVisible).toBe(true);
    } else {
      expect(cockpitMetrics.serviceQuickGroupVisible).toBe(true);
      expect(cockpitMetrics.serviceButtonsAreNotBold).toBe(true);
      expect(cockpitMetrics.channelPickerVisible).toBe(false);
      expect(cockpitMetrics.relationPickerVisible).toBe(false);
    }
  }
});
