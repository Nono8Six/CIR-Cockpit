import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';

import { useSettingsState } from '@/hooks/settings-state/useSettingsState';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { notifyInfo } from '@/services/errors/notifyInfo';

const settingsMocks = vi.hoisted(() => ({
  useSaveAgencyConfig: vi.fn(),
  useSaveProductConfig: vi.fn()
}));

vi.mock('@/hooks/admin/agencies/actions/useSaveAgencyConfig', () => ({
  useSaveAgencyConfig: settingsMocks.useSaveAgencyConfig
}));

vi.mock('@/hooks/entities/core/useSaveProductConfig', () => ({
  useSaveProductConfig: settingsMocks.useSaveProductConfig
}));

vi.mock('@/services/errors/notifyInfo', () => ({ notifyInfo: vi.fn() }));
vi.mock('@/services/errors/notifySuccess', () => ({ notifySuccess: vi.fn() }));

const BASE_SNAPSHOT: ResolvedConfigSnapshot = {
  product: {
    feature_flags: {
      ui_shell_v2: false
    },
    onboarding: {
      allow_manual_entry: true,
      default_account_type_company: 'term',
      default_account_type_individual: 'cash'
    }
  },
  agency: {
    onboarding: {}
  },
  references: {
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
    interaction_types: ['Devis'],
    departments: []
  }
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
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
    settingsMocks.useSaveAgencyConfig.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false
    });
    settingsMocks.useSaveProductConfig.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false
    });
  });

  it('saves agency configuration and notifies success', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    settingsMocks.useSaveAgencyConfig.mockReturnValue({
      mutateAsync,
      isPending: false
    });

    const { result } = renderHook(
      () =>
        useSettingsState({
          snapshot: BASE_SNAPSHOT,
          canEditAgencySettings: true,
          canEditProductSettings: false,
          agencyId: '11111111-1111-4111-8111-111111111111'
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      agency_id: '11111111-1111-4111-8111-111111111111',
      onboarding: {},
      references: {
        families: ['Freinage'],
        services: ['Atelier'],
        entities: ['Client'],
        interaction_types: ['Devis'],
        statuses: [
          {
            id: 'status-1',
            label: 'Nouveau',
            category: 'todo'
          }
        ]
      }
    });
    expect(notifySuccess).toHaveBeenCalledWith('Configuration sauvegardee');
  });

  it('saves product configuration for super-admin settings', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    settingsMocks.useSaveProductConfig.mockReturnValue({
      mutateAsync,
      isPending: false
    });

    const { result } = renderHook(
      () =>
        useSettingsState({
          snapshot: BASE_SNAPSHOT,
          canEditAgencySettings: false,
          canEditProductSettings: true,
          agencyId: '11111111-1111-4111-8111-111111111111'
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      feature_flags: {
        ui_shell_v2: false
      },
      onboarding: {
        allow_manual_entry: true,
        default_account_type_company: 'term',
        default_account_type_individual: 'cash'
      }
    });
    expect(notifySuccess).toHaveBeenCalledWith('Configuration sauvegardee');
  });

  it('returns read-only feedback when user cannot edit', async () => {
    const { result } = renderHook(
      () =>
        useSettingsState({
          snapshot: BASE_SNAPSHOT,
          canEditAgencySettings: false,
          canEditProductSettings: false,
          agencyId: '11111111-1111-4111-8111-111111111111'
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(notifyInfo).toHaveBeenCalledWith(
      'Acces lecture seule. Contactez un administrateur pour modifier.'
    );
  });

  it('asks confirmation before resetting local form state', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useSettingsState({
          snapshot: BASE_SNAPSHOT,
          canEditAgencySettings: true,
          canEditProductSettings: false,
          agencyId: '11111111-1111-4111-8111-111111111111'
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.handleReset();
    });

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });
});
