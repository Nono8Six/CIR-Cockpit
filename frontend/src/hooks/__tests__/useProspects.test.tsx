import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useProspects } from '@/hooks/useProspects';
import { useNotifyError } from '@/hooks/useNotifyError';
import { getProspects } from '@/services/entities/getProspects';

vi.mock('@/services/entities/getProspects', () => ({
  getProspects: vi.fn()
}));

vi.mock('@/hooks/useNotifyError', () => ({
  useNotifyError: vi.fn()
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseProspectsTestWrapper';
  return Wrapper;
};

describe('useProspects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads prospects when enabled', async () => {
    vi.mocked(getProspects).mockResolvedValue([]);

    const { result } = renderHook(
      () => useProspects({ agencyId: 'agency-1', includeArchived: true, orphansOnly: false }, true),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getProspects).toHaveBeenCalledWith({
      agencyId: 'agency-1',
      includeArchived: true,
      orphansOnly: false
    });
  });

  it('forwards query errors to useNotifyError', async () => {
    vi.mocked(getProspects).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(
      () => useProspects({ agencyId: 'agency-1', includeArchived: false, orphansOnly: true }, true),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(useNotifyError).toHaveBeenCalled();
  });

  it('does not execute query when disabled', async () => {
    vi.mocked(getProspects).mockResolvedValue([]);

    renderHook(
      () => useProspects({ agencyId: 'agency-1', includeArchived: false, orphansOnly: false }, false),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(getProspects).not.toHaveBeenCalled();
    });
  });
});

