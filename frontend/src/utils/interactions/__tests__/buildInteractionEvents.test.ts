import { describe, expect, it, vi } from 'vitest';

import { Channel, type AgencyStatus, type Interaction } from '@/types';
import { buildInteractionEvents } from '@/utils/interactions/buildInteractionEvents';

vi.mock('@/utils/date/getNowIsoString', () => ({
  getNowIsoString: () => '2026-02-10T14:25:00.000Z'
}));

const buildInteraction = (): Interaction => ({
  id: 'interaction-1',
  agency_id: 'agency-1',
  channel: Channel.PHONE,
  company_name: 'P06 Client',
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
  status: 'En attente',
  status_id: 'status-waiting',
  status_is_terminal: false,
  subject: 'Demande de devis',
  timeline: [
    {
      id: 'event-1',
      date: '2026-02-01T09:00:00.000Z',
      type: 'creation',
      content: 'Creation'
    }
  ],
  updated_at: '2026-02-01T09:00:00.000Z',
  updated_by: null
});

describe('buildInteractionEvents', () => {
  it('met a jour status_is_terminal et last_action_at quand le statut change', () => {
    const interaction = buildInteraction();
    const statusById = new Map<string, AgencyStatus>([
      [
        'status-done',
        {
          id: 'status-done',
          label: 'Offre de prix envoye',
          category: 'done',
          is_terminal: true,
          is_default: false,
          sort_order: 3
        }
      ]
    ]);

    const { events, updates } = buildInteractionEvents({
      interaction,
      statusId: 'status-done',
      reminder: interaction.reminder_at || '',
      orderRef: interaction.order_ref || '',
      note: '',
      statusById
    });

    expect(events).toHaveLength(1);
    expect(updates).toMatchObject({
      status_id: 'status-done',
      status: 'Offre de prix envoye',
      status_is_terminal: true,
      last_action_at: '2026-02-10T14:25:00.000Z'
    });
  });

  it('met a jour last_action_at quand une note est ajoutee', () => {
    const interaction = buildInteraction();
    const statusById = new Map();

    const { events, updates } = buildInteractionEvents({
      interaction,
      statusId: interaction.status_id ?? '',
      reminder: interaction.reminder_at || '',
      orderRef: interaction.order_ref || '',
      note: 'Client rappele',
      statusById
    });

    expect(events).toHaveLength(1);
    expect(updates?.last_action_at).toBe('2026-02-10T14:25:00.000Z');
  });

  it('ne retourne aucun update si rien ne change', () => {
    const interaction = buildInteraction();
    const statusById = new Map();

    const { events, updates } = buildInteractionEvents({
      interaction,
      statusId: interaction.status_id ?? '',
      reminder: interaction.reminder_at || '',
      orderRef: interaction.order_ref || '',
      note: '   ',
      statusById
    });

    expect(events).toHaveLength(0);
    expect(updates).toBeNull();
  });
});
