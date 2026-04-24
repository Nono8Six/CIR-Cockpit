import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CockpitReadonlyView from '@/components/cockpit/CockpitReadonlyView';
import { Channel, type InteractionDraft } from '@/types';
import type { AgencyConfig } from '@/services/config';

const config: AgencyConfig = {
  statuses: [
    {
      id: 'status-1',
      label: 'Nouveau',
      category: 'todo',
      is_terminal: false,
      is_default: true,
      sort_order: 1
    }
  ],
  services: ['Atelier'],
  entities: ['Client'],
  families: ['Freinage'],
  interactionTypes: ['Devis']
};

const interaction: InteractionDraft = {
  id: 'interaction-1',
  channel: Channel.PHONE,
  entity_type: 'Prospect',
  contact_service: 'Atelier',
  interaction_type: 'Devis',
  company_name: 'Ateliers Rive Ouest',
  contact_first_name: 'Aline',
  contact_last_name: 'Martin',
  contact_position: '',
  contact_name: '',
  contact_phone: '0102030405',
  contact_email: undefined,
  mega_families: undefined,
  subject: 'Demande de devis',
  order_ref: '',
  reminder_at: undefined,
  notes: '',
  timeline: [],
  status_id: 'status-1'
};

describe('CockpitReadonlyView', () => {
  it('ne rend pas de tags quand mega_families est absent', () => {
    render(
      <CockpitReadonlyView
        interaction={interaction}
        config={config}
        onStartNew={vi.fn()}
      />
    );

    expect(screen.getByTestId('cockpit-readonly-view')).toBeInTheDocument();
    expect(screen.queryByTestId('cockpit-readonly-tags')).not.toBeInTheDocument();
  });
});
