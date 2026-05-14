import { z } from 'zod/v4';

import { accountTypeSchema, clientKindSchema, clientNumberSchema } from 'shared/schemas/client.schema';
import { optionalEntityDepartmentCodeSchema } from 'shared/schemas/department.schema';
import { officialDataSourceSchema } from 'shared/schemas/directory.schema';

const optionalTextSchema = z.union([z.string(), z.null(), z.undefined()]).transform((value) => value?.trim() ?? '');
const optionalPostalCodeSchema = optionalTextSchema.refine((value) => value.length === 0 || /^\d{5}$/.test(value), {
  message: 'Code postal invalide'
});
const optionalUuidSchema = z.union([z.string().uuid(), z.literal(''), z.null(), z.undefined()]).transform((value) => typeof value === 'string' ? value.trim() : '');
const optionalEmailSchema = z
  .union([z.string().trim().email('Email invalide'), z.literal(''), z.null(), z.undefined()])
  .transform((value) => typeof value === 'string' ? value.trim() : '');

export const onboardingFormSchema = z.strictObject({
  intent: z.enum(['client', 'prospect']),
  client_kind: clientKindSchema.default('company'),
  name: z.string().trim().min(1, 'Nom requis'),
  first_name: optionalTextSchema,
  last_name: optionalTextSchema,
  phone: optionalTextSchema,
  email: optionalEmailSchema,
  address: optionalTextSchema,
  postal_code: optionalPostalCodeSchema,
  department: optionalEntityDepartmentCodeSchema,
  city: z.string().trim().min(1, 'Ville requise'),
  siret: optionalTextSchema,
  siren: optionalTextSchema,
  naf_code: optionalTextSchema,
  official_name: optionalTextSchema,
  official_data_source: z.union([officialDataSourceSchema, z.null(), z.undefined()]).transform((value) => value ?? null),
  official_data_synced_at: optionalTextSchema,
  notes: optionalTextSchema,
  agency_id: z.string().trim().min(1, 'Agence requise'),
  client_number: z.union([clientNumberSchema, z.literal('')]).default(''),
  account_type: accountTypeSchema.default('term'),
  cir_commercial_id: optionalUuidSchema
}).superRefine((values, ctx) => {
  const isIndividualClient = values.intent === 'client' && values.client_kind === 'individual';

  if (!isIndividualClient) {
    return;
  }

  if (!values.first_name.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Prenom requis',
      path: ['first_name']
    });
  }

  if (!values.last_name.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nom requis',
      path: ['last_name']
    });
  }

  if (!values.phone.trim() && !values.email.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telephone ou email requis',
      path: ['phone']
    });
  }

  if (!values.postal_code.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Code postal requis',
      path: ['postal_code']
    });
  }

  if ((values.account_type ?? 'term') !== 'cash') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le client particulier est toujours comptant',
      path: ['account_type']
    });
  }

  if (values.cir_commercial_id.trim().length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Aucun commercial ne doit etre affecte a un client particulier',
      path: ['cir_commercial_id']
    });
  }
});

export type OnboardingFormInput = z.input<typeof onboardingFormSchema>;
export type OnboardingValues = z.output<typeof onboardingFormSchema>;
