import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useDashboardState } from '@/hooks/useDashboardState';
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

vi.mock('@/services/errors/notify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/errors/notify')>();
  return {
    ...actual,
    notifySuccess: vi.fn()
  };
});

const mockHandleUiError = vi.mocked(handleUiError);
const mockAddTimelineEvent = vi.mocked(addTimelineEvent);

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
  status: 'Nouveau',
  status_id: null,
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
  sort_order: 4
};

describe('useDashboardState', () => {
  it('expose une erreur utilisateur lorsque la plage personnalisee est invalide', () => {
    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    act(() => {
      result.current.handleStartDateChange('2026-02-10');
      result.current.handleEndDateChange('2026-02-01');
    });

    expect(result.current.period).toBe('custom');
    expect(result.current.periodErrorMessage).toBe(
      'La date de debut doit preceder la date de fin.'
    );
    expect(mockHandleUiError).toHaveBeenCalledTimes(1);
  });

  it('efface l erreur de periode quand un preset est reapplique', () => {
    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    act(() => {
      result.current.handleStartDateChange('2026-02-10');
      result.current.handleEndDateChange('2026-02-01');
      result.current.setPeriod('today');
    });

    expect(result.current.periodErrorMessage).toBeNull();
  });

  it('met a jour la plage personnalisee de facon atomique avec handleDateRangeChange', () => {
    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    act(() => {
      result.current.handleDateRangeChange('2026-02-10', '2026-02-10');
      result.current.handleDateRangeChange('2026-01-22', '2026-02-10');
    });

    expect(result.current.period).toBe('custom');
    expect(result.current.effectiveStartDate).toBe('2026-01-22');
    expect(result.current.effectiveEndDate).toBe('2026-02-10');
    expect(result.current.periodErrorMessage).toBeNull();
  });

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
        date: '2026-02-01T10:00:00.000Z',
        type: 'note',
        content: 'Test'
      });
    });

    expect(mockHandleUiError).toHaveBeenCalledWith(
      appError,
      'Impossible de mettre a jour le dossier.',
      { source: 'dashboard.details.update' }
    );
  });

  it('garde un dossier termine visible sur la periode selon last_action_at', () => {
    const doneInteraction: Interaction = {
      ...buildInteraction(),
      created_at: '2026-01-01T09:00:00.000Z',
      last_action_at: '2026-02-10T10:00:00.000Z',
      updated_at: '2026-02-10T10:00:00.000Z',
      status: 'Offre de prix envoyé',
      status_id: 'status-done',
      status_is_terminal: true
    };

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

    act(() => {
      result.current.setPeriod('custom');
      result.current.handleStartDateChange('2026-02-10');
      result.current.handleEndDateChange('2026-02-10');
    });

    expect(result.current.kanbanColumns?.completed).toHaveLength(1);

    act(() => {
      result.current.setViewMode('list');
    });

    expect(result.current.filteredData).toHaveLength(1);
  });

  it('filtre aussi les dossiers non termines sur la periode en vue kanban', () => {
    const interactionInRange: Interaction = {
      ...buildInteraction(),
      id: 'interaction-in-range',
      status: 'A traiter',
      status_id: null,
      status_is_terminal: false,
      last_action_at: '2026-02-10T09:00:00.000Z',
      updated_at: '2026-02-10T09:00:00.000Z'
    };

    const interactionOutOfRange: Interaction = {
      ...buildInteraction(),
      id: 'interaction-out-of-range',
      status: 'En cours',
      status_id: null,
      status_is_terminal: false,
      last_action_at: '2026-02-01T09:00:00.000Z',
      updated_at: '2026-02-01T09:00:00.000Z'
    };

    const { result } = renderHook(
      () =>
        useDashboardState({
          interactions: [interactionInRange, interactionOutOfRange],
          statuses: [],
          agencyId: 'agency-1',
          onRequestConvert: vi.fn()
        }),
      { wrapper: buildWrapper() }
    );

    act(() => {
      result.current.handleDateRangeChange('2026-02-10', '2026-02-10');
    });

    expect(result.current.kanbanColumns?.urgencies).toHaveLength(1);
    expect(result.current.kanbanColumns?.urgencies[0]?.id).toBe('interaction-in-range');
    expect(result.current.kanbanColumns?.inProgress).toHaveLength(0);
    expect(result.current.kanbanColumns?.completed).toHaveLength(0);
  });
});
