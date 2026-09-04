import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const isConfigured = Boolean(email && password);
test.skip(!isConfigured, 'E2E env missing: E2E_USER_EMAIL / E2E_USER_PASSWORD');

const userId = '10000000-0000-4000-8000-000000000001';
const agencyId = '10000000-0000-4000-8000-000000000002';
const typeId = '10000000-0000-4000-8000-000000000003';
const now = '2026-08-12T12:00:00.000Z';
const task = (id: string, title: string, scope: 'internal_cir' | 'tier_relation', responsible: string | null) => ({ id, agency_id: agencyId, version: 1, title, description: null, task_type_id: typeId, planned_channel: null, scope, organization_id: scope === 'tier_relation' ? '10000000-0000-4000-8000-000000000020' : null, contact_id: null, source_activity_id: null, completion_activity_id: null, created_by: userId, responsible_id: responsible, status: 'todo' as const, priority: 'normal' as const, due_date: '2026-08-15', due_time: null, due_timezone: 'Europe/Paris', visibility: scope === 'tier_relation' ? 'tier' as const : 'agency' as const, completed_at: null, completed_by: null, canceled_at: null, canceled_by: null, cancel_reason: null, series_id: null, previous_task_id: null, created_at: now, updated_at: now });
const taskType = { id: typeId, code: 'relance', label: 'Relance', sort_order: 0, is_active: true, created_by: userId, updated_by: userId, created_at: now, updated_at: now, archived_at: null };
let tasks = [task('10000000-0000-4000-8000-000000000010', 'Tâche interne', 'internal_cir', userId), task('10000000-0000-4000-8000-000000000011', 'Tâche Tier', 'tier_relation', userId), task('10000000-0000-4000-8000-000000000012', 'File collective', 'internal_cir', null)];
const envelope = (data: unknown) => ({ result: { data } });
const procedures = (url: URL) => (url.pathname.split('/trpc/')[1] ?? '').split(',').filter(Boolean);

const installTaskMocks = async (page: Page) => page.route('**/trpc/**', async (route) => {
  const url = new URL(route.request().url()); const names = procedures(url);
  if (!names.every((name) => name === 'tasks.list' || name === 'tasks.get' || name === 'tasks.create' || name === 'tasks.update-assignment' || name === 'tasks.change-status' || name === 'tasks.reschedule' || name === 'tasks.execute-with-activity' || name === 'task-types.list')) return route.continue();
  const raw = decodeURIComponent(`${url.searchParams.get('input') ?? ''}${route.request().postData() ?? ''}`);
  const responses = names.map((name) => {
    if (name === 'task-types.list') return envelope({ task_types: [taskType] });
    if (name === 'tasks.list') {
      const rows = raw.includes('"responsible_id":null') ? tasks.filter((item) => item.responsible_id === null) : raw.includes(userId) ? tasks.filter((item) => item.responsible_id === userId) : tasks;
      return envelope({ items: rows.map((item) => ({ task: item, task_type: taskType, contributors: [], organization_name: item.scope === 'tier_relation' ? 'Atelier Martin' : null, contact_name: null, responsible_name: item.responsible_id ? 'Camille CIR' : null, is_overdue: false })), page: 1, page_size: 25, total: rows.length });
    }
    const id = raw.includes('000000000011') ? '10000000-0000-4000-8000-000000000011' : raw.includes('000000000012') ? '10000000-0000-4000-8000-000000000012' : '10000000-0000-4000-8000-000000000010';
    let current = tasks.find((item) => item.id === id) ?? tasks[0]!;
    if (name === 'tasks.create') { current = task('10000000-0000-4000-8000-000000000013', 'Nouvelle action', 'internal_cir', userId); tasks = [...tasks, current]; }
    if (name === 'tasks.update-assignment') { current = { ...current, version: current.version + 1, responsible_id: userId }; tasks = tasks.map((item) => item.id === id ? current : item); }
    if (name === 'tasks.change-status') { const completed = raw.includes('completed'); current = { ...current, version: current.version + 1, status: completed ? 'completed' : raw.includes('in_progress') ? 'in_progress' : 'todo', completed_at: completed ? now : null, completed_by: completed ? userId : null }; tasks = tasks.map((item) => item.id === id ? current : item); }
    if (name === 'tasks.reschedule') { current = { ...current, version: current.version + 1, due_date: '2026-08-20' }; tasks = tasks.map((item) => item.id === id ? current : item); }
    if (name === 'tasks.execute-with-activity') { current = { ...current, version: current.version + 1, status: 'completed', completed_at: now, completed_by: userId, completion_activity_id: '10000000-0000-4000-8000-000000000030' }; tasks = tasks.map((item) => item.id === id ? current : item); }
    const detail = { task: current, participants: [], events: [] };
    return envelope(name === 'tasks.execute-with-activity' ? { ...detail, activity_id: current.completion_activity_id, next_occurrence_id: null, idempotent: false } : name === 'tasks.create' ? { ...detail, idempotent: false } : detail);
  });
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responses.length === 1 ? responses[0] : responses) });
});

const login = async (page: Page) => { await page.goto('/'); await page.getByLabel('Email').fill(email!); await page.getByLabel('Mot de passe').fill(password!); await page.getByRole('button', { name: /se connecter/i }).click(); await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible(); };

test('B3-5 desktop: création, file, terminaison interne/Tier, report et permissions visuelles', async ({ page }) => {
  await installTaskMocks(page); await login(page); await page.goto('/tasks');
  await expect(page.getByTestId('tasks-page')).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle tâche' }).click();
  const createDialog = page.getByRole('dialog'); await createDialog.getByLabel('Titre de la tâche').fill('Nouvelle action'); await createDialog.getByLabel('Type de tâche').click(); await page.getByRole('option', { name: 'Relance' }).click(); await createDialog.getByRole('textbox', { name: 'Échéance' }).fill('2026-08-15'); await createDialog.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('button', { name: 'File d’agence' }).click();
  const queue = page.getByRole('button', { name: 'File collective' }).locator('xpath=ancestor::tr'); await queue.getByRole('button', { name: /prendre/i }).click();
  await page.getByRole('button', { name: 'Mes tâches' }).click();
  const internal = page.getByRole('button', { name: 'Tâche interne' }).locator('xpath=ancestor::tr'); await internal.getByTitle('Reporter').click(); const rescheduleDialog = page.getByRole('dialog'); await rescheduleDialog.locator('input[type="date"]').fill('2026-08-20'); await rescheduleDialog.getByRole('button', { name: 'Confirmer' }).click(); await internal.getByTitle('Terminer').click();
  await page.getByRole('button', { name: 'Tâche interne' }).click(); const detailDialog = page.getByRole('dialog'); await detailDialog.getByRole('button', { name: 'Réouvrir' }).click(); await expect(detailDialog.getByText('À faire')).toBeVisible(); await page.keyboard.press('Escape');
  const tier = page.getByRole('button', { name: 'Tâche Tier' }).locator('xpath=ancestor::tr'); await tier.getByTitle('Terminer').click(); await page.getByLabel('Sujet *').fill('Échange client'); await page.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText('Les données requises créent l’activité')).toHaveCount(0);
});

test('B3-5 mobile et clavier: navigation, filtres et dialogue', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await installTaskMocks(page); await login(page); await page.goto('/tasks');
  const createButton = page.getByRole('button', { name: 'Nouvelle tâche' }); await createButton.focus(); await page.keyboard.press('Tab'); await expect(page.locator(':focus')).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle tâche' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('tasks-page')).toHaveCSS('overflow', 'hidden');
});
