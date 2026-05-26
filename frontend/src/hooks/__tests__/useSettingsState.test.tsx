import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';

import { useSettingsState } from '@/hooks/settings-state/useSettingsState';
import { notifyInfo } from '@/services/errors/notifyInfo';
import { notifySuccess } from '@/services/errors/notifySuccess';

const settingsMocks = vi.hoisted(() => ({
  saveConfigReferenceAction: vi.fn(),
  saveSettingsReferences: vi.fn(),
}));

vi.mock('@/services/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/config')>();
  return {
    ...actual,
    saveConfigReferenceAction: settingsMocks.saveConfigReferenceAction,
    saveSettingsReferences: settingsMocks.saveSettingsReferences,
  };
});

vi.mock('@/services/errors/notifyInfo', () => ({ notifyInfo: vi.fn() }));
vi.mock('@/services/errors/notifySuccess', () => ({ notifySuccess: vi.fn() }));

const BASE_SNAPSHOT: ResolvedConfigSnapshot = {
  references: {
    statuses: [
      {
        id: 'status-1',
        label: 'Nouveau',
        category: 'todo',
        is_terminal: false,
        is_default: true,
        sort_order: 1,
      },
    ],
    services: ['Atelier'],
    families: ['Freinage'],
    interaction_types: ['Devis'],
    departments: [],
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function SettingsStateTestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return SettingsStateTestWrapper;
};

describe('useSettingsState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsMocks.saveSettingsReferences.mockReturnValue({
      match: vi.fn((success) => success(undefined)),
    });
    settingsMocks.saveConfigReferenceAction.mockReturnValue({
      match: vi.fn((success) => success({ ok: true, usage_count: 0 })),
    });
  });

  it('saves editable references and notifies success', async () => {
    const { result } = renderHook(
      () =>
        useSettingsState({
          snapshot: BASE_SNAPSHOT,
          canEditAgencySettings: true,
          agencyId: '11111111-1111-4111-8111-111111111111',
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(settingsMocks.saveSettingsReferences).toHaveBeenCalledWith({
      agency_id: '11111111-1111-4111-8111-111111111111',
      families: ['Freinage'],
      services: ['Atelier'],
      interactionTypes: ['Devis'],
      statuses: [
        {
          id: 'status-1',
          label: 'Nouveau',
          category: 'todo',
        },
      ],
    });
    expect(notifySuccess).toHaveBeenCalledWith('Configuration sauvegardee');
  });

  it('returns read-only feedback when user cannot edit', async () => {
    const { result } = renderHook(
      () =>
        useSettingsState({
          snapshot: BASE_SNAPSHOT,
          canEditAgencySettings: false,
          agencyId: '11111111-1111-4111-8111-111111111111',
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(notifyInfo).toHaveBeenCalledWith(
      'Acces lecture seule. Contactez un administrateur pour modifier.',
    );
  });

  it('asks confirmation before resetting local form state', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useSettingsState({
          snapshot: BASE_SNAPSHOT,
          canEditAgencySettings: true,
          agencyId: '11111111-1111-4111-8111-111111111111',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleReset();
    });

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });
});
