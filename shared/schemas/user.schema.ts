import { z } from 'zod/v4';

import { emailSchema, firstNameSchema, lastNameSchema, passwordSchema, uuidSchema } from './auth.schema.ts';

export const userRoleSchema = z.enum(['super_admin', 'agency_admin', 'tcs']);
export const membershipModeSchema = z.enum(['replace', 'add', 'remove']);

const createUserSchema = z.object({
  action: z.literal('create'),
  email: emailSchema,
  first_name: firstNameSchema,
  last_name: lastNameSchema,
  role: userRoleSchema.optional(),
  agency_ids: z.array(uuidSchema).optional(),
  password: passwordSchema.optional()
});

const setRoleSchema = z.object({
  action: z.literal('set_role'),
  user_id: uuidSchema,
  role: userRoleSchema
});

const updateIdentitySchema = z.object({
  action: z.literal('update_identity'),
  user_id: uuidSchema,
  email: emailSchema,
  first_name: firstNameSchema,
  last_name: lastNameSchema
});

const setMembershipsSchema = z.object({
  action: z.literal('set_memberships'),
  user_id: uuidSchema,
  agency_ids: z.array(uuidSchema).min(1, 'Au moins une agence requise'),
  mode: membershipModeSchema.optional()
});

const resetPasswordSchema = z.object({
  action: z.literal('reset_password'),
  user_id: uuidSchema,
  password: passwordSchema.optional()
});

const archiveSchema = z.object({
  action: z.literal('archive'),
  user_id: uuidSchema
});

const unarchiveSchema = z.object({
  action: z.literal('unarchive'),
  user_id: uuidSchema
});

const deleteUserSchema = z.object({
  action: z.literal('delete'),
  user_id: uuidSchema
});

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

export type AdminUsersPayload = z.infer<typeof adminUsersPayloadSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type MembershipMode = z.infer<typeof membershipModeSchema>;
