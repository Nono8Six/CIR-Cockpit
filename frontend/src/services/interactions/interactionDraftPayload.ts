import { z } from 'zod/v4';

import { Channel } from '@/types';
import { readObject } from '@/utils/recordNarrowing';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

export type InteractionDraftPayload = {
  values: Partial<InteractionFormValues>;
};

export type InteractionDraftRecord = {
  id: string;
  payload: InteractionDraftPayload;
  updated_at: string;
};

const interactionDraftValuesSnapshotSchema = z.object({
  channel: z.enum([Channel.PHONE, Channel.EMAIL, Channel.COUNTER, Channel.VISIT]).optional(),
  entity_type: z.string().optional(),
  contact_service: z.string().optional(),
  interaction_type: z.string().optional(),
  company_name: z.string().optional(),
  company_city: z.string().optional(),
  contact_first_name: z.string().optional(),
  contact_last_name: z.string().optional(),
  contact_position: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  subject: z.string().optional(),
  mega_families: z.array(z.string()).optional(),
  status_id: z.string().optional(),
  order_ref: z.string().optional(),
  reminder_at: z.string().optional(),
  notes: z.string().optional(),
  entity_id: z.string().optional(),
  contact_id: z.string().optional()
}).strict();

export const parseInteractionDraftPayload = (value: unknown): InteractionDraftPayload | null => {
  const payload = readObject({ payload: value }, 'payload');
  if (!payload) return null;

  const values = readObject(payload, 'values');
  if (!values) return null;

  const parsedValues = interactionDraftValuesSnapshotSchema.safeParse(values);
  if (!parsedValues.success) return null;

  return { values: parsedValues.data };
};
