import { z } from 'zod/v4';

import { uuidSchema } from '../admin/auth.schema.ts';
import { accountTypeSchema, clientNumberSchema } from './client.schema.ts';
import { directoryScopeInputSchema } from '../system/directory.schema.ts';

const governedCodeSchema = z
  .string()
  .trim()
  .min(1, 'Code requis')
  .max(64, 'Code trop long')
  .regex(/^[a-z][a-z0-9_]*$/, 'Code invalide');

const labelSchema = z.string().trim().min(1, 'Libelle requis').max(120, 'Libelle trop long');
const nullableTextSchema = z.string().trim().min(1, 'Valeur vide interdite').nullable();
const timestampSchema = z.string().trim().datetime({ offset: true });

export const tierRoleCodeSchema = governedCodeSchema;

export const tierRoleTypeSchema = z.strictObject({
  code: tierRoleCodeSchema,
  label: labelSchema,
  description: nullableTextSchema,
  is_active: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const tierRoleSchema = z.strictObject({
  id: uuidSchema,
  entity_id: uuidSchema,
  role_code: tierRoleCodeSchema,
  valid_from: timestampSchema,
  valid_to: timestampSchema.nullable(),
  source_system: z.enum(['entities_compatibility', 'canonical']),
  source_record_id: z.string().trim().min(1, 'Identifiant source requis'),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const customerAccountSourceSchema = z.enum([
  'entities_compatibility',
  'canonical',
  'erp_as400'
]);

export const customerAccountSchema = z.strictObject({
  id: uuidSchema,
  entity_id: uuidSchema,
  client_number: clientNumberSchema,
  account_type: accountTypeSchema,
  account_status: nullableTextSchema,
  agency_id: uuidSchema,
  primary_commercial_id: uuidSchema.nullable(),
  number_authority: z.literal('erp_as400'),
  status_authority: z.literal('erp_as400'),
  source_system: customerAccountSourceSchema,
  source_record_id: z.string().trim().min(1, 'Identifiant source requis'),
  source_synced_at: timestampSchema.nullable(),
  archived_at: timestampSchema.nullable(),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema
}).superRefine((account, ctx) => {
  if (account.source_system !== 'entities_compatibility' && !account.primary_commercial_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Commercial principal requis',
      path: ['primary_commercial_id']
    });
  }
});

export const customerAccountSecondaryCommercialSchema = z.strictObject({
  id: uuidSchema,
  customer_account_id: uuidSchema,
  commercial_id: uuidSchema,
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema
});

export const organizationClassificationSchema = z.strictObject({
  entity_id: uuidSchema,
  legal_form_code: nullableTextSchema,
  naf_code: nullableTextSchema
});

export const businessProfileTypeSchema = z.strictObject({
  code: governedCodeSchema,
  label: labelSchema,
  description: nullableTextSchema,
  is_active: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const organizationBusinessProfileSchema = z.strictObject({
  id: uuidSchema,
  entity_id: uuidSchema,
  profile_code: governedCodeSchema,
  is_primary: z.boolean(),
  valid_from: timestampSchema,
  valid_to: timestampSchema.nullable(),
  source_system: z.string().trim().min(1, 'Systeme source requis').max(64, 'Systeme source trop long'),
  source_record_id: z.string().trim().min(1, 'Identifiant source requis'),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const organizationBusinessProfileSetSchema = z
  .array(organizationBusinessProfileSchema)
  .superRefine((profiles, ctx) => {
    const activeProfiles = profiles.filter((profile) => profile.valid_to === null);
    const activePrimaryCount = activeProfiles.filter((profile) => profile.is_primary).length;

    if (activeProfiles.length > 0 && activePrimaryCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un profil metier principal actif est requis'
      });
    }
  });

export const tierReadProvenanceSchema = z.strictObject({
  source_system: z.string().trim().min(1, 'Systeme source requis').max(64, 'Systeme source trop long'),
  source_record_id: z.string().trim().min(1, 'Identifiant source requis'),
  authority: z.enum(['cir_cockpit', 'erp_as400', 'compatibility']),
  synced_at: timestampSchema.nullable()
});

export const tierAgencyReadSchema = z.strictObject({
  id: uuidSchema,
  name: labelSchema
});

export const tierCommercialReadSchema = z.strictObject({
  id: uuidSchema,
  display_name: labelSchema,
  email: z.string().trim().email('Email invalide')
});

export const tierRoleReadSchema = z.strictObject({
  id: uuidSchema,
  code: tierRoleCodeSchema,
  label: labelSchema,
  is_active_reference: z.boolean(),
  valid_from: timestampSchema,
  valid_to: timestampSchema.nullable(),
  provenance: tierReadProvenanceSchema
});

export const tierBusinessProfileReadSchema = z.strictObject({
  id: uuidSchema,
  code: governedCodeSchema,
  label: labelSchema,
  is_primary: z.boolean(),
  valid_from: timestampSchema,
  valid_to: timestampSchema.nullable(),
  provenance: tierReadProvenanceSchema
});

export const tierBusinessProfilesReadSchema = z.strictObject({
  state: z.enum(['available', 'reference_data_missing', 'assignment_missing']),
  primary: tierBusinessProfileReadSchema.nullable(),
  secondary: z.array(tierBusinessProfileReadSchema)
}).superRefine((profiles, ctx) => {
  if (profiles.state === 'available' && !profiles.primary) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Profil metier principal requis',
      path: ['primary']
    });
  }
  if (profiles.state !== 'available' && (profiles.primary || profiles.secondary.length > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Profils metier incompatibles avec l etat manquant'
    });
  }
});

