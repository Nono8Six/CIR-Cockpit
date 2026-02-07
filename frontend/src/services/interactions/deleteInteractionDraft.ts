import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

type DeleteInteractionDraftInput = {
  userId: string;
  agencyId: string;
  formType?: string;
};

export const deleteInteractionDraft = async ({
  userId,
  agencyId,
  formType = 'interaction'
}: DeleteInteractionDraftInput): Promise<void> => {
  const supabase = requireSupabaseClient();
  const { error, status } = await supabase
    .from('interaction_drafts')
    .delete()
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .eq('form_type', formType);

  if (error) {
    throw mapPostgrestError(error, { operation: 'delete', resource: 'le brouillon', status });
  }
};
