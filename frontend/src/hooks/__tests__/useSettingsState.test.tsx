import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsState } from '@/hooks/useSettingsState';
import { notifyInfo, notifySuccess } from '@/services/errors/notify';

const settingsMocks = vi.hoisted(() => ({
  useSaveAgencyConfig: vi.fn()
}));

vi.mock('@/hooks/useSaveAgencyConfig', () => ({
  useSaveAgencyConfig: settingsMocks.useSaveAgencyConfig
}));

vi.mock('@/services/errors/notify', () => ({
  notifyInfo: vi.fn(),
  notifySuccess: vi.fn()
}));

const BASE_CONFIG = {
  statuses: [
    {
      id: 'status-1',
      label: 'Nouveau',
      category: 'todo' as const,
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

describe('useSettingsState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsMocks.useSaveAgencyConfig.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false
    });
  });

  it('saves configuration and notifies success', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    settingsMocks.useSaveAgencyConfig.mockReturnValue({
      mutateAsync,
      isPending: false
    });

    const { result } = renderHook(() =>
      useSettingsState({
        config: BASE_CONFIG,
        canEdit: true,
        agencyId: '11111111-1111-4111-8111-111111111111'
      })
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      families: ['Freinage'],
      services: ['Atelier'],
      entities: ['Client'],
      interactionTypes: ['Devis'],
      statuses: [
        {
          id: 'status-1',
          label: 'Nouveau',
          category: 'todo',
          is_terminal: false,
          is_default: true,
          sort_order: 1,
          agency_id: undefined
        }
      ]
    });
    expect(notifySuccess).toHaveBeenCalledWith('Configuration sauvegardee');
  });

  it('returns read-only feedback when user cannot edit', async () => {
    const { result } = renderHook(() =>
      useSettingsState({
        config: BASE_CONFIG,
        canEdit: false,
        agencyId: '11111111-1111-4111-8111-111111111111'
      })
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(notifyInfo).toHaveBeenCalledWith(
      'Acces lecture seule. Contactez un super admin pour modifier.'
    );
  });

  it('asks confirmation before resetting local form state', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() =>
      useSettingsState({
        config: BASE_CONFIG,
        canEdit: true,
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