export const tierCustomerAccountReadSchema = z.strictObject({
  id: uuidSchema,
  client_number: clientNumberSchema,
  account_type: accountTypeSchema,
  account_status: nullableTextSchema,
  agency: tierAgencyReadSchema,
  primary_commercial: tierCommercialReadSchema.nullable(),
  secondary_commercials: z.array(tierCommercialReadSchema),
  number_authority: z.literal('erp_as400'),
  status_authority: z.literal('erp_as400'),
  archived_at: timestampSchema.nullable(),
  provenance: tierReadProvenanceSchema
});

export const tierMissingDataSchema = z.enum([
  'customer_account',
  'primary_commercial',
  'business_profile_reference',
  'business_profile_assignment'
]);

export const tierOrganizationReadSchema = z.strictObject({
  id: uuidSchema,
  legacy_entity_id: uuidSchema,
  name: labelSchema,
  legal_form_code: nullableTextSchema,
  naf_code: nullableTextSchema,
  city: nullableTextSchema,
  primary_phone: nullableTextSchema,
  primary_email: z.string().trim().email('Email invalide').nullable(),
  archived_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  roles: z.array(tierRoleReadSchema).min(1, 'Au moins un role est requis'),
  customer_account_state: z.enum(['available', 'missing', 'not_applicable']),
  customer_account: tierCustomerAccountReadSchema.nullable(),
  responsible_agency: tierAgencyReadSchema.nullable(),
  primary_commercial_state: z.enum(['available', 'missing', 'not_applicable']),
  business_profiles: tierBusinessProfilesReadSchema,
  missing_data: z.array(tierMissingDataSchema),
  provenance: tierReadProvenanceSchema,
  compatibility: z.strictObject({
    entity_type: z.string().trim().min(1, 'Type historique requis'),
    agency_id: uuidSchema.nullable(),
    cir_commercial_id: uuidSchema.nullable(),
    client_number: z.string().nullable(),
    account_type: accountTypeSchema.nullable()
  })
}).superRefine((tier, ctx) => {
  if ((tier.customer_account_state === 'available') !== Boolean(tier.customer_account)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Etat du compte client incoherent',
      path: ['customer_account']
    });
  }
  if (tier.primary_commercial_state === 'available' && !tier.customer_account?.primary_commercial) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Commercial principal requis',
      path: ['customer_account', 'primary_commercial']
    });
  }
});

export const tierContactReadSchema = z.strictObject({
  id: uuidSchema,
  organization_id: uuidSchema,
  legacy_entity_id: uuidSchema,
  first_name: nullableTextSchema,
  last_name: labelSchema,
  email: z.string().trim().email('Email invalide').nullable(),
  phone: nullableTextSchema,
  position: nullableTextSchema,
  service_label: nullableTextSchema,
  is_primary: z.boolean(),
  notes: nullableTextSchema,
  archived_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  provenance: tierReadProvenanceSchema
});

const tierDirectoryPageSizeSchema = z
  .number()
  .int()
  .refine((value) => [25, 50, 100].includes(value), 'Taille de page invalide');

export const tierDirectoryListInputSchema = z.strictObject({
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  query: z.string().trim().max(120, 'Recherche trop longue').optional(),
  role_codes: z
    .array(tierRoleCodeSchema)
    .max(16, 'Trop de roles demandes')
    .refine((roles) => new Set(roles).size === roles.length, 'Roles dupliques')
    .default([]),
  business_profile_codes: z
    .array(governedCodeSchema)
    .max(16, 'Trop de profils metier demandes')
    .refine((profiles) => new Set(profiles).size === profiles.length, 'Profils metier dupliques')
    .default([]),
  primary_commercial: z.enum(['all', 'assigned', 'missing']).default('all'),
  include_archived: z.boolean().default(false),
  include_historical_roles: z.boolean().default(true),
  page: z.number().int().min(1, 'Page invalide').default(1),
  page_size: tierDirectoryPageSizeSchema.default(50)
});

export type TierRoleCode = z.infer<typeof tierRoleCodeSchema>;
export type TierRoleType = z.infer<typeof tierRoleTypeSchema>;
export type TierRole = z.infer<typeof tierRoleSchema>;
export type CustomerAccount = z.infer<typeof customerAccountSchema>;
export type CustomerAccountSecondaryCommercial = z.infer<typeof customerAccountSecondaryCommercialSchema>;
export type OrganizationClassification = z.infer<typeof organizationClassificationSchema>;
export type BusinessProfileType = z.infer<typeof businessProfileTypeSchema>;
export type OrganizationBusinessProfile = z.infer<typeof organizationBusinessProfileSchema>;
export type TierOrganizationRead = z.infer<typeof tierOrganizationReadSchema>;
export type TierContactRead = z.infer<typeof tierContactReadSchema>;
export type TierDirectoryListInput = z.infer<typeof tierDirectoryListInputSchema>;
