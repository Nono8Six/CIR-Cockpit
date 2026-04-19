import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfigSnapshot } from 'shared/schemas/config.schema';

import { useSettingsState } from '@/hooks/useSettingsState';
import { notifyInfo, notifySuccess } from '@/services/errors/notify';

const settingsMocks = vi.hoisted(() => ({
  useSaveAgencyConfig: vi.fn(),
  useSaveProductConfig: vi.fn()
}));

vi.mock('@/hooks/useSaveAgencyConfig', () => ({
  useSaveAgencyConfig: settingsMocks.useSaveAgencyConfig
}));

vi.mock('@/hooks/useSaveProductConfig', () => ({
  useSaveProductConfig: settingsMocks.useSaveProductConfig
}));

vi.mock('@/services/errors/notify', () => ({
  notifyInfo: vi.fn(),
  notifySuccess: vi.fn()
}));

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

    const { result } = renderHook(() =>
      useSettingsState({
        snapshot: BASE_SNAPSHOT,
        canEditAgencySettings: true,
        canEditProductSettings: false,
        agencyId: '11111111-1111-4111-8111-111111111111'
      })
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

  it('returns read-only feedback when user cannot edit', async () => {
    const { result } = renderHook(() =>
      useSettingsState({
        snapshot: BASE_SNAPSHOT,
        canEditAgencySettings: false,
        canEditProductSettings: false,
        agencyId: '11111111-1111-4111-8111-111111111111'
      })
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

    const { result } = renderHook(() =>
      useSettingsState({
        snapshot: BASE_SNAPSHOT,
        canEditAgencySettings: true,
        canEditProductSettings: false,
        agencyId: '11111111-1111-4111-8111-111111111111'
      })
    );

    act(() => {
      result.current.handleReset();
    });

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });
});
