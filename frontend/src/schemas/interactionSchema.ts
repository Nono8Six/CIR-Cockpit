import { z } from 'zod/v4';

import { interactionBaseSchema } from '../../../shared/schemas/interaction.schema';
import { Channel } from '@/types';
import { isInternalRelationValue, isProspectRelationValue, isSolicitationRelationValue } from '@/constants/relations';

const optionalUuid = z
  .string()
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  })
  .pipe(z.string().uuid().optional())
  .optional();

const interactionFormBaseSchema = interactionBaseSchema.extend({
  channel: z.nativeEnum(Channel, {
    message: 'Canal requis'
  }),
  mega_families: z.array(z.string()),
  entity_id: optionalUuid,
  contact_id: optionalUuid
});

export const interactionFormSchema = interactionFormBaseSchema.superRefine((values, ctx) => {
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
});

const interactionDraftBaseSchema = interactionBaseSchema.extend({
  channel: z.nativeEnum(Channel, {
    message: 'Canal requis'
  }),
  company_name: z.string().trim().min(1, 'Nom de la societe requis'),
  mega_families: z.array(z.string()),
  entity_id: optionalUuid,
  contact_id: optionalUuid
});

export const interactionDraftSchema = interactionDraftBaseSchema.superRefine((values, ctx) => {
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

  if (!isSolicitation && !values.contact_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nom de contact requis',
      path: ['contact_name']
    });
  }
});

export type InteractionFormValues = z.infer<typeof interactionFormSchema>;
export type InteractionDraftValues = z.infer<typeof interactionDraftSchema>;
