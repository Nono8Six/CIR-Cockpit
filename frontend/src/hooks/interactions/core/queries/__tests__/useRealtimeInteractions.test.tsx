import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRealtimeInteractions } from '@/hooks/interactions/core/queries/useRealtimeInteractions';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import { notifyError } from '@/services/errors/notifyError';
import { reportError } from '@/services/errors/reportError';

const queryClient = { invalidateQueries: vi.fn() };

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => queryClient
}));

vi.mock('@/services/supabase/requireSupabaseClient', () => ({
  requireSupabaseClient: vi.fn()
}));

vi.mock('@/services/query/queryInvalidation', () => ({
  invalidateInteractionsQuery: vi.fn(() => Promise.resolve())
}));

vi.mock('@/services/errors/notifyError', () => ({ notifyError: vi.fn() }));
vi.mock('@/services/errors/reportError', () => ({ reportError: vi.fn() }));

type SubscriptionStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

const createChannel = () => {
  let subscriptionCallback: ((status: SubscriptionStatus) => void) | null = null;
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn((callback: (status: SubscriptionStatus) => void) => {
      subscriptionCallback = callback;
      return channel;
    }),
    emitStatus: (status: SubscriptionStatus) => subscriptionCallback?.(status)
  };
  return channel;
};

describe('useRealtimeInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ne crée aucun canal lorsque le temps réel est hors périmètre de la page', () => {
    const supabase = { channel: vi.fn(), removeChannel: vi.fn() };
    vi.mocked(requireSupabaseClient).mockReturnValue(supabase as never);

    renderHook(() => useRealtimeInteractions('agency-1', false));

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('arrête les reconnexions en échec et bascule sur un rafraîchissement périodique dédupliqué', () => {
    const agencyChannel = createChannel();
    const orphanChannel = createChannel();
    const supabase = {
      channel: vi.fn()
        .mockReturnValueOnce(agencyChannel)
        .mockReturnValueOnce(orphanChannel),
      removeChannel: vi.fn(() => Promise.resolve('ok'))
    };
    vi.mocked(requireSupabaseClient).mockReturnValue(supabase as never);

    const { unmount } = renderHook(() => useRealtimeInteractions('agency-1', true));
    agencyChannel.emitStatus('CHANNEL_ERROR');
    orphanChannel.emitStatus('TIMED_OUT');

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(invalidateInteractionsQuery).toHaveBeenCalledTimes(2);
    expect(supabase.removeChannel).toHaveBeenCalledWith(agencyChannel);
    expect(supabase.removeChannel).toHaveBeenCalledWith(orphanChannel);

    vi.advanceTimersByTime(30_000);
    expect(invalidateInteractionsQuery).toHaveBeenCalledTimes(3);

    unmount();
    vi.advanceTimersByTime(60_000);
    expect(invalidateInteractionsQuery).toHaveBeenCalledTimes(3);
  });
});
