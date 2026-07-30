import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

import type { Interaction, InteractionRow } from '@/types';
import { interactionsKey } from '@/services/query/queryKeys';
import { hydrateTimeline } from '@/services/interactions/hydrateTimeline';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { createAppError } from '@/services/errors/AppError';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notifyError';
import { reportError } from '@/services/errors/reportError';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import { upsertInteractionInList } from '@/utils/interactions/upsertInteractionInList';

const removeInteractionFromList = (list: Interaction[], id: string): Interaction[] => list.filter(item => item.id !== id);
const REALTIME_FALLBACK_INTERVAL_MS = 30_000;

export const useRealtimeInteractions = (agencyId: string | null, enabled: boolean) => {
  const queryClient = useQueryClient();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !agencyId) return;
    notifiedRef.current = false;

    const supabase = requireSupabaseClient();
    const channel = supabase.channel(`interactions:${agencyId}`);
    const orphanChannel = supabase.channel('interactions:orphans');
    let disposed = false;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    const failedChannels = new Set<typeof channel>();

    const refreshInteractions = () => {
      void invalidateInteractionsQuery(queryClient, agencyId);
    };

    const activatePollingFallback = (failedChannel: typeof channel) => {
      if (disposed || failedChannels.has(failedChannel)) return;
      failedChannels.add(failedChannel);

      if (!notifiedRef.current) {
        const appError = createAppError({
          code: 'NETWORK_ERROR',
          message: 'Mise à jour temps réel indisponible. Les données seront actualisées périodiquement.',
          source: 'network',
          retryable: true
        });
        reportError(appError, { source: 'useRealtimeInteractions' });
        notifyError(appError);
        notifiedRef.current = true;
      }

      refreshInteractions();
      fallbackTimer ??= setInterval(refreshInteractions, REALTIME_FALLBACK_INTERVAL_MS);
      void supabase.removeChannel(failedChannel);
    };

    const subscribeWithFallback = (realtimeChannel: typeof channel) => {
      realtimeChannel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          activatePollingFallback(realtimeChannel);
        }
      });
    };

    const handlePayload = (payload: RealtimePostgresChangesPayload<InteractionRow>) => {
      if (payload.eventType === 'DELETE') {
        const removedId = payload.old?.id;
        if (!removedId) return;
        queryClient.setQueryData<Interaction[]>(interactionsKey(agencyId), current => current ? removeInteractionFromList(current, removedId) : current);
        return;
      }

      const nextRow = payload.new;
      if (!nextRow) return;

      try {
        const hydrated = hydrateTimeline(nextRow);
        queryClient.setQueryData<Interaction[]>(interactionsKey(agencyId), current => current ? upsertInteractionInList(current, hydrated) : current);
      } catch (error) {
        const appError = normalizeError(error, 'Mise à jour temps réel indisponible.');
        reportError(appError, { source: 'useRealtimeInteractions' });
        if (!notifiedRef.current) {
          notifyError(appError);
          notifiedRef.current = true;
        }
        void invalidateInteractionsQuery(queryClient, agencyId);
      }
    };

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'interactions', filter: `agency_id=eq.${agencyId}` }, handlePayload);
    orphanChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'interactions', filter: 'agency_id=is.null' }, handlePayload);
    subscribeWithFallback(channel);
    subscribeWithFallback(orphanChannel);

    return () => {
      disposed = true;
      if (fallbackTimer) clearInterval(fallbackTimer);
      void supabase.removeChannel(channel);
      void supabase.removeChannel(orphanChannel);
    };
  }, [agencyId, enabled, queryClient]);
};
