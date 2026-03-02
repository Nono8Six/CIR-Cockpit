import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { getAuditLogs } from '@/services/admin/getAuditLogs';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

vi.mock('@/services/admin/getAuditLogs', () => ({
  getAuditLogs: vi.fn()
}));

vi.mock('@/services/errors/mapAdminDomainError', () => ({
  mapAdminDomainError: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseAuditLogsTestWrapper';
  return Wrapper;
};

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads audit logs with normalized filters', async () => {
    vi.mocked(getAuditLogs).mockResolvedValue([]);

    const { result } = renderHook(
      () =>
        useAuditLogs(
          {
            agencyId: 'agency-1',
            actorId: null,
            from: '2026-01-01T00:00:00.000Z',
            to: null,
            entityTable: null
          },
          true
        ),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getAuditLogs).toHaveBeenCalledWith({
      agencyId: 'agency-1',
      actorId: null,
      from: '2026-01-01T00:00:00.000Z',
      to: null,
      entityTable: null
    });
  });

  it('maps query errors and reports them through handleUiError', async () => {
    const appError = createAppError({
      code: 'REQUEST_FAILED',
      message: 'Impossible de charger les audits.',
      source: 'edge'
    });
    vi.mocked(getAuditLogs).mockRejectedValue(new Error('boom'));
    vi.mocked(mapAdminDomainError).mockReturnValue(appError);

    renderHook(
      () =>
        useAuditLogs(
          {
            agencyId: 'agency-1'
          },
          true
        ),
      { wrapper: buildWrapper() }
    );

    await waitFor(() => {
      expect(handleUiError).toHaveBeenCalledWith(appError, appError.message, {
        source: 'useAuditLogs'
      });
    });
  });

  it('deduplicates identical error signatures across rerenders', async () => {
    const appError = createAppError({
      code: 'REQUEST_FAILED',
      message: 'Impossible de charger les audits.',
      source: 'edge'
    });
    vi.mocked(getAuditLogs).mockRejectedValue(new Error('boom'));
    vi.mocked(mapAdminDomainError).mockReturnValue(appError);

    const { rerender } = renderHook(
      ({ actorId }) =>
        useAuditLogs(
          {
            agencyId: 'agency-1',
            actorId
          },
          true
        ),
      {
        wrapper: buildWrapper(),
        initialProps: { actorId: 'user-1' }
      }
    );

    await waitFor(() => {
      expect(handleUiError).toHaveBeenCalledTimes(1);
    });

    rerender({ actorId: 'user-2' });

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenCalledTimes(2);
    });
    expect(handleUiError).toHaveBeenCalledTimes(1);
  });
});

