import { interactionFormSchema } from '@/schemas/interactionSchema';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { readObject, readString } from '@/utils/recordNarrowing';
import { toJsonValue } from '@/utils/toJsonValue';
import type { InteractionDraftPayload, InteractionDraftRecord } from './interactionDraftPayload';

type SaveInteractionDraftInput = { userId: string; agencyId: string; payload: InteractionDraftPayload; formType?: string };

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

export const saveInteractionDraft = async ({ userId, agencyId, payload, formType = 'interaction' }: SaveInteractionDraftInput): Promise<InteractionDraftRecord> => {
  const supabase = requireSupabaseClient();
  const { data, error, status } = await supabase.from('interaction_drafts').upsert({ user_id: userId, agency_id: agencyId, form_type: formType, payload: toJsonValue(payload) }, { onConflict: 'user_id,agency_id,form_type' }).select('id, payload, updated_at').single();
  if (error) throw mapPostgrestError(error, { operation: 'upsert', resource: 'le brouillon', status });
  const draft = toDraftRecord(data);
  if (!draft) throw createAppError({ code: 'DRAFT_SAVE_FAILED', message: 'Impossible de sauvegarder le brouillon.', source: 'db' });
  return draft;
};
