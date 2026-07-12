import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Channel, type AgencyStatus, type Interaction } from '@/types';
import {
  countWorkQueueInteractions,
  createInteractionStatusPredicates,
  inferStatusCategoryFromLabel,
  isInteractionInWorkQueue
} from '@/utils/dashboard/dashboardAggregates';

const buildInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: 'interaction-1',
  agency_id: 'agency-1',
  channel: Channel.PHONE,
  company_name: 'Client Test',
  contact_email: 'client@exemple.fr',
  contact_id: null,
  contact_name: 'Alice Martin',
  contact_phone: '0102030405',
  contact_service: 'Atelier',
  created_at: '2026-02-01T09:00:00.000Z',
  created_by: 'user-1',
  entity_id: null,
  entity_type: 'Client',
  interaction_type: 'Demande',
  last_action_at: '2026-02-01T09:00:00.000Z',
  mega_families: ['Freinage'],
  notes: null,
  order_ref: null,
  reminder_at: null,
  status: 'Nouveau',
  status_id: null,
  status_is_terminal: false,
  subject: 'Demande de devis',
  timeline: [],
  updated_at: '2026-02-01T09:00:00.000Z',
  updated_by: null,
  ...overrides
} as Interaction);

describe('dashboardAggregates', () => {
  it('infers status category from normalized labels', () => {
    expect(inferStatusCategoryFromLabel('Terminé')).toBe('done');
    expect(inferStatusCategoryFromLabel('A traiter')).toBe('todo');
    expect(inferStatusCategoryFromLabel('En cours')).toBe('in_progress');
  });

});

describe('createInteractionStatusPredicates', () => {
  const buildStatus = (overrides: Partial<AgencyStatus> = {}): AgencyStatus => ({
    id: 'status-1',
    label: 'Nouveau',
    category: 'todo',
    is_terminal: false,
    is_default: true,
    is_active: true,
    sort_order: 1,
    ...overrides
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves status meta by id, then by resolved label', () => {
    const status = buildStatus();
    const { getStatusMeta } = createInteractionStatusPredicates(
      [status],
      (rawLabel) => (rawLabel === 'Ancien' ? 'Nouveau' : rawLabel)
    );

    expect(getStatusMeta(buildInteraction({ status_id: 'status-1' }))).toBe(status);
    expect(getStatusMeta(buildInteraction({ status: 'Ancien', status_id: null }))).toBe(status);
  });

  it('flags overdue reminders only on open interactions', () => {
    const doneStatus = buildStatus({ id: 'status-done', category: 'done', is_terminal: true, is_default: false });
    const { isReminderOverdue } = createInteractionStatusPredicates([buildStatus(), doneStatus]);

    const overdueOpen = buildInteraction({
      status_id: 'status-1',
      reminder_at: '2026-02-10T09:00:00.000Z'
    });
    const overdueDone = buildInteraction({
      status_id: 'status-done',
      reminder_at: '2026-02-10T09:00:00.000Z'
    });
    const futureReminder = buildInteraction({
      status_id: 'status-1',
      reminder_at: '2026-02-20T09:00:00.000Z'
    });

    expect(isReminderOverdue(overdueOpen)).toBe(true);
    expect(isReminderOverdue(overdueDone)).toBe(false);
    expect(isReminderOverdue(futureReminder)).toBe(false);
  });

  it('counts the work queue as todo or overdue interactions, excluding done', () => {
    const todoStatus = buildStatus();
    const inProgressStatus = buildStatus({ id: 'status-progress', label: 'En cours', category: 'in_progress', is_default: false });
    const doneStatus = buildStatus({ id: 'status-done', label: 'Terminé', category: 'done', is_terminal: true, is_default: false });
    const statuses = [todoStatus, inProgressStatus, doneStatus];

    const todo = buildInteraction({ id: 'todo', status_id: 'status-1' });
    const overdueInProgress = buildInteraction({
      id: 'overdue',
      status_id: 'status-progress',
      reminder_at: '2026-02-10T09:00:00.000Z'
    });
    const quietInProgress = buildInteraction({ id: 'quiet', status_id: 'status-progress' });
    const done = buildInteraction({ id: 'done', status_id: 'status-done' });

    const predicates = createInteractionStatusPredicates(statuses);
    expect(isInteractionInWorkQueue(todo, predicates)).toBe(true);
    expect(isInteractionInWorkQueue(overdueInProgress, predicates)).toBe(true);
    expect(isInteractionInWorkQueue(quietInProgress, predicates)).toBe(false);
    expect(isInteractionInWorkQueue(done, predicates)).toBe(false);

    expect(countWorkQueueInteractions([todo, overdueInProgress, quietInProgress, done], statuses)).toBe(2);
  });
});
