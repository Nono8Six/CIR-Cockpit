import { z } from 'zod/v4';

import { emailSchema, firstNameSchema, lastNameSchema, passwordSchema, uuidSchema } from './auth.schema.ts';

export const userRoleSchema = z.enum(['super_admin', 'agency_admin', 'tcs']);
export const membershipModeSchema = z.enum(['replace', 'add', 'remove']);

const optionalPasswordSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .superRefine((value, ctx) => {
    if (!value) {
      return;
    }
    const parsed = passwordSchema.safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsed.error.issues[0]?.message ?? 'Mot de passe invalide.'
      });
    }
  });

export const userCreateFormSchema = z
  .object({
    email: emailSchema,
    first_name: firstNameSchema,
    last_name: lastNameSchema,
    role: userRoleSchema,
    agency_ids: z.array(uuidSchema),
    password: optionalPasswordSchema
  })
  .strict()
  .superRefine((values, ctx) => {
    if (values.role === 'tcs' && values.agency_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un utilisateur TCS doit etre assigne a au moins une agence.',
        path: ['agency_ids']
      });
    }
  });

export const userIdentityFormSchema = z
  .object({
    email: emailSchema,
    first_name: firstNameSchema,
    last_name: lastNameSchema
  })
  .strict();

export const userMembershipsFormSchema = z
  .object({
    agency_ids: z.array(uuidSchema).min(1, 'Au moins une agence requise')
  })
  .strict();

const createUserSchema = z.object({
  action: z.literal('create'),
  email: emailSchema,
  first_name: firstNameSchema,
  last_name: lastNameSchema,
  role: userRoleSchema.optional(),
  agency_ids: z.array(uuidSchema).optional(),
  password: passwordSchema.optional()
}).strict();

const setRoleSchema = z.object({
  action: z.literal('set_role'),
  user_id: uuidSchema,
  role: userRoleSchema
}).strict();

const updateIdentitySchema = z.object({
  action: z.literal('update_identity'),
  user_id: uuidSchema,
  email: emailSchema,
  first_name: firstNameSchema,
  last_name: lastNameSchema
}).strict();

const setMembershipsSchema = z.object({
  action: z.literal('set_memberships'),
  user_id: uuidSchema,
  agency_ids: z.array(uuidSchema).min(1, 'Au moins une agence requise'),
  mode: membershipModeSchema.optional()
}).strict();

const resetPasswordSchema = z.object({
  action: z.literal('reset_password'),
  user_id: uuidSchema,
  password: passwordSchema.optional()
}).strict();

const archiveSchema = z.object({
  action: z.literal('archive'),
  user_id: uuidSchema
}).strict();

const unarchiveSchema = z.object({
  action: z.literal('unarchive'),
  user_id: uuidSchema
}).strict();

const deleteUserSchema = z.object({
  action: z.literal('delete'),
  user_id: uuidSchema
}).strict();

export const adminUsersPayloadSchema = z.discriminatedUnion('action', [
  createUserSchema,
  setRoleSchema,
  updateIdentitySchema,
  setMembershipsSchema,
  resetPasswordSchema,
  archiveSchema,
  unarchiveSchema,
  deleteUserSchema
]);

export type UserCreateFormValues = z.infer<typeof userCreateFormSchema>;
export type UserIdentityFormValues = z.infer<typeof userIdentityFormSchema>;
export type UserMembershipsFormValues = z.infer<typeof userMembershipsFormSchema>;
export type AdminUsersPayload = z.infer<typeof adminUsersPayloadSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type MembershipMode = z.infer<typeof membershipModeSchema>;
