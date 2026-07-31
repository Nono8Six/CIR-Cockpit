import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useDashboardState } from '@/hooks/dashboard-state/useDashboardState';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { addTimelineEvent } from '@/services/interactions/addTimelineEvent';
import { Channel, type AgencyStatus, type Interaction } from '@/types';

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

vi.mock('@/services/interactions/addTimelineEvent', () => ({
  addTimelineEvent: vi.fn()
}));

vi.mock('@/services/errors/notifySuccess', () => ({
  notifySuccess: vi.fn()
}));

const mockHandleUiError = vi.mocked(handleUiError);
const mockAddTimelineEvent = vi.mocked(addTimelineEvent);

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number): string => new Date(Date.now() - days * DAY_MS).toISOString();

const buildInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: 'interaction-1',
  agency_id: 'agency-1',
  channel: Channel.PHONE,
  company_name: 'P06 Client',
  contact_email: 'client@exemple.fr',
  contact_id: null,
  contact_name: 'Alice Martin',
  contact_phone: '0102030405',
  contact_service: 'Atelier',
  created_at: daysAgo(20),
  created_by: 'user-1',
  entity_id: null,
  entity_type: 'Client',
  interaction_type: 'Demande',
  last_action_at: daysAgo(2),
  mega_families: ['Freinage'],
  notes: null,
  order_ref: null,
  reminder_at: null,
  status: 'Nouveau',
  status_id: null,
  status_is_terminal: false,
  subject: 'Demande de devis',
  timeline: [],
  updated_at: daysAgo(2),
  updated_by: null,
  stage: null,
  stage_changed_at: null,
  amount: null,
  quote_sent_at: null,
  lost_reason: null,
  ...overrides
} as Interaction);

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const TestWrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestDashboardStateWrapper';
  return TestWrapper;
};

const terminalStatus: AgencyStatus = {
  id: 'status-done',
  label: 'Offre de prix envoyé',
  category: 'done',
  is_terminal: true,
  is_default: false,
  is_active: true,
  sort_order: 4
};

describe('useDashboardState', () => {
  it('route les erreurs de mise a jour detail vers handleUiError', async () => {
    const appError = createAppError({
      code: 'UNKNOWN_ERROR',
      message: 'Echec mutation',
      source: 'client'
    });
    mockAddTimelineEvent.mockRejectedValue(appError);

    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [buildInteraction()],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    await act(async () => {
      await result.current.handleInteractionUpdate(buildInteraction(), {
        id: 'event-2',
        date: daysAgo(0),
        type: 'note',
        content: 'Test'
      });
    });

    expect(mockHandleUiError).toHaveBeenCalledWith(
      appError,
      'Impossible de mettre à jour le dossier.',
      { source: 'dashboard.details.update' }
    );
  });

  it('sort un dossier termine du perimetre "à traiter" et le rend sur la periode', () => {
    const doneInteraction = buildInteraction({
      status: 'Offre de prix envoyé',
      status_id: 'status-done',
      status_is_terminal: true
    });

    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [doneInteraction],
          statuses: [terminalStatus],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    expect(result.current.tableRows).toHaveLength(0);

    act(() => {
      result.current.setScopeFilter('period');
    });

    expect(result.current.tableRows).toHaveLength(1);
  });

  it('filtre la table par canal et n y laisse aucun doublon', () => {
    const recentPhone = buildInteraction({ id: 'recent-phone', channel: Channel.PHONE });
    const recentMail = buildInteraction({ id: 'recent-mail', channel: Channel.EMAIL, timeline: [] });
    const outOfPeriod = buildInteraction({
      id: 'out-of-period',
      last_action_at: daysAgo(120),
      updated_at: daysAgo(120)
    });

    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [recentPhone, recentMail, outOfPeriod],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    // Perimetre "à traiter" : tout dossier ouvert est present, hors periode compris,
    // et une seule fois.
    const ids = result.current.tableRows.map((row) => row.interaction.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);

    act(() => {
      result.current.setChannelFilter(Channel.EMAIL);
    });

    expect(result.current.tableRows.map((row) => row.interaction.id)).toEqual(['recent-mail']);
  });

  it('inverse le tri au second clic sur la meme colonne', () => {
    const small = buildInteraction({ id: 'small', amount: 100, stage: 'qualification' });
    const large = buildInteraction({ id: 'large', amount: 9000, stage: 'qualification' });

    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [small, large],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    act(() => {
      result.current.toggleSort('amount');
    });
    expect(result.current.sort).toEqual({ key: 'amount', direction: 'desc' });
    expect(result.current.tableRows.map((row) => row.interaction.id)).toEqual(['large', 'small']);

    act(() => {
      result.current.toggleSort('amount');
    });
    expect(result.current.sort).toEqual({ key: 'amount', direction: 'asc' });
    expect(result.current.tableRows.map((row) => row.interaction.id)).toEqual(['small', 'large']);
  });

  it('masque la courbe tant que la serie hebdomadaire est trop courte', () => {
    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [buildInteraction()],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    expect(result.current.showEvolutionChart).toBe(false);
    expect(result.current.openDossiersDelta).not.toBeNull();
  });

  it('calcule les KPI de la vue d ensemble sur tout le perimetre', () => {
    const overdue = buildInteraction({ id: 'overdue', reminder_at: daysAgo(3) });
    const won = buildInteraction({
      id: 'won',
      stage: 'won',
      stage_changed_at: daysAgo(5),
      amount: 1000
    });
    const lost = buildInteraction({
      id: 'lost',
      stage: 'lost',
      stage_changed_at: daysAgo(4),
      amount: 500
    });
    const openDeal = buildInteraction({ id: 'open-deal', stage: 'quote_sent', amount: 2000 });

    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [overdue, won, lost, openDeal],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    expect(result.current.kpis.overdueCount).toBe(1);
    expect(result.current.kpis.oldestOverdueDays).toBe(3);
    expect(result.current.kpis.wonCount30d).toBe(1);
    expect(result.current.kpis.lostCount30d).toBe(1);
    expect(result.current.kpis.conversionRate).toBe(50);
    expect(result.current.kpis.pipelineOpenAmount).toBe(2000);
  });

  it('la recherche filtre la table et la file mais pas les KPI', () => {
    const alpha = buildInteraction({ id: 'alpha', company_name: 'Garage Alpha', reminder_at: daysAgo(1) });
    const beta = buildInteraction({ id: 'beta', company_name: 'Atelier Beta', reminder_at: daysAgo(2) });

    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [alpha, beta],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    act(() => {
      result.current.setSearchTerm('alpha');
    });

    expect(result.current.tableRows.map((row) => row.interaction.id)).toEqual(['alpha']);
    expect(result.current.kpis.overdueCount).toBe(2);
  });

  it('classe un ancien statut selon son rattachement historique', () => {
    const interaction = buildInteraction({
      status: 'Ancien statut terminé',
      status_id: null,
      status_is_terminal: false
    });
    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [interaction],
          statuses: [terminalStatus],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn(),
          resolutions: [{
            id: '11111111-1111-4111-8111-111111111111',
            dimension: 'statuses',
            source_label: 'Ancien statut terminé',
            target_reference_id: 'status-done',
            target_label: terminalStatus.label,
          }],
        }),
      { wrapper: buildWrapper() },
    );

    expect(result.current.pipelineBoard.unqualified).toHaveLength(0);
  });
});
