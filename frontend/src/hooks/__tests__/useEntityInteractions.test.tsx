import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useEntityInteractions } from '@/hooks/useEntityInteractions';
import { useNotifyError } from '@/hooks/useNotifyError';
import { getInteractionsByEntity } from '@/services/interactions/getInteractionsByEntity';

vi.mock('@/services/interactions/getInteractionsByEntity', () => ({
  getInteractionsByEntity: vi.fn()
}));

vi.mock('@/hooks/useNotifyError', () => ({
  useNotifyError: vi.fn()
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseEntityInteractionsTestWrapper';
  return Wrapper;
};

describe('useEntityInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads paginated entity interactions when entity id is present', async () => {
    vi.mocked(getInteractionsByEntity).mockResolvedValue({
      interactions: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1
    });

    const { result } = renderHook(() => useEntityInteractions('entity-1', 1, 20, true), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getInteractionsByEntity).toHaveBeenCalledWith('entity-1', 1, 20);
  });

  it('forwards query errors to useNotifyError', async () => {
    vi.mocked(getInteractionsByEntity).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useEntityInteractions('entity-1', 1, 20, true), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(useNotifyError).toHaveBeenCalled();
  });

  it('does not execute query when entity id is missing', async () => {
    vi.mocked(getInteractionsByEntity).mockResolvedValue({
      interactions: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1
    });

    const { result } = renderHook(() => useEntityInteractions(null, 1, 20, true), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });

    expect(getInteractionsByEntity).not.toHaveBeenCalled();
  });
});
