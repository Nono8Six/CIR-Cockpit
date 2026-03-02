import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useClients } from '@/hooks/useClients';
import { getClients } from '@/services/clients/getClients';
import { useNotifyError } from '@/hooks/useNotifyError';

vi.mock('@/services/clients/getClients', () => ({
  getClients: vi.fn()
}));

vi.mock('@/hooks/useNotifyError', () => ({
  useNotifyError: vi.fn()
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseClientsTestWrapper';
  return Wrapper;
};

describe('useClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads clients when enabled', async () => {
    vi.mocked(getClients).mockResolvedValue([]);

    const { result } = renderHook(
      () => useClients({ agencyId: 'agency-1', includeArchived: false, orphansOnly: false }, true),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getClients).toHaveBeenCalledWith({
      agencyId: 'agency-1',
      includeArchived: false,
      orphansOnly: false
    });
  });

  it('forwards query errors to useNotifyError', async () => {
    vi.mocked(getClients).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(
      () => useClients({ agencyId: 'agency-1', includeArchived: false, orphansOnly: false }, true),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(useNotifyError).toHaveBeenCalled();
  });

  it('does not execute query when disabled', async () => {
    vi.mocked(getClients).mockResolvedValue([]);

    renderHook(
      () => useClients({ agencyId: 'agency-1', includeArchived: false, orphansOnly: false }, false),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(getClients).not.toHaveBeenCalled();
    });
  });
});

