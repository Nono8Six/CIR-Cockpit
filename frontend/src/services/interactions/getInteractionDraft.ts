import { interactionFormSchema } from '@/schemas/interactionSchema';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { readObject, readString } from '@/utils/recordNarrowing';
import type { InteractionDraftRecord } from './interactionDraftPayload';

type GetInteractionDraftInput = { userId: string; agencyId: string; formType?: string };

const toDraftRecord = (value: unknown): InteractionDraftRecord | null => {
  const row = readObject({ row: value }, 'row');
  if (!row) return null;
  const id = readString(row, 'id');
  const updatedAt = readString(row, 'updated_at');
  const payload = readObject(row, 'payload');
  if (!id || !updatedAt || !payload) return null;
  const values = readObject(payload, 'values');
  if (!values) return null;
  const parsed = interactionFormSchema.safeParse(values);
  if (!parsed.success) return null;
  return { id, updated_at: updatedAt, payload: { values: parsed.data } };
};

export const getInteractionDraft = async ({ userId, agencyId, formType = 'interaction' }: GetInteractionDraftInput): Promise<InteractionDraftRecord | null> => {
  const supabase = requireSupabaseClient();
  const { data, error, status } = await supabase.from('interaction_drafts').select('id, payload, updated_at').eq('user_id', userId).eq('agency_id', agencyId).eq('form_type', formType).maybeSingle();
  if (error) throw mapPostgrestError(error, { operation: 'read', resource: 'le brouillon', status });
  if (!data) return null;
  const draft = toDraftRecord(data);
  if (!draft) throw createAppError({ code: 'DRAFT_NOT_FOUND', message: 'Brouillon introuvable.', source: 'db' });
  return draft;
};
