import { z } from 'zod/v4';

const optionalEmail = z
  .string()
  .trim()
  .email('Email invalide')
  .optional()
  .or(z.literal(''));

export const clientContactFormSchema = z.object({
  first_name: z.string().trim().min(1, 'Prenom requis'),
  last_name: z.string().trim().min(1, 'Nom requis'),
  email: optionalEmail,
  phone: z.string().trim().optional().or(z.literal('')),
  position: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal(''))
}).superRefine((values, ctx) => {
  const hasPhone = Boolean(values.phone?.trim());
  const hasEmail = Boolean(values.email?.trim());
  if (!hasPhone && !hasEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telephone ou email requis',
      path: ['phone']
    });
  }
});

export type ClientContactFormValues = z.infer<typeof clientContactFormSchema>;
