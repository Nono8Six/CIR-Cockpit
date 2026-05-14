import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';
import { clientNumberSchema } from './client.schema.ts';
import { entityDepartmentCodeSchema, optionalEntityDepartmentCodeSchema } from './department.schema.ts';
import { officialCompanyFieldsSchema } from './directory.schema.ts';

const MAX_SHORT_TEXT_LENGTH = 255;
const MAX_QUERY_LENGTH = 120;

const requiredTextSchema = z.string().trim().min(1, 'Valeur requise').max(MAX_SHORT_TEXT_LENGTH, 'Texte trop long');
const optionalTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  });
const optionalPhoneSchema = z
  .union([z.string().trim().max(32, 'Numero de telephone trop long'), z.literal(''), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length > 0 ? trimmed : null;
  });
const requiredPhoneSchema = z.string().trim().min(1, 'Telephone requis').max(32, 'Numero de telephone trop long');
const optionalEmailSchema = z
  .union([z.string().trim().email('Email invalide'), z.literal(''), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return trimmed.length > 0 ? trimmed : null;
  });
const postalCodeSchema = z.string().trim().regex(/^\d{5}$/, 'Code postal invalide');
const optionalPostalCodeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? '')
  .refine((value) => value.length === 0 || /^\d{5}$/.test(value), 'Code postal invalide')
  .transform((value) => value.length > 0 ? value : null);
const supplierCodeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = value?.trim().toUpperCase() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  })
  .refine((value) => value === null || /^[A-Z0-9]{1,4}$/.test(value), 'Code fournisseur invalide');
const supplierNumberSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  })
  .refine((value) => value === null || /^[0-9]{1,15}$/.test(value), 'Numero fournisseur invalide');

const addContactMethodRule = (
  values: { primary_phone: string | null; primary_email: string | null },
  ctx: z.RefinementCtx
) => {
  if (!values.primary_phone && !values.primary_email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telephone ou email requis',
      path: ['primary_phone']
    });
  }
};

const tierV1EntityBaseSchema = z.strictObject({
  id: uuidSchema.optional(),
  agency_id: uuidSchema,
  primary_phone: optionalPhoneSchema,
  primary_email: optionalEmailSchema,
  notes: optionalTextSchema.optional()
});

const tierV1CompanyFieldsSchema = z.strictObject({
  ...officialCompanyFieldsSchema.shape,
  name: requiredTextSchema,
  address: requiredTextSchema,
  postal_code: postalCodeSchema,
  department: entityDepartmentCodeSchema,
  city: requiredTextSchema,
  siret: z.string().trim().regex(/^\d{14}$/, 'SIRET invalide'),
  siren: z.string().trim().regex(/^\d{9}$/, 'SIREN invalide'),
  naf_code: requiredTextSchema
});

export const tierV1ClientTermPayloadSchema = tierV1EntityBaseSchema.extend({
  tier_type: z.literal('client_term'),
  client_kind: z.literal('company'),
  account_type: z.literal('term'),
  client_number: clientNumberSchema,
  ...tierV1CompanyFieldsSchema.shape
}).superRefine(addContactMethodRule);

export const tierV1ClientCashPayloadSchema = tierV1EntityBaseSchema.extend({
  tier_type: z.literal('client_cash'),
  client_kind: z.literal('company'),
  account_type: z.literal('cash'),
  client_number: clientNumberSchema,
  ...tierV1CompanyFieldsSchema.shape
}).superRefine(addContactMethodRule);

export const tierV1IndividualPayloadSchema = tierV1EntityBaseSchema.extend({
  tier_type: z.literal('individual'),
  client_kind: z.literal('individual'),
  account_type: z.literal('cash'),
  client_number: clientNumberSchema,
  first_name: requiredTextSchema,
  last_name: requiredTextSchema,
  address: optionalTextSchema.optional(),
  postal_code: optionalPostalCodeSchema.optional(),
  department: optionalEntityDepartmentCodeSchema.optional(),
  city: optionalTextSchema.optional()
}).superRefine(addContactMethodRule);

export const tierV1ProspectCompanyPayloadSchema = tierV1EntityBaseSchema.extend({
  tier_type: z.literal('prospect_company'),
  name: requiredTextSchema,
  address: optionalTextSchema.optional(),
  postal_code: optionalPostalCodeSchema.optional(),
  department: optionalEntityDepartmentCodeSchema.optional(),
  city: optionalTextSchema.optional(),
  ...officialCompanyFieldsSchema.shape
}).superRefine(addContactMethodRule);

export const tierV1ProspectIndividualPayloadSchema = tierV1EntityBaseSchema.extend({
  tier_type: z.literal('prospect_individual'),
  first_name: requiredTextSchema,
  last_name: requiredTextSchema,
  address: optionalTextSchema.optional(),
  postal_code: optionalPostalCodeSchema.optional(),
  department: optionalEntityDepartmentCodeSchema.optional(),
  city: optionalTextSchema.optional()
}).superRefine(addContactMethodRule);

