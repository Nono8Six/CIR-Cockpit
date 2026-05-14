import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';
import { optionalEntityDepartmentCodeSchema } from './department.schema.ts';
import { officialCompanyFieldsSchema } from './directory.schema.ts';

const optionalText = z.string().trim().optional().or(z.literal(''));

const postalCode = optionalText.refine(
  (value) => value === undefined || value === '' || /^\d{5}$/.test(value),
  { message: 'Code postal invalide' }
);

export const prospectFormSchema = z.strictObject({
  name: z.string().trim().min(1, 'Nom requis'),
  address: optionalText,
  postal_code: postalCode,
  department: optionalEntityDepartmentCodeSchema,
  city: z.string().trim().min(1, 'Ville requise'),
  notes: optionalText,
  agency_id: uuidSchema
}).extend(officialCompanyFieldsSchema.shape);

export type ProspectFormValues = z.input<typeof prospectFormSchema>;
