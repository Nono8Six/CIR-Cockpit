import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { errAsync, okAsync } from 'neverthrow';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useDeleteInteraction } from '@/hooks/useDeleteInteraction';
import { deleteInteraction } from '@/services/interactions/deleteInteraction';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { interactionsKey } from '@/services/query/queryKeys';
import type { Interaction } from '@/types';

vi.mock('@/services/interactions/deleteInteraction', () => ({
  deleteInteraction: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

describe('useDeleteInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes deleted interaction from interactions cache', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(interactionsKey('agency-1'), [
      { id: 'interaction-1' },
      { id: 'interaction-2' }
    ] as Interaction[]);

    vi.mocked(deleteInteraction).mockReturnValue(okAsync('interaction-1'));

    const { result } = renderHook(
      () => useDeleteInteraction({ agencyId: 'agency-1', entityId: 'entity-1' }),
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
      }
    );

    await act(async () => {
      await result.current.mutateAsync('interaction-1');
    });

    const cached = queryClient.getQueryData(interactionsKey('agency-1')) as Interaction[] | undefined;
    expect(cached?.map((item) => item.id)).toEqual(['interaction-2']);
  });

  it('routes deletion errors through handleUiError', async () => {
    vi.mocked(deleteInteraction).mockReturnValue(
      errAsync(createAppError({
        code: 'DB_WRITE_FAILED',
        message: "Impossible de supprimer l'interaction.",
        source: 'edge'
      }))
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useDeleteInteraction({ agencyId: 'agency-1', entityId: 'entity-1' }),
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
      }
    );

    await act(async () => {
      await result.current.mutateAsync('interaction-1').catch(() => undefined);
    });

    expect(handleUiError).toHaveBeenCalled();
  });
});
