import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';

const MAX_SHORT_TEXT_LENGTH = 255;
const MAX_SUBJECT_LENGTH = 500;
const MAX_NOTES_LENGTH = 5000;

const optionalText = z
  .string()
  .trim()
  .max(MAX_SHORT_TEXT_LENGTH, 'Texte trop long')
  .optional()
  .or(z.literal(''));
const optionalUuid = uuidSchema.optional();

export const interactionBaseSchema = z.object({
  channel: z.string().trim().min(1, 'Canal requis').max(80, 'Canal trop long'),
  entity_type: z.string().trim().min(1, 'Type de tiers requis').max(80, 'Type de tiers trop long'),
  contact_service: z.string().trim().min(1, 'Service requis').max(120, 'Service trop long'),
  company_name: optionalText,
  company_city: optionalText,
  contact_first_name: optionalText,
  contact_last_name: optionalText,
  contact_position: optionalText,
  contact_name: optionalText,
  contact_phone: z.string().trim().max(32, 'Numero de telephone trop long').optional().or(z.literal('')),
  contact_email: z.string().trim().email('Email invalide').max(254, 'Email trop long').optional().or(z.literal('')),
  subject: z.string().trim().min(1, 'Sujet requis').max(MAX_SUBJECT_LENGTH, 'Sujet trop long'),
  mega_families: z.array(z.string().trim().max(80, 'Famille trop longue')).optional(),
  status_id: z.string().trim().min(1, 'Statut requis'),
  interaction_type: z.string().trim().min(1, "Type d'interaction requis").max(120, "Type d'interaction trop long"),
  order_ref: optionalText,
  reminder_at: z.string().optional(),
  notes: z.string().max(MAX_NOTES_LENGTH, 'Notes trop longues').optional(),
  entity_id: optionalUuid,
  contact_id: optionalUuid
});

export const interactionDraftSchema = interactionBaseSchema;

export type InteractionInput = z.infer<typeof interactionBaseSchema>;
