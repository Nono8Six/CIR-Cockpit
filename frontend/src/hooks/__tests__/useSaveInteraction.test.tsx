import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { okAsync, errAsync } from 'neverthrow';
import type { PropsWithChildren } from 'react';

import { useSaveInteraction } from '@/hooks/useSaveInteraction';
import { interactionsKey } from '@/services/query/queryKeys';
import { createTestQueryClient } from '@/__tests__/test-utils';
import type { Interaction } from '@/types';
import { saveInteraction } from '@/services/interactions/saveInteraction';
import { notifyError } from '@/services/errors/notify';
import { createAppError } from '@/services/errors/AppError';

vi.mock('@/services/interactions/saveInteraction', () => ({
  saveInteraction: vi.fn()
}));
vi.mock('@/services/errors/notify', () => ({
  notifyError: vi.fn()
}));
vi.mock('@/services/errors/reportError', () => ({
  reportError: vi.fn()
}));

const mockSaveInteraction = vi.mocked(saveInteraction);
const mockNotifyError = vi.mocked(notifyError);

describe('useSaveInteraction', () => {
  it('updates cache on success', async () => {
    const queryClient = createTestQueryClient();
    const interaction = { id: '1' } as Interaction;
    mockSaveInteraction.mockReturnValue(okAsync(interaction));

    const { result } = renderHook(() => useSaveInteraction('agency-1'), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });
    await act(async () => {
      await result.current.mutateAsync({} as never);
    });

    const cached = queryClient.getQueryData(interactionsKey('agency-1')) as Interaction[] | undefined;
    expect(cached?.[0]?.id).toBe('1');
  });

  it('notifies on error', async () => {
    const queryClient = createTestQueryClient();
    mockSaveInteraction.mockReturnValue(
      errAsync(
        createAppError({
          code: 'UNKNOWN_ERROR',
          message: 'fail',
          source: 'client'
        })
      )
    );

    const { result } = renderHook(() => useSaveInteraction('agency-1'), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await act(async () => {
      await result.current.mutateAsync({} as never).catch(() => undefined);
    });

    expect(mockNotifyError).toHaveBeenCalledTimes(1);
  });

  it('passes contact_email and interaction_type to saveInteraction', async () => {
    const queryClient = createTestQueryClient();
    const draft = {
      contact_email: 'contact@acme.fr',
      interaction_type: 'Devis'
    } as never;
    mockSaveInteraction.mockReturnValue(okAsync({ id: '1' } as Interaction));

    const { result } = renderHook(() => useSaveInteraction('agency-1'), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await act(async () => {
      await result.current.mutateAsync(draft);
    });

    const [[firstArg]] = mockSaveInteraction.mock.calls;
    expect(firstArg).toEqual(draft);
  });
});
