import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useDirectoryDuplicates } from '@/hooks/useDirectoryDuplicates';
import { useNotifyError } from '@/hooks/useNotifyError';
import { getDirectoryDuplicates } from '@/services/directory/getDirectoryDuplicates';
import type { DirectoryDuplicatesInput } from 'shared/schemas/directory.schema';

vi.mock('@/services/directory/getDirectoryDuplicates', () => ({
  getDirectoryDuplicates: vi.fn(),
}));

vi.mock('@/hooks/useNotifyError', () => ({
  useNotifyError: vi.fn(),
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseDirectoryDuplicatesTestWrapper';
  return Wrapper;
};

const buildInput = (): DirectoryDuplicatesInput => ({
  kind: 'company',
  scope: { mode: 'active_agency' },
  includeArchived: true,
  name: 'Acme',
  city: 'Paris',
});

describe('useDirectoryDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the duplicates query when enabled', async () => {
    vi.mocked(getDirectoryDuplicates).mockResolvedValue({ ok: true, matches: [] });
    const input = buildInput();

    const { result } = renderHook(() => useDirectoryDuplicates(input), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getDirectoryDuplicates).toHaveBeenCalledWith(input);
  });

  it('does not run when disabled', async () => {
    vi.mocked(getDirectoryDuplicates).mockResolvedValue({ ok: true, matches: [] });
    const input = buildInput();

    renderHook(() => useDirectoryDuplicates(input, false), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(getDirectoryDuplicates).not.toHaveBeenCalled();
    });
  });

  it('forwards errors to useNotifyError', async () => {
    vi.mocked(getDirectoryDuplicates).mockRejectedValue(new Error('boom'));
    const input = buildInput();

    const { result } = renderHook(() => useDirectoryDuplicates(input), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(useNotifyError).toHaveBeenCalled();
  });
});
