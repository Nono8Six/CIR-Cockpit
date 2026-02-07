import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';

const optionalText = z.string().trim().optional().or(z.literal(''));

const postalCode = optionalText.refine(
  (value) => value === undefined || value === '' || /^\d{5}$/.test(value),
  { message: 'Code postal invalide' }
);

export const prospectFormSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  address: optionalText,
  postal_code: postalCode,
  department: optionalText,
  city: z.string().trim().min(1, 'Ville requise'),
  siret: optionalText,
  notes: optionalText,
  agency_id: uuidSchema.optional().nullable()
});

export type ProspectFormValues = z.infer<typeof prospectFormSchema>;
