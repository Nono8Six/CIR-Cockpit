import { describe, expect, it } from 'vitest';

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

  it('resolves status meta by id, then by resolved label', () => {
    const status = buildStatus();
    const { getStatusMeta } = createInteractionStatusPredicates(
      [status],
      (rawLabel) => (rawLabel === 'Ancien' ? 'Nouveau' : rawLabel)
    );

    expect(getStatusMeta(buildInteraction({ status_id: 'status-1' }))).toBe(status);
    expect(getStatusMeta(buildInteraction({ status: 'Ancien', status_id: null }))).toBe(status);
  });

  it('counts the work queue from todo statuses and excludes in-progress or done interactions', () => {
    const todoStatus = buildStatus();
    const inProgressStatus = buildStatus({ id: 'status-progress', label: 'En cours', category: 'in_progress', is_default: false });
    const doneStatus = buildStatus({ id: 'status-done', label: 'Terminé', category: 'done', is_terminal: true, is_default: false });
    const statuses = [todoStatus, inProgressStatus, doneStatus];

    const todo = buildInteraction({ id: 'todo', status_id: 'status-1' });
    const inProgress = buildInteraction({ id: 'progress', status_id: 'status-progress' });
    const quietInProgress = buildInteraction({ id: 'quiet', status_id: 'status-progress' });
    const done = buildInteraction({ id: 'done', status_id: 'status-done' });

    const predicates = createInteractionStatusPredicates(statuses);
    expect(isInteractionInWorkQueue(todo, predicates)).toBe(true);
    expect(isInteractionInWorkQueue(inProgress, predicates)).toBe(false);
    expect(isInteractionInWorkQueue(quietInProgress, predicates)).toBe(false);
    expect(isInteractionInWorkQueue(done, predicates)).toBe(false);

    expect(countWorkQueueInteractions([todo, inProgress, quietInProgress, done], statuses)).toBe(1);
  });
});
