import { describe, expect, it } from 'vitest';

import { Channel, type Interaction } from '@/types';
import {
  resolveActivityTimestamp,
  sortInteractionsByLatestActivity
} from '@/utils/dashboard/dashboardSort';

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

describe('dashboardSort', () => {
  it('uses latest timeline event when available', () => {
    const interaction = buildInteraction({
      last_action_at: '2026-03-01T12:00:00.000Z',
      timeline: [
        {
          id: 'event-1',
          date: '2026-02-15T18:56:12.829Z',
          type: 'note',
          content: 'Ancienne note'
        },
        {
          id: 'event-2',
          date: '2026-02-16T09:00:00.000Z',
          type: 'status_change',
          content: 'Statut mis a jour'
        }
      ]
    });

    expect(resolveActivityTimestamp(interaction)).toBe(new Date('2026-02-16T09:00:00.000Z').getTime());
  });

  it('uses last_action_at before updated_at and created_at', () => {
    const interaction = buildInteraction({
      created_at: '2026-01-01T09:00:00.000Z',
      updated_at: '2026-01-10T09:00:00.000Z',
      last_action_at: '2026-01-20T09:00:00.000Z'
    });

    expect(resolveActivityTimestamp(interaction)).toBe(new Date('2026-01-20T09:00:00.000Z').getTime());
  });

  it('sorts interactions by latest activity descending', () => {
    const first = buildInteraction({ id: 'first', last_action_at: '2026-01-10T09:00:00.000Z' });
    const second = buildInteraction({ id: 'second', last_action_at: '2026-02-10T09:00:00.000Z' });

    const sorted = sortInteractionsByLatestActivity([first, second]);
    expect(sorted.map((row) => row.id)).toEqual(['second', 'first']);
  });
});
