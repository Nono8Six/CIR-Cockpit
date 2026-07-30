import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDashboardStatusHelpers } from '@/hooks/dashboard-state/useDashboardStatusHelpers';
import { Channel, type AgencyStatus, type Interaction } from '@/types';

const buildStatus = (overrides: Partial<AgencyStatus> = {}): AgencyStatus => ({
  id: 'status-progress',
  label: 'En cours',
  category: 'in_progress',
  is_terminal: false,
  is_default: false,
  is_active: true,
  sort_order: 1,
  ...overrides,
});

const buildInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: 'interaction-1',
  agency_id: 'agency-1',
  channel: Channel.PHONE,
  company_name: 'Client test',
  contact_email: null,
  contact_id: null,
  contact_name: null,
  contact_phone: null,
  contact_service: null,
  created_at: '2026-07-30T08:00:00.000Z',
  created_by: 'user-1',
  entity_id: null,
  entity_type: 'Client',
  interaction_type: 'Demande',
  last_action_at: '2026-07-30T08:00:00.000Z',
  mega_families: [],
  notes: null,
  order_ref: null,
  reminder_at: null,
  status: 'En cours',
  status_id: 'status-progress',
  status_is_terminal: false,
  subject: 'Demande test',
  timeline: [],
  updated_at: '2026-07-30T08:00:00.000Z',
  updated_by: null,
  stage: null,
  stage_changed_at: null,
  amount: null,
  quote_sent_at: null,
  lost_reason: null,
  ...overrides,
} as Interaction);

describe('useDashboardStatusHelpers', () => {
  it('indexe uniquement les statuts qui portent un identifiant', () => {
    const identified = buildStatus();
    const withoutId = buildStatus({ id: undefined, label: 'Sans identifiant' });

    const { result } = renderHook(() =>
      useDashboardStatusHelpers([identified, withoutId])
    );

    expect(result.current.statusById).toEqual(
      new Map([['status-progress', identified]])
    );
  });

  it('affiche le badge a traiter pour une categorie todo ou un statut par defaut', () => {
    const todoStatus = buildStatus({
      id: 'status-todo',
      label: 'À traiter',
      category: 'todo',
      is_default: true,
    });
    const { result } = renderHook(() =>
      useDashboardStatusHelpers([todoStatus])
    );

    expect(
      result.current.getStatusBadgeClass(
        buildInteraction({
          status: todoStatus.label,
          status_id: todoStatus.id,
        })
      )
    ).toBe('border-destructive/50 bg-destructive/15 text-destructive');
  });

  it('affiche le badge termine depuis le statut ou le marqueur de l interaction', () => {
    const doneStatus = buildStatus({
      id: 'status-done',
      label: 'Terminé',
      category: 'done',
      is_terminal: true,
    });
    const { result } = renderHook(() =>
      useDashboardStatusHelpers([doneStatus])
    );

    expect(
      result.current.getStatusBadgeClass(
        buildInteraction({
          status: doneStatus.label,
          status_id: doneStatus.id,
          status_is_terminal: false,
        })
      )
    ).toBe('border-success/45 bg-success/18 text-success');

    expect(
      result.current.getStatusBadgeClass(
        buildInteraction({
          status: 'Statut historique',
          status_id: null,
          status_is_terminal: true,
        })
      )
    ).toBe('border-success/45 bg-success/18 text-success');
  });

  it('resout un ancien libelle et conserve le badge intermediaire par defaut', () => {
    const doneStatus = buildStatus({
      id: 'status-done',
      label: 'Clôturé',
      category: 'done',
      is_terminal: true,
    });
    const { result } = renderHook(() =>
      useDashboardStatusHelpers([doneStatus], [
        {
          id: '11111111-1111-4111-8111-111111111111',
          dimension: 'statuses',
          source_label: 'Ancien libellé',
          target_reference_id: 'status-done',
          target_label: doneStatus.label,
        },
      ])
    );

    expect(
      result.current.getStatusBadgeClass(
        buildInteraction({
          status: 'Ancien libellé',
          status_id: null,
          status_is_terminal: undefined,
        })
      )
    ).toBe('border-success/45 bg-success/18 text-success');

    expect(
      result.current.getStatusBadgeClass(
        buildInteraction({
          status: 'En attente de retour',
          status_id: null,
          status_is_terminal: undefined,
        })
      )
    ).toBe('border-warning/45 bg-warning/20 text-warning-foreground');
  });
});
