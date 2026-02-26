import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';

const MAX_SHORT_TEXT_LENGTH = 255;
const MAX_SUBJECT_LENGTH = 500;
const MAX_NOTES_LENGTH = 5000;
const CHANNEL_VALUES = ['Téléphone', 'Email', 'Comptoir', 'Visite'] as const;

const optionalText = z
  .string()
  .trim()
  .max(MAX_SHORT_TEXT_LENGTH, 'Texte trop long')
  .optional()
  .or(z.literal(''));
const optionalUuid = z
  .string()
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  })
  .pipe(uuidSchema.optional())
  .optional();

const isInternalRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.startsWith('interne') && normalized.includes('cir');
};

const isSolicitationRelationValue = (value?: string | null): boolean =>
  (value ?? '').trim().toLowerCase() === 'sollicitation';

const isProspectRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.includes('prospect') || normalized.includes('particulier');
};

const interactionCoreSchema = z.object({
  channel: z.enum(CHANNEL_VALUES, { message: 'Canal requis' }),
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
}).strict();

export const addSharedInteractionRules = (
  values: z.infer<typeof interactionCoreSchema>,
  ctx: z.RefinementCtx
) => {
  const hasPhone = Boolean(values.contact_phone?.trim());
  const hasEmail = Boolean(values.contact_email?.trim());
  const isInternal = isInternalRelationValue(values.entity_type);
  const isSolicitation = isSolicitationRelationValue(values.entity_type);
  if (isSolicitation && !hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Numero requis',
      path: ['contact_phone']
    });
  } else if (!isInternal && !isSolicitation && !hasPhone && !hasEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telephone ou email requis',
      path: ['contact_phone']
    });
  }

  if (values.entity_type.trim().toLowerCase() === 'client') {
    if (!values.entity_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Client requis',
        path: ['entity_id']
      });
    }
    if (!values.contact_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contact requis',
        path: ['contact_id']
      });
    }
    return;
  }
  const isProspect = isProspectRelationValue(values.entity_type);

  if (!isInternal && !values.company_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Societe requise',
      path: ['company_name']
    });
  }
  if (isSolicitation) {
    return;
  }
  if (!values.contact_first_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Prenom requis',
      path: ['contact_first_name']
    });
  }
  if (!values.contact_last_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nom requis',
      path: ['contact_last_name']
    });
  }
  if (values.entity_type.trim().toLowerCase() === 'fournisseur' && !values.contact_position?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fonction requise',
      path: ['contact_position']
    });
  }
  if (isProspect && !values.company_city?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ville requise',
      path: ['company_city']
    });
  }
};

const addSharedInteractionDraftRules = (
  values: z.infer<typeof interactionCoreSchema>,
  ctx: z.RefinementCtx
) => {
  const hasPhone = Boolean(values.contact_phone?.trim());
  const hasEmail = Boolean(values.contact_email?.trim());
  const isInternal = isInternalRelationValue(values.entity_type);
  const isSolicitation = isSolicitationRelationValue(values.entity_type);
  if (isSolicitation && !hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Numero requis',
      path: ['contact_phone']
    });
  } else if (!isInternal && !isSolicitation && !hasPhone && !hasEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telephone ou email requis',
      path: ['contact_phone']
    });
  }

  if (values.entity_type.trim().toLowerCase() === 'client') {
    if (!values.entity_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Client requis',
        path: ['entity_id']
      });
    }
    if (!values.contact_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contact requis',
        path: ['contact_id']
      });
    }
  }
};

export const interactionBaseSchema = interactionCoreSchema;
export const interactionFormSchema = interactionCoreSchema.superRefine(addSharedInteractionRules);

const interactionDraftBaseSchema = interactionCoreSchema.extend({
  id: z.string().trim().min(1, 'Identifiant interaction requis').optional(),
  agency_id: optionalUuid,
  created_by: z.string().trim().min(1, 'Auteur requis').optional(),
  timeline: z.array(z.unknown()).optional(),
  company_name: z.string().trim().min(1, 'Nom de la societe requis')
}).strict();

export const interactionDraftSchema = interactionDraftBaseSchema.superRefine((values, ctx) => {
  addSharedInteractionDraftRules(values, ctx);

  if (!isSolicitationRelationValue(values.entity_type) && !values.contact_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nom de contact requis',
      path: ['contact_name']
    });
  }
});

export type InteractionInput = z.infer<typeof interactionFormSchema>;
export type InteractionFormValues = z.infer<typeof interactionFormSchema>;
export type InteractionDraftValues = z.infer<typeof interactionDraftSchema>;
