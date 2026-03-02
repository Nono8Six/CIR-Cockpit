import { expect, test, type Locator, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);
const SKIP_REASON = 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD';

const uniqueSuffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const login = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email ?? '');
  await page.getByLabel('Mot de passe').fill(password ?? '');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();
};

const openClientsTab = async (page: Page): Promise<void> => {
  const tab = page.getByRole('tab', { name: /clients \(f5\)/i });
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
  await expect(page.getByTestId('clients-toolbar')).toBeVisible();
};

const selectFirstAgencyInClientForm = async (page: Page): Promise<void> => {
  const dialog = page.getByRole('dialog').last();
  const agencySelect = dialog.getByRole('combobox', { name: /agence/i });
  await expect(agencySelect).toBeVisible();
  await agencySelect.click();

  const preferredOption = page.getByRole('option', { name: /cir bordeaux/i }).first();
  if ((await preferredOption.count()) > 0) {
    await preferredOption.click();
  } else {
    const fallbackOption = page
      .getByRole('option')
      .filter({ hasNotText: /selectionner/i })
      .first();
    await expect(fallbackOption).toBeVisible();
    await fallbackOption.click();
  }

  await expect(agencySelect).not.toContainText(/selectionner une agence/i);
  await expect(dialog.getByText(/identifiant invalide/i)).toHaveCount(0);
};

const findClientRowByName = (page: Page, name: string): Locator =>
  page.locator('[data-testid^="clients-list-row-"]').filter({ hasText: name }).first();

test.skip(!isConfigured, SKIP_REASON);

test('CRUD client complet: creation, modification, contact, archivage, filtre par defaut', async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const initialName = `E2E CLIENT ${suffix}`;
  const updatedName = `E2E CLIENT MAJ ${suffix}`;
  const initialAddress = `10 rue Initiale ${suffix}`;
  const updatedAddress = `20 avenue Modifiee ${suffix}`;
  const contactLastName = `Contact${suffix}`;

  await login(page);
  await openClientsTab(page);

  // 1) Creer un client avec champs obligatoires
  await page.getByTestId('clients-toolbar-create-client').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#client-number').fill(String(Date.now()).slice(-6));
  await page.locator('#client-name').fill(initialName);
  await page.locator('#client-address').fill(initialAddress);
  await page.locator('#client-postal-code').fill('75001');
  await page.locator('#client-city').fill('Paris');
  await selectFirstAgencyInClientForm(page);
  await page.getByRole('button', { name: /^creer$/i }).click();
  await expect(page.getByRole('dialog', { name: /nouveau client/i })).toHaveCount(0);

  await page.getByTestId('clients-toolbar-search').fill(initialName);
  const createdRow = findClientRowByName(page, initialName);
  await expect(createdRow).toBeVisible();
  await createdRow.click();
  await expect(page.getByTestId('clients-detail-pane')).toContainText(initialName);

  // 2) Modifier le client (nom + adresse)
  const detailPane = page.getByTestId('clients-detail-pane');
  const headerButtons = detailPane.locator('button.h-8.px-2');
  await headerButtons.first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#client-name').fill(updatedName);
  await page.locator('#client-address').fill(updatedAddress);
  await page.getByRole('button', { name: /^enregistrer$/i }).click();
  await expect(page.getByRole('dialog', { name: /modifier client/i })).toHaveCount(0);

  await page.getByTestId('clients-toolbar-search').fill(updatedName);
  const updatedRow = findClientRowByName(page, updatedName);
  await expect(updatedRow).toBeVisible();
  await updatedRow.click();
  await expect(page.getByTestId('clients-detail-pane')).toContainText(updatedName);
  await expect(page.getByTestId('clients-detail-pane')).toContainText(updatedAddress);

  // 3) Ajouter un contact
  await page.getByRole('button', { name: /ajouter un contact/i }).click();
  const contactDialog = page.getByRole('dialog', { name: /nouveau contact/i });
  await expect(contactDialog).toBeVisible();
  await page.locator('#contact-first-name').fill('Alice');
  await page.locator('#contact-last-name').fill(contactLastName);
  await page.locator('#contact-phone').fill('0601020304');
  await page.locator('#contact-email').fill(`contact-${suffix}@cir.invalid`);
  await page.locator('#contact-position').fill('Responsable maintenance');
  await page.locator('#contact-notes').fill(`Notes e2e ${suffix}`);
  await contactDialog.getByRole('button', { name: /^ajouter$/i }).click();
  await expect(contactDialog).toHaveCount(0);
  await expect(page.getByTestId('clients-detail-pane')).toContainText(contactLastName);

  // 4) Archiver le client
  const archiveButton = detailPane.locator('button.h-8.px-2').nth(1);
  await archiveButton.click();
  const confirmDialog = page.getByRole('alertdialog').filter({ hasText: /archiver ce client/i });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole('button', { name: /^archiver$/i }).click();
  await expect(confirmDialog).toHaveCount(0);

  // 5) Verifier qu'il n'apparait plus par defaut (sans "voir archives")
  await page.getByTestId('clients-toolbar-search').fill(updatedName);
  await expect(findClientRowByName(page, updatedName)).toHaveCount(0);
});
