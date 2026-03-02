import { describe, expect, it } from 'vitest';

import { Channel, type Interaction } from '@/types';
import {
  buildKanbanColumns,
  inferStatusCategoryFromLabel
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
});

describe('dashboardAggregates', () => {
  it('infers status category from normalized labels', () => {
    expect(inferStatusCategoryFromLabel('Terminé')).toBe('done');
    expect(inferStatusCategoryFromLabel('A traiter')).toBe('todo');
    expect(inferStatusCategoryFromLabel('En cours')).toBe('in_progress');
  });

  it('builds kanban columns with urgency, in progress and completed groups', () => {
    const urgent = buildInteraction({ id: 'urgent', status: 'A traiter' });
    const inProgress = buildInteraction({ id: 'in-progress', status: 'En cours' });
    const done = buildInteraction({ id: 'done', status: 'Termine', status_is_terminal: true });

    const columns = buildKanbanColumns({
      interactions: [urgent, inProgress, done],
      isStatusTodo: (interaction) => interaction.id === 'urgent',
      isStatusDone: (interaction) => interaction.id === 'done',
      isReminderOverdue: () => false
    });

    expect(columns.urgencies.map((row) => row.id)).toEqual(['urgent']);
    expect(columns.inProgress.map((row) => row.id)).toEqual(['in-progress']);
    expect(columns.completed.map((row) => row.id)).toEqual(['done']);
  });
});
