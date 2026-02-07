import { Interaction, InteractionUpdate } from '@/types';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { hydrateTimeline } from './hydrateTimeline';

export const updateInteractionOptimistic = async (
  interactionId: string,
  expectedUpdatedAt: string,
  updates: InteractionUpdate
): Promise<Interaction> => {
  if (!expectedUpdatedAt) {
    throw createAppError({
      code: 'CONFLICT',
      message: "La version du dossier est indisponible. Rechargez et reessayez.",
      source: 'client'
    });
  }

  const supabase = requireSupabaseClient();
  const { data, error, status } = await supabase
    .from('interactions')
    .update(updates)
    .eq('id', interactionId)
    .eq('updated_at', expectedUpdatedAt)
    .select('*');

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'write',
      resource: "l'interaction",
      status
    });
  }

  if (!data || data.length === 0) {
    throw createAppError({
      code: 'CONFLICT',
      message: 'Ce dossier a ete modifie par un autre utilisateur. Rechargez pour continuer.',
      source: 'db'
    });
  }

  return hydrateTimeline(data[0]);
};
