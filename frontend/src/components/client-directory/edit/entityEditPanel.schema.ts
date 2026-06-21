import { z } from 'zod';

import { entityDepartmentCodeSchema } from '../../../../../shared/schemas/admin/department.schema';

const optionalEmailSchema = z.string().trim().email('Email invalide').optional().or(z.literal(''));
const optionalTextSchema = z.string().optional();
const clientNumberSchema = z.string().trim().regex(/^\d{1,10}$/, 'Numero client invalide');
const supplierCodeSchema = z.string().trim().regex(/^[A-Z0-9]{1,4}$/, 'Code fournisseur invalide');
const supplierNumberSchema = z.string().trim().regex(/^\d{1,15}$/, 'Numero fournisseur invalide');
const postalCodeSchema = z.string().trim().regex(/^\d{5}$/, 'Code postal invalide');

export const entityEditFormSchema = z.strictObject({
  mode: z.enum(['client', 'prospect', 'supplier']),
  client_kind: z.enum(['company', 'individual']).nullable(),
  client_number: optionalTextSchema,
  supplier_code: optionalTextSchema,
  supplier_number: optionalTextSchema,
  primary_phone: optionalTextSchema,
  primary_email: optionalEmailSchema,
  account_type: z.enum(['term', 'cash']),
  name: z.string().trim().min(1, 'Nom requis'),
  address: optionalTextSchema,
  postal_code: optionalTextSchema,
  department: optionalTextSchema,
  city: optionalTextSchema,
  agency_id: optionalTextSchema,
  cir_commercial_id: z.string().nullable(),
  primary_contact_id: z.string().nullable(),
  siret: optionalTextSchema,
  siren: optionalTextSchema,
  naf_code: optionalTextSchema,
  official_name: optionalTextSchema,
  official_data_source: z.literal('api-recherche-entreprises').nullable(),
  official_data_synced_at: optionalTextSchema,
  notes: optionalTextSchema,
  contact_first_name: optionalTextSchema,
  contact_last_name: optionalTextSchema,
  contact_email: optionalEmailSchema,
  contact_phone: optionalTextSchema,
  contact_position: optionalTextSchema,
  contact_service_label: optionalTextSchema,
  contact_notes: optionalTextSchema
}).superRefine((values, ctx) => {
  if (values.mode === 'client') {
    if (!clientNumberSchema.safeParse(values.client_number).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Numero client invalide', path: ['client_number'] });
    }
    if (!postalCodeSchema.safeParse(values.postal_code).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code postal invalide', path: ['postal_code'] });
    }
    if (!entityDepartmentCodeSchema.safeParse(values.department).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Departement invalide', path: ['department'] });
    }
    if (!values.address?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Adresse requise', path: ['address'] });
    }
    if (!values.city?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ville requise', path: ['city'] });
    }
    if (!values.agency_id?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Agence requise', path: ['agency_id'] });
    }
  } else if (values.mode === 'prospect') {
    if (!values.city?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ville requise', path: ['city'] });
    }
    if (!values.agency_id?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Agence requise', path: ['agency_id'] });
    }
    if (values.postal_code?.trim() && !postalCodeSchema.safeParse(values.postal_code).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code postal invalide', path: ['postal_code'] });
    }
  } else if (values.mode === 'supplier') {
    if (values.supplier_code?.trim() && !supplierCodeSchema.safeParse(values.supplier_code).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code fournisseur invalide', path: ['supplier_code'] });
    }
    if (values.supplier_number?.trim() && !supplierNumberSchema.safeParse(values.supplier_number).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Numero fournisseur invalide', path: ['supplier_number'] });
    }
    if (values.postal_code?.trim() && !postalCodeSchema.safeParse(values.postal_code).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code postal invalide', path: ['postal_code'] });
    }
    if (!values.primary_phone?.trim() && !values.primary_email?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Telephone ou email requis', path: ['primary_phone'] });
    }
  } else if (values.postal_code?.trim() && !postalCodeSchema.safeParse(values.postal_code).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code postal invalide', path: ['postal_code'] });
  }

  if (values.mode === 'client' && values.client_kind === 'individual') {
    if (!values.contact_first_name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prenom requis', path: ['contact_first_name'] });
    }
    if (!values.contact_last_name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nom requis', path: ['contact_last_name'] });
    }
    if (!values.contact_email?.trim() && !values.contact_phone?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Telephone ou email requis', path: ['contact_phone'] });
    }
  }
});

export type EntityEditFormValues = z.input<typeof entityEditFormSchema>;
