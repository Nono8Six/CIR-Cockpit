import { act, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { errAsync, okAsync } from 'neverthrow';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useReassignEntity } from '@/hooks/useReassignEntity';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { reassignEntity } from '@/services/entities/reassignEntity';
import { invalidateEntityDirectoryQueries } from '@/services/query/queryInvalidation';

vi.mock('@/services/entities/reassignEntity', () => ({
  reassignEntity: vi.fn()
}));
vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));
vi.mock('@/services/query/queryInvalidation', () => ({
  invalidateEntityDirectoryQueries: vi.fn().mockResolvedValue(undefined)
}));

const mockReassignEntity = vi.mocked(reassignEntity);
const mockHandleUiError = vi.mocked(handleUiError);
const mockInvalidateEntityDirectoryQueries = vi.mocked(invalidateEntityDirectoryQueries);

describe('useReassignEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates target and current directory scopes on success', async () => {
    const queryClient = createTestQueryClient();
    mockReassignEntity.mockReturnValue(okAsync({
      entity: { id: 'entity-1' } as never,
      propagated_interactions_count: 2
    }));

    const { result } = renderHook(() => useReassignEntity('agency-source', false), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await act(async () => {
      await result.current.mutateAsync({
        entity_id: 'entity-1',
        target_agency_id: 'agency-target'
      });
    });

    expect(mockInvalidateEntityDirectoryQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateEntityDirectoryQueries).toHaveBeenNthCalledWith(1, queryClient, {
      agencyId: 'agency-target'
    });
    expect(mockInvalidateEntityDirectoryQueries).toHaveBeenNthCalledWith(2, queryClient, {
      agencyId: 'agency-source',
      orphansOnly: false
    });
  });

  it('skips duplicate invalidation when target equals current scope', async () => {
    const queryClient = createTestQueryClient();
    mockReassignEntity.mockReturnValue(okAsync({
      entity: { id: 'entity-1' } as never,
      propagated_interactions_count: 1
    }));

    const { result } = renderHook(() => useReassignEntity('agency-1', false), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await act(async () => {
      await result.current.mutateAsync({
        entity_id: 'entity-1',
        target_agency_id: 'agency-1'
      });
    });

    expect(mockInvalidateEntityDirectoryQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateEntityDirectoryQueries).toHaveBeenCalledWith(queryClient, {
      agencyId: 'agency-1'
    });
  });

  it('forwards errors to handleUiError', async () => {
    const queryClient = createTestQueryClient();
    mockReassignEntity.mockReturnValue(errAsync(
      createAppError({
        code: 'REQUEST_FAILED',
        message: "Impossible de reassigner l'entite.",
        source: 'edge'
      })
    ));

    const { result } = renderHook(() => useReassignEntity('agency-1', false), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await act(async () => {
      await result.current.mutateAsync({
        entity_id: 'entity-1',
        target_agency_id: 'agency-2'
      }).catch(() => undefined);
    });

    expect(mockHandleUiError).toHaveBeenCalledTimes(1);
  });
});
