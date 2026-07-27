import { describe, expect, it } from 'vitest';

import { Channel, type Interaction } from '@/types';
import { filterInteractionsBySearch } from '@/utils/dashboard/dashboardFilters';

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
  stage: null,
  stage_changed_at: null,
  amount: null,
  quote_sent_at: null,
  lost_reason: null,
  ...overrides
} as Interaction);

describe('dashboardFilters', () => {
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

  it('returns the full list when the search term is empty', () => {
    const first = buildInteraction({ id: 'first' });
    const second = buildInteraction({ id: 'second' });

    expect(filterInteractionsBySearch([first, second], '', '')).toEqual([first, second]);
  });

  it('finds a historical status through its active resolution', () => {
    const interaction = buildInteraction({ status: 'Ancien statut' });
    const filtered = filterInteractionsBySearch([interaction], 'traité', 'traité', [
      {
        id: '11111111-1111-4111-8111-111111111111',
        dimension: 'statuses',
        source_label: 'Ancien statut',
        target_reference_id: '22222222-2222-4222-8222-222222222222',
        target_label: 'Traité',
      },
    ]);

    expect(filtered).toEqual([interaction]);
  });
});
