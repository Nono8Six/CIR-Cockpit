import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DashboardDetailsOverlay from '@/components/dashboard/DashboardDetailsOverlay';
import { Channel, type Interaction } from '@/types';

const buildInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: 'interaction-overlay-1',
  agency_id: 'agency-1',
  channel: Channel.PHONE,
  company_name: 'P06 Overlay Client',
  contact_email: 'contact@exemple.fr',
  contact_id: null,
  contact_name: 'Camille Dupont',
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
  stage: null,
  stage_changed_at: null,
  amount: null,
  quote_sent_at: null,
  lost_reason: null,
  status: 'Nouveau',
  status_id: null,
  status_is_terminal: false,
  subject: 'Demande de rappel',
  timeline: [
    {
      id: 'event-overlay-1',
      date: '2026-02-01T09:00:00.000Z',
      type: 'creation',
      content: 'Creation'
    }
  ],
  updated_at: '2026-02-01T09:00:00.000Z',
  updated_by: null,
  ...overrides
});

describe('DashboardDetailsOverlay', () => {
  it('ouvre le detail en dialog centre et permet de le fermer', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DashboardDetailsOverlay
        interaction={buildInteraction()}
        statuses={[]}
        onClose={onClose}
        onUpdate={vi.fn(async () => undefined)}
        onRequestConvert={vi.fn()}
        onDeleteInteraction={vi.fn()}
      />
    );

    const dialog = screen.getByTestId('dashboard-details-dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(screen.getByText(/détails de l'interaction/i)).toBeInTheDocument();
    expect(screen.getByTestId('interaction-details-status-select')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fermer le détail/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ferme le dialog avec Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DashboardDetailsOverlay
        interaction={buildInteraction()}
        statuses={[]}
        onClose={onClose}
        onUpdate={vi.fn(async () => undefined)}
        onRequestConvert={vi.fn()}
        onDeleteInteraction={vi.fn()}
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
