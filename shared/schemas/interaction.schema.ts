import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';

const optionalText = z.string().trim().optional().or(z.literal(''));
const optionalUuid = uuidSchema.optional();

export const interactionBaseSchema = z.object({
  channel: z.string().trim().min(1, 'Canal requis'),
  entity_type: z.string().trim().min(1, 'Type de tiers requis'),
  contact_service: z.string().trim().min(1, 'Service requis'),
  company_name: optionalText,
  company_city: optionalText,
  contact_first_name: optionalText,
  contact_last_name: optionalText,
  contact_position: optionalText,
  contact_name: optionalText,
  contact_phone: z.string().optional().or(z.literal('')),
  contact_email: z.string().trim().email('Email invalide').optional().or(z.literal('')),
  subject: z.string().trim().min(1, 'Sujet requis'),
  mega_families: z.array(z.string()).optional(),
  status_id: z.string().trim().min(1, 'Statut requis'),
  interaction_type: z.string().trim().min(1, "Type d'interaction requis"),
  order_ref: optionalText,
  reminder_at: z.string().optional(),
  notes: z.string().optional(),
  entity_id: optionalUuid,
  contact_id: optionalUuid
});

export const interactionDraftSchema = interactionBaseSchema;

export type InteractionInput = z.infer<typeof interactionBaseSchema>;
