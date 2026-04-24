import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';
import { userRoleSchema } from './user.schema.ts';

const cockpitPhoneSchema = z.string().trim().min(3, 'Numero requis').max(32, 'Numero trop long');

export const cockpitAgencyMembersInputSchema = z.object({
  agency_id: uuidSchema
}).strict();

export const cockpitPhoneLookupInputSchema = z.object({
  agency_id: uuidSchema,
  phone: cockpitPhoneSchema,
  limit: z.number().int().min(1).max(10).optional()
}).strict();

export const cockpitAgencyMemberSchema = z.object({
  profile_id: uuidSchema,
  first_name: z.string().nullable(),
  last_name: z.string(),
  display_name: z.string().nullable(),
  email: z.string().email(),
  role: userRoleSchema
}).strict();

export const cockpitPhoneLookupInteractionSchema = z.object({
  id: uuidSchema,
  channel: z.string(),
  entity_type: z.string(),
  company_name: z.string(),
  contact_name: z.string(),
  contact_phone: z.string().nullable(),
  subject: z.string(),
  status_id: uuidSchema.nullable(),
  interaction_type: z.string(),
  entity_id: uuidSchema.nullable(),
  contact_id: uuidSchema.nullable(),
  created_at: z.string(),
  last_action_at: z.string()
}).strict();

const apiSuccessSchema = z.object({
  request_id: z.string().trim().min(1).optional(),
  ok: z.literal(true)
}).strict();

export const cockpitAgencyMembersResponseSchema = apiSuccessSchema.extend({
  members: z.array(cockpitAgencyMemberSchema)
}).strict();

export const cockpitPhoneLookupResponseSchema = apiSuccessSchema.extend({
  normalized_phone: z.string(),
  total: z.number().int().nonnegative(),
  matches: z.array(cockpitPhoneLookupInteractionSchema)
}).strict();

export type CockpitAgencyMembersInput = z.infer<typeof cockpitAgencyMembersInputSchema>;
export type CockpitPhoneLookupInput = z.infer<typeof cockpitPhoneLookupInputSchema>;
export type CockpitAgencyMember = z.infer<typeof cockpitAgencyMemberSchema>;
export type CockpitPhoneLookupInteraction = z.infer<typeof cockpitPhoneLookupInteractionSchema>;
export type CockpitAgencyMembersResponse = z.infer<typeof cockpitAgencyMembersResponseSchema>;
export type CockpitPhoneLookupResponse = z.infer<typeof cockpitPhoneLookupResponseSchema>;
