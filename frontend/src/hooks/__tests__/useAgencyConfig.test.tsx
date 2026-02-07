import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { useAgencyConfig } from '@/hooks/useAgencyConfig';
import { createTestQueryClient } from '@/__tests__/test-utils';
import { getAgencyConfig } from '@/services/config/getAgencyConfig';

vi.mock('@/services/config/getAgencyConfig', () => ({
  getAgencyConfig: vi.fn()
}));
vi.mock('@/hooks/useNotifyError', () => ({
  useNotifyError: vi.fn()
}));

const mockGetAgencyConfig = vi.mocked(getAgencyConfig);

describe('useAgencyConfig', () => {
  it('does not run when disabled', async () => {
    const queryClient = createTestQueryClient();
    renderHook(() => useAgencyConfig('agency-1', false), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });
    expect(mockGetAgencyConfig).not.toHaveBeenCalled();
  });

  it('runs when enabled', async () => {
    const queryClient = createTestQueryClient();
    mockGetAgencyConfig.mockResolvedValue({
      statuses: [],
      services: [],
      entities: [],
      families: [],
      interactionTypes: []
    });

    renderHook(() => useAgencyConfig('agency-1', true), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });
    await waitFor(() => {
      expect(mockGetAgencyConfig).toHaveBeenCalledWith('agency-1');
    });
  });
});