export const tierV1SupplierPayloadSchema = tierV1EntityBaseSchema.extend({
  tier_type: z.literal('supplier'),
  name: requiredTextSchema,
  supplier_code: supplierCodeSchema.optional(),
  supplier_number: supplierNumberSchema.optional(),
  address: optionalTextSchema.optional(),
  postal_code: optionalPostalCodeSchema.optional(),
  department: optionalEntityDepartmentCodeSchema.optional(),
  city: optionalTextSchema.optional(),
  ...officialCompanyFieldsSchema.shape
}).superRefine(addContactMethodRule);

export const tierV1InternalCirQuickPayloadSchema = tierV1EntityBaseSchema.extend({
  tier_type: z.literal('internal_cir_quick'),
  first_name: requiredTextSchema,
  last_name: requiredTextSchema,
  cir_agency_id: uuidSchema
});

export const tierV1SolicitationInteractionOnlyPayloadSchema = z.strictObject({
  tier_type: z.literal('solicitation_interaction_only'),
  agency_id: uuidSchema,
  phone: requiredPhoneSchema,
  display_name: optionalTextSchema.optional()
});

export const tierV1PayloadSchema = z.union([
  tierV1ClientTermPayloadSchema,
  tierV1ClientCashPayloadSchema,
  tierV1IndividualPayloadSchema,
  tierV1ProspectCompanyPayloadSchema,
  tierV1ProspectIndividualPayloadSchema,
  tierV1SupplierPayloadSchema,
  tierV1InternalCirQuickPayloadSchema,
  tierV1SolicitationInteractionOnlyPayloadSchema
]);

export const tierV1DirectoryFamilySchema = z.enum([
  'all',
  'clients',
  'prospects',
  'suppliers',
  'internals',
  'solicitations'
]);
export const tierV1ClientFilterSchema = z.enum(['all', 'term', 'cash', 'individual']);
export const tierV1ProspectFilterSchema = z.enum(['all', 'company', 'individual']);
export const tierV1ResultSourceSchema = z.enum(['entity', 'profile', 'solicitation_history']);
export const tierV1ResultTypeSchema = z.enum([
  'client_term',
  'client_cash',
  'individual',
  'prospect_company',
  'prospect_individual',
  'supplier',
  'internal_cir',
  'solicitation'
]);

export const tierV1SearchInputSchema = z.strictObject({
  query: z.string().trim().min(1, 'Recherche requise').max(MAX_QUERY_LENGTH, 'Recherche trop longue'),
  agency_id: z.union([uuidSchema, z.null()]).optional(),
  family: tierV1DirectoryFamilySchema.default('all'),
  client_filter: tierV1ClientFilterSchema.default('all'),
  prospect_filter: tierV1ProspectFilterSchema.default('all'),
  include_archived: z.boolean().default(false),
  limit: z.number().int().min(1, 'Limite invalide').max(50, 'Limite trop grande').default(10)
});

export const tierV1DirectoryListInputSchema = z.strictObject({
  query: z.string().trim().max(MAX_QUERY_LENGTH, 'Recherche trop longue').optional(),
  agency_id: z.union([uuidSchema, z.null()]).optional(),
  family: tierV1DirectoryFamilySchema.default('all'),
  client_filter: tierV1ClientFilterSchema.default('all'),
  prospect_filter: tierV1ProspectFilterSchema.default('all'),
  source: tierV1ResultSourceSchema.optional(),
  include_archived: z.boolean().default(false),
  page: z.number().int().min(1, 'Page invalide').default(1),
  page_size: z.number().int().min(1, 'Taille de page invalide').max(100, 'Taille de page trop grande').default(50)
});

export const tierV1DirectoryRowSchema = z.strictObject({
  id: z.string().trim().min(1, 'Identifiant requis'),
  source: tierV1ResultSourceSchema,
  type: tierV1ResultTypeSchema,
  label: requiredTextSchema,
  identifier: optionalTextSchema,
  phone: optionalTextSchema,
  email: optionalTextSchema,
  city: optionalTextSchema,
  agency_name: optionalTextSchema,
  referent_name: optionalTextSchema,
  updated_at: z.string().trim().min(1, 'Date de mise a jour requise'),
  archived_at: optionalTextSchema
});

export type TierV1Payload = z.infer<typeof tierV1PayloadSchema>;
export type TierV1SearchInput = z.infer<typeof tierV1SearchInputSchema>;
export type TierV1DirectoryListInput = z.infer<typeof tierV1DirectoryListInputSchema>;
export type TierV1DirectoryRow = z.infer<typeof tierV1DirectoryRowSchema>;
