import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgenciesManager } from '@/hooks/useAgenciesManager';
import { notifySuccess } from '@/services/errors/notify';
import type { Agency } from '@/types';

const agenciesMocks = vi.hoisted(() => ({
  useAgencies: vi.fn(),
  useCreateAgency: vi.fn(),
  useRenameAgency: vi.fn(),
  useArchiveAgency: vi.fn(),
  useUnarchiveAgency: vi.fn(),
  useHardDeleteAgency: vi.fn()
}));

vi.mock('@/hooks/useAgencies', () => ({
  useAgencies: agenciesMocks.useAgencies
}));
vi.mock('@/hooks/useCreateAgency', () => ({
  useCreateAgency: agenciesMocks.useCreateAgency
}));
vi.mock('@/hooks/useRenameAgency', () => ({
  useRenameAgency: agenciesMocks.useRenameAgency
}));
vi.mock('@/hooks/useArchiveAgency', () => ({
  useArchiveAgency: agenciesMocks.useArchiveAgency
}));
vi.mock('@/hooks/useUnarchiveAgency', () => ({
  useUnarchiveAgency: agenciesMocks.useUnarchiveAgency
}));
vi.mock('@/hooks/useHardDeleteAgency', () => ({
  useHardDeleteAgency: agenciesMocks.useHardDeleteAgency
}));

vi.mock('@/services/errors/notify', () => ({
  notifySuccess: vi.fn()
}));

const createAgency = (overrides?: Partial<Agency>): Agency => ({
  id: overrides?.id ?? 'agency-1',
  name: overrides?.name ?? 'Agence A',
  archived_at: overrides?.archived_at ?? null,
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z'
});

describe('useAgenciesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agenciesMocks.useAgencies.mockReturnValue({
      data: [
        createAgency(),
        createAgency({ id: 'agency-2', name: 'Agence B' })
      ]
    });
    agenciesMocks.useCreateAgency.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    agenciesMocks.useRenameAgency.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    agenciesMocks.useArchiveAgency.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    agenciesMocks.useUnarchiveAgency.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    agenciesMocks.useHardDeleteAgency.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
  });

  it('creates, renames and archives agencies successfully', async () => {
    const { result } = renderHook(() => useAgenciesManager());

    await act(async () => {
      await result.current.handleCreate('Agence C');
    });
    expect(notifySuccess).toHaveBeenCalledWith('Agence creee.');

    act(() => {
      result.current.openRenameDialog(createAgency());
    });
    await act(async () => {
      await result.current.handleRename('Agence Renommee');
    });
    expect(notifySuccess).toHaveBeenCalledWith('Agence renommee.');

    act(() => {
      result.current.handleArchiveToggle(createAgency());
    });
    await act(async () => {
      await result.current.executeArchiveToggle();
    });
    expect(notifySuccess).toHaveBeenCalledWith('Agence archivee.');
  });

  it('swallows archive mutation errors without throwing', async () => {
    agenciesMocks.useArchiveAgency.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('boom'))
    });
    const { result } = renderHook(() => useAgenciesManager());

    act(() => {
      result.current.handleArchiveToggle(createAgency());
    });
    await act(async () => {
      await result.current.executeArchiveToggle();
    });

    expect(notifySuccess).not.toHaveBeenCalledWith('Agence archivee.');
  });

  it('filters agencies by search term and opens rename dialog', () => {
    const { result } = renderHook(() => useAgenciesManager());

    act(() => {
      result.current.setSearchTerm('b');
    });

    expect(result.current.filteredAgencies).toHaveLength(1);
    expect(result.current.filteredAgencies[0]?.id).toBe('agency-2');

    act(() => {
      result.current.openRenameDialog(createAgency({ id: 'agency-2', name: 'Agence B' }));
    });
    expect(result.current.renameOpen).toBe(true);
    expect(result.current.selectedAgency?.id).toBe('agency-2');
  });
});

