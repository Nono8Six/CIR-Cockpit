import { test, expect, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);
const SHOT_DIR = 'e2e-proof-configurator-c5';

const login = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();
};

test.skip(!isConfigured, 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD');

test('accueil Configurateurs et parcours Remplacement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.goto('/configurateurs');
  await expect(page).toHaveURL(/\/configurateurs\/moteurs$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOT_DIR}/01-accueil-moteurs.png`, fullPage: true });

  await page.getByRole('link', { name: /Remplacement/ }).first().click();
  await expect(page).toHaveURL(/\/remplacement$/);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOT_DIR}/02-remplacement-vide.png`, fullPage: true });

  // Etape 1 : ce que le client dicte au telephone.
  await page.getByLabel(/Puissance/).fill('11');
  await page.getByRole('button', { name: /4P/ }).click();

  // Etape 2 : la forme de montage, choisie sur schema.
  await page.getByRole('button', { name: /Le montage/ }).click();
  await page.screenshot({ path: `${SHOT_DIR}/03-montage.png`, fullPage: true });
  await page.getByRole('button', { name: /B35/ }).click();

  // Etape 3 : les cotes, filtrees par le montage.
  await expect(page.getByLabel(/^A —/)).toBeVisible();
  await expect(page.getByLabel(/^M —/)).toBeVisible();
  await page.getByLabel(/^H —/).focus();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT_DIR}/03b-cotes.png`, fullPage: true });

  await page.getByRole('button', { name: /Vue réaliste/ }).click();
  await page.getByRole('button', { name: 'Bride' }).click();
  await page.screenshot({ path: `${SHOT_DIR}/03c-moteur-realiste-bride.png`, fullPage: true });

  // La recherche longue ne part jamais pendant la frappe : le TCS la lance
  // explicitement une fois son relevé suffisamment précis.
  await page.getByRole('button', { name: /Rechercher les équivalents/ }).click();

  const candidatesTable = page.getByRole('table', { name: /Candidats au remplacement/ });
  await expect(candidatesTable).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOT_DIR}/04-candidats.png`, fullPage: true });

  // Une page qui plante rend l'ecran d'erreur global : la capture seule ne suffit
  // pas a prouver que le parcours fonctionne.
  await expect(page.getByText('Something went wrong!')).toHaveCount(0);

  const candidateButton = candidatesTable.locator('tbody tr th button').first();
  await expect(candidateButton).toBeVisible();
  await candidateButton.click();
  const verdictDialog = page.getByRole('dialog');
  await expect(verdictDialog).toBeVisible();
  await page.screenshot({ path: `${SHOT_DIR}/05-verdict.png`, fullPage: true });
  await page.keyboard.press('Escape');
  await expect(verdictDialog).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOT_DIR}/06-mobile.png`, fullPage: true });
});
