import { z } from 'zod/v4';

import { optionalEntityDepartmentCodeSchema } from '../admin/department.schema.ts';
import { officialCompanyFieldsSchema } from '../system/directory.schema.ts';

const optionalText = z.string().trim().optional().or(z.literal(''));
const optionalSupplierCode = optionalText.refine(
  (value) => value === undefined || value === '' || /^[A-Z0-9]{1,4}$/.test(value),
  { message: 'Code fournisseur invalide' }
);
const optionalSupplierNumber = optionalText.refine(
  (value) => value === undefined || value === '' || /^[0-9]{1,15}$/.test(value),
  { message: 'Numero fournisseur invalide' }
);
const optionalEmail = z
  .string()
  .trim()
  .email('Email invalide')
  .optional()
  .or(z.literal(''));

const postalCode = optionalText.refine(
  (value) => value === undefined || value === '' || /^\d{5}$/.test(value),
  { message: 'Code postal invalide' }
);

export const supplierFormSchema = z.strictObject({
  name: z.string().trim().min(1, 'Nom requis'),
  supplier_code: optionalSupplierCode,
  supplier_number: optionalSupplierNumber,
  primary_phone: optionalText,
  primary_email: optionalEmail,
  address: optionalText,
  postal_code: postalCode,
  department: optionalEntityDepartmentCodeSchema,
  city: optionalText,
  notes: optionalText
}).extend(officialCompanyFieldsSchema.shape).superRefine((values, ctx) => {
  const hasPhone = Boolean(values.primary_phone?.trim());
  const hasEmail = Boolean(values.primary_email?.trim());
  if (!hasPhone && !hasEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telephone ou email requis',
      path: ['primary_phone']
    });
  }
});

export type SupplierFormValues = z.input<typeof supplierFormSchema>;
