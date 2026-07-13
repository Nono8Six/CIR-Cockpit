import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DashboardMyDay from '@/components/dashboard/DashboardMyDay';
import type { MyDayView } from '@/utils/dashboard/dashboardAggregates';
import { Channel, type Interaction } from '@/types';

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
  stage: null,
  stage_changed_at: null,
  amount: null,
  quote_sent_at: null,
  lost_reason: null,
  status: 'Nouveau',
  status_id: null,
  status_is_terminal: false,
  subject: 'Demande de devis',
  timeline: [],
  updated_at: '2026-02-01T09:00:00.000Z',
  updated_by: null,
  ...overrides
});

const emptyGroups: MyDayView['groups'] = {
  overdue: [],
  dueToday: [],
  upcoming: [],
  toPlan: []
};

const buildView = (overrides: Partial<MyDayView['groups']> = {}, kpis?: Partial<MyDayView['kpis']>): MyDayView => ({
  groups: { ...emptyGroups, ...overrides },
  kpis: {
    overdueCount: 0,
    dueTodayCount: 0,
    openCount: 0,
    averageOpenAgeDays: null,
    ...kpis
  }
});

describe('DashboardMyDay', () => {
  it('affiche les groupes et les actions rapides', async () => {
    const user = userEvent.setup();
    const overdue = buildInteraction({
      id: 'overdue-1',
      company_name: 'Garage Alpha',
      reminder_at: '2026-02-01T09:00:00.000Z'
    });
    const toPlan = buildInteraction({ id: 'to-plan-1', company_name: 'Atelier Beta' });
    const onSelectInteraction = vi.fn();
    const onCompleteReminder = vi.fn();
    const onPostponeReminder = vi.fn();

    render(
      <DashboardMyDay
        view={buildView({ overdue: [overdue], toPlan: [toPlan] }, { overdueCount: 1, openCount: 2, averageOpenAgeDays: 5 })}
        isUpdatePending={false}
        onSelectInteraction={onSelectInteraction}
        onCompleteReminder={onCompleteReminder}
        onPostponeReminder={onPostponeReminder}
      />
    );

    expect(screen.getByRole('heading', { name: /relances en retard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sans rappel planifié/i })).toBeInTheDocument();

    // "Fait" n'existe que pour les dossiers avec rappel.
    expect(
      screen.getByRole('button', { name: /marquer la relance de garage alpha comme faite/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /marquer la relance de atelier beta comme faite/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /planifier la relance de atelier beta à dans 2 jours/i })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /marquer la relance de garage alpha comme faite/i })
    );
    expect(onCompleteReminder).toHaveBeenCalledWith(overdue);
    expect(onSelectInteraction).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: /reporter la relance de garage alpha à dans 1 semaine/i })
    );
    expect(onPostponeReminder).toHaveBeenCalledWith(overdue, 7);
    expect(onSelectInteraction).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('dashboard-myday-row-overdue-1'));
    expect(onSelectInteraction).toHaveBeenCalledWith(overdue);
  });

  it('affiche un etat vide quand la file de travail est vide', () => {
    render(
      <DashboardMyDay
        view={buildView()}
        isUpdatePending={false}
        onSelectInteraction={vi.fn()}
        onCompleteReminder={vi.fn()}
        onPostponeReminder={vi.fn()}
      />
    );

    expect(screen.getByText(/tout est à jour/i)).toBeInTheDocument();
    expect(
      screen.getByText(/aucune relance en attente ni dossier à planifier\./i)
    ).toBeInTheDocument();
  });
});
