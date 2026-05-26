import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';

import { useAgencyConfig } from '../admin/agencies/core/useAgencyConfig';
import { createTestQueryClient } from '@/__tests__/test-utils';
import { getConfigSnapshot } from '@/services/config';

vi.mock('@/services/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/config')>();
  return {
    ...actual,
    getConfigSnapshot: vi.fn()
  };
});

const mockGetConfigSnapshot = vi.mocked(getConfigSnapshot);

const BASE_SNAPSHOT: ResolvedConfigSnapshot = {
  references: {
    statuses: [],
    services: [],
    families: [],
    interaction_types: [],
    departments: []
  }
};

describe('useAgencyConfig', () => {
  it('does not run when disabled', async () => {
    const queryClient = createTestQueryClient();
    renderHook(() => useAgencyConfig('agency-1', false), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });
    expect(mockGetConfigSnapshot).not.toHaveBeenCalled();
  });

  it('runs when enabled', async () => {
    const queryClient = createTestQueryClient();
    mockGetConfigSnapshot.mockResolvedValue(BASE_SNAPSHOT);

    const { result } = renderHook(() => useAgencyConfig('agency-1', true), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await waitFor(() => {
      expect(mockGetConfigSnapshot).toHaveBeenCalledWith('agency-1');
      expect(result.current.data).toEqual({
        statuses: [],
        services: [],
        families: [],
        interactionTypes: []
      });
    });
  });
});
