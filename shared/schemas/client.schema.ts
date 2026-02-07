import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';

export const clientNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ''))
  .refine((value) => /^\d{1,10}$/.test(value), {
    message: 'Numero client invalide'
  });

export const accountTypeSchema = z.enum(['term', 'cash']);

export const clientFormSchema = z.object({
  client_number: clientNumberSchema,
  account_type: accountTypeSchema,
  name: z.string().trim().min(1, 'Nom requis'),
  address: z.string().trim().min(1, 'Adresse requise'),
  postal_code: z.string().regex(/^\d{5}$/, 'Code postal invalide'),
  department: z.string().regex(/^\d{2,3}$/, 'Departement invalide'),
  city: z.string().trim().min(1, 'Ville requise'),
  siret: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  agency_id: uuidSchema.optional().nullable()
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
