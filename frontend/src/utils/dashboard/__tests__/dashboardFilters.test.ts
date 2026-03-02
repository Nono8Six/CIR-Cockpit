import { describe, expect, it } from 'vitest';

import { Channel, type Interaction } from '@/types';
import {
  buildDateBounds,
  filterInteractionsBySearch,
  filterInteractionsByViewMode,
  validateCustomDateRange
} from '@/utils/dashboard/dashboardFilters';

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

describe('dashboardFilters', () => {
  it('validates custom date range', () => {
    expect(validateCustomDateRange('', '')).toBe('Renseignez une date de debut et de fin.');
    expect(validateCustomDateRange('2026-02-10', '2026-02-01')).toBe(
      'La date de debut doit preceder la date de fin.'
    );
    expect(validateCustomDateRange('2026-02-01', '2026-02-10')).toBeNull();
  });

  it('filters interactions by search term across key fields', () => {
    const matching = buildInteraction({
      id: 'match',
      company_name: 'Garage Alpha',
      mega_families: ['Pneumatique']
    });
    const nonMatching = buildInteraction({
      id: 'skip',
      company_name: 'Atelier Beta',
      mega_families: ['Carrosserie']
    });

    const filtered = filterInteractionsBySearch([matching, nonMatching], 'alpha', 'alpha');
    expect(filtered.map((row) => row.id)).toEqual(['match']);
  });

  it('filters by date bounds in list mode and sorts by latest activity', () => {
    const inRangeNewest = buildInteraction({
      id: 'newest',
      last_action_at: '2026-02-10T10:00:00.000Z'
    });
    const inRangeOldest = buildInteraction({
      id: 'oldest',
      last_action_at: '2026-02-10T08:00:00.000Z'
    });
    const outOfRange = buildInteraction({
      id: 'out',
      last_action_at: '2026-02-01T08:00:00.000Z'
    });

    const dateBounds = buildDateBounds('2026-02-10', '2026-02-10');
    const filtered = filterInteractionsByViewMode({
      interactions: [inRangeOldest, outOfRange, inRangeNewest],
      viewMode: 'list',
      dateBounds,
      isStatusDone: () => false
    });

    expect(filtered.map((row) => row.id)).toEqual(['newest', 'oldest']);
  });

  it('excludes done items in kanban mode when date bounds are absent', () => {
    const todoInteraction = buildInteraction({ id: 'todo', status_is_terminal: false });
    const doneInteraction = buildInteraction({ id: 'done', status_is_terminal: true });

    const filtered = filterInteractionsByViewMode({
      interactions: [todoInteraction, doneInteraction],
      viewMode: 'kanban',
      dateBounds: null,
      isStatusDone: (interaction) => Boolean(interaction.status_is_terminal)
    });

    expect(filtered.map((row) => row.id)).toEqual(['todo']);
  });
});
