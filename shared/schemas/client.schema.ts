import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';
import { clientContactFormSchema } from './client-contact.schema.ts';
import { officialCompanyFieldsSchema } from './directory.schema.ts';

export const clientNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ''))
  .refine((value) => /^\d{1,10}$/.test(value), {
    message: 'Numero client invalide'
  });

export const accountTypeSchema = z.enum(['term', 'cash']);
export const clientKindSchema = z.enum(['company', 'individual']);

const optionalTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? '');

export const optionalCommercialIdSchema = z
  .union([uuidSchema, z.literal(''), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const clientBaseSchema = z.object({
  client_number: clientNumberSchema,
  client_kind: clientKindSchema,
  name: z.string().trim().min(1, 'Nom requis'),
  postal_code: z.string().regex(/^\d{5}$/, 'Code postal invalide'),
  department: z.string().regex(/^\d{2,3}$/, 'Departement invalide'),
  city: z.string().trim().min(1, 'Ville requise'),
  notes: z.string().trim().optional().nullable(),
  agency_id: uuidSchema
}).extend(officialCompanyFieldsSchema.shape).strict();

export const clientCompanyFormSchema = clientBaseSchema.extend({
  client_kind: z.literal('company'),
  account_type: accountTypeSchema,
  address: z.string().trim().min(1, 'Adresse requise'),
  cir_commercial_id: optionalCommercialIdSchema.optional()
}).strict();

export const clientIndividualFormSchema = clientBaseSchema.extend({
  client_kind: z.literal('individual'),
  account_type: z.literal('cash'),
  address: optionalTextSchema,
  cir_commercial_id: optionalCommercialIdSchema.optional(),
  primary_contact: clientContactFormSchema
}).strict().superRefine((values, ctx) => {
  if (values.cir_commercial_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Aucun commercial ne doit etre affecte a un client particulier',
      path: ['cir_commercial_id']
    });
  }
});

export const clientFormSchema = z.discriminatedUnion('client_kind', [
  clientCompanyFormSchema,
  clientIndividualFormSchema
]);

export type ClientCompanyFormValues = z.input<typeof clientCompanyFormSchema>;
export type ClientIndividualFormValues = z.input<typeof clientIndividualFormSchema>;
export type ClientFormValues = z.input<typeof clientFormSchema>;
export type ClientPrimaryContactFormValues = z.input<typeof clientContactFormSchema>;
