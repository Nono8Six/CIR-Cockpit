import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

import type { Interaction, InteractionRow } from '@/types';
import { interactionsKey } from '@/services/query/queryKeys';
import { hydrateTimeline } from '@/services/interactions/hydrateTimeline';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import { upsertInteractionInList } from '@/utils/interactions/upsertInteractionInList';

const removeInteractionFromList = (list: Interaction[], id: string): Interaction[] => list.filter(item => item.id !== id);

export const useRealtimeInteractions = (agencyId: string | null, enabled: boolean) => {
  const queryClient = useQueryClient();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !agencyId) return;
    notifiedRef.current = false;

    const supabase = requireSupabaseClient();
    const channel = supabase.channel(`interactions:${agencyId}`);
    const orphanChannel = supabase.channel('interactions:orphans');

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
        const appError = normalizeError(error, 'Mise a jour temps reel indisponible.');
        reportError(appError, { source: 'useRealtimeInteractions' });
        if (!notifiedRef.current) {
          notifyError(appError);
          notifiedRef.current = true;
        }
        void invalidateInteractionsQuery(queryClient, agencyId);
      }
    };

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'interactions', filter: `agency_id=eq.${agencyId}` }, handlePayload).subscribe();
    orphanChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'interactions', filter: 'agency_id=is.null' }, handlePayload).subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(orphanChannel); };
  }, [agencyId, enabled, queryClient]);
};
