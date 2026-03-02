import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useInteractions } from '@/hooks/useInteractions';
import { useNotifyError } from '@/hooks/useNotifyError';
import { getInteractions } from '@/services/interactions/getInteractions';

vi.mock('@/services/interactions/getInteractions', () => ({
  getInteractions: vi.fn()
}));

vi.mock('@/hooks/useNotifyError', () => ({
  useNotifyError: vi.fn()
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseInteractionsTestWrapper';
  return Wrapper;
};

describe('useInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads interactions when agency id is present', async () => {
    vi.mocked(getInteractions).mockResolvedValue([]);

    const { result } = renderHook(() => useInteractions('agency-1', true), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getInteractions).toHaveBeenCalledWith('agency-1');
  });

  it('forwards query errors to useNotifyError', async () => {
    vi.mocked(getInteractions).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useInteractions('agency-1', true), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(useNotifyError).toHaveBeenCalled();
  });

  it('does not execute query when agency id is missing', async () => {
    vi.mocked(getInteractions).mockResolvedValue([]);

    const { result } = renderHook(() => useInteractions(null, true), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(getInteractions).not.toHaveBeenCalled();
  });
});

