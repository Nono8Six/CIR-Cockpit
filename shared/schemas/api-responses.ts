import { z } from 'zod/v4';

import type { Database } from '../supabase.types.ts';
import { membershipModeSchema, userRoleSchema } from './user.schema.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type EntityRow = Database['public']['Tables']['entities']['Row'];
type EntityContactRow = Database['public']['Tables']['entity_contacts']['Row'];
type InteractionRow = Database['public']['Tables']['interactions']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type AgencyMemberRow = Database['public']['Tables']['agency_members']['Row'];

const isEntityRow = (value: unknown): value is EntityRow =>
  isRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0;

const isEntityContactRow = (value: unknown): value is EntityContactRow =>
  isRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0;

const isInteractionRow = (value: unknown): value is InteractionRow =>
  isRecord(value)
  && typeof value.id === 'string'
  && value.id.trim().length > 0
  && typeof value.channel === 'string'
  && Array.isArray(value.timeline);

const entityRowSchema = z.custom<EntityRow>((value) => isEntityRow(value), 'Entite invalide.');
const entityContactRowSchema = z.custom<EntityContactRow>((value) => isEntityContactRow(value), 'Contact invalide.');
const interactionRowSchema = z.custom<InteractionRow>((value) => isInteractionRow(value), 'Interaction invalide.');

const apiSuccessSchema = z.object({
  request_id: z.string().trim().min(1).optional(),
  ok: z.literal(true)
}).strict();

const agencyIdSchema = z.string().trim().min(1, 'Identifiant agence requis');
const profileIdSchema = z.string().trim().min(1, 'Identifiant utilisateur requis');

const adminAgencySummarySchema = z.object({
  id: agencyIdSchema,
  name: z.string().trim().min(1, "Nom d'agence requis"),
  archived_at: z.string().nullable()
}).strict();

export const dataEntitiesResponseSchema = apiSuccessSchema.extend({
  entity: entityRowSchema,
  propagated_interactions_count: z.number().int().nonnegative().optional()
}).strict();

export const dataEntitiesReassignResponseSchema = dataEntitiesResponseSchema.extend({
  propagated_interactions_count: z.number().int().nonnegative()
}).strict();

const dataEntityContactsSaveResponseSchema = apiSuccessSchema.extend({
  contact: entityContactRowSchema
}).strict();

const dataEntityContactsDeleteResponseSchema = apiSuccessSchema.extend({
  contact_id: z.string().trim().min(1, 'Identifiant contact requis')
}).strict();

export const dataEntityContactsResponseSchema = z.union([
  dataEntityContactsSaveResponseSchema,
  dataEntityContactsDeleteResponseSchema
]);

export const dataInteractionsResponseSchema = apiSuccessSchema.extend({
  interaction: interactionRowSchema
}).strict();

export const dataConfigResponseSchema = apiSuccessSchema;
export const dataProfileResponseSchema = apiSuccessSchema;

export const adminAgenciesAgencyResponseSchema = apiSuccessSchema.extend({
  agency: adminAgencySummarySchema
}).strict();

export const adminAgenciesDeleteResponseSchema = apiSuccessSchema.extend({
  agency_id: agencyIdSchema
}).strict();

export const adminAgenciesResponseSchema = z.union([
  adminAgenciesAgencyResponseSchema,
  adminAgenciesDeleteResponseSchema
]);

export const adminUsersCreateResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  account_state: z.enum(['created', 'existing']),
  role: userRoleSchema,
  agency_ids: z.array(agencyIdSchema),
  temporary_password: z.string().min(1).optional()
}).strict();

export const adminUsersSetRoleResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  role: userRoleSchema
}).strict();

export const adminUsersUpdateIdentityResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  email: z.string().trim().min(1, 'Email requis'),
  first_name: z.string().trim().min(1, 'Prenom requis'),
  last_name: z.string().trim().min(1, 'Nom requis'),
  display_name: z.string().trim().min(1, 'Nom affiche requis').optional()
}).strict();

export const adminUsersSetMembershipsResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  agency_ids: z.array(agencyIdSchema),
  membership_mode: membershipModeSchema
}).strict();

export const adminUsersResetPasswordResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  temporary_password: z.string().min(1)
}).strict();

export const adminUsersArchiveResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  archived: z.boolean()
}).strict();

export const adminUsersDeleteResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  deleted: z.literal(true),
  anonymized_interactions: z.number().int().nonnegative().optional(),
  anonymized_agency_ids: z.array(agencyIdSchema).optional(),
  anonymized_orphan_interactions: z.number().int().nonnegative().optional()
}).strict();

export const adminUsersResponseSchema = z.union([
  adminUsersCreateResponseSchema,
  adminUsersSetRoleResponseSchema,
  adminUsersUpdateIdentityResponseSchema,
  adminUsersSetMembershipsResponseSchema,
  adminUsersResetPasswordResponseSchema,
  adminUsersArchiveResponseSchema,
  adminUsersDeleteResponseSchema
]);

export type ApiSuccess = z.infer<typeof apiSuccessSchema>;
export type DataEntitiesResponse = z.infer<typeof dataEntitiesResponseSchema>;
export type DataEntitiesReassignResponse = z.infer<typeof dataEntitiesReassignResponseSchema>;
export type DataEntityContactsResponse = z.infer<typeof dataEntityContactsResponseSchema>;
export type DataInteractionsResponse = z.infer<typeof dataInteractionsResponseSchema>;
export type DataConfigResponse = z.infer<typeof dataConfigResponseSchema>;
export type DataProfileResponse = z.infer<typeof dataProfileResponseSchema>;
export type AdminAgencySummary = z.infer<typeof adminAgencySummarySchema>;
export type AdminAgenciesAgencyResponse = z.infer<typeof adminAgenciesAgencyResponseSchema>;
export type AdminAgenciesDeleteResponse = z.infer<typeof adminAgenciesDeleteResponseSchema>;
export type AdminAgenciesResponse = z.infer<typeof adminAgenciesResponseSchema>;
export type AdminUsersCreateResponse = z.infer<typeof adminUsersCreateResponseSchema>;
export type AdminUsersSetRoleResponse = z.infer<typeof adminUsersSetRoleResponseSchema>;
export type AdminUsersUpdateIdentityResponse = z.infer<typeof adminUsersUpdateIdentityResponseSchema>;
export type AdminUsersSetMembershipsResponse = z.infer<typeof adminUsersSetMembershipsResponseSchema>;
export type AdminUsersResetPasswordResponse = z.infer<typeof adminUsersResetPasswordResponseSchema>;
export type AdminUsersArchiveResponse = z.infer<typeof adminUsersArchiveResponseSchema>;
export type AdminUsersDeleteResponse = z.infer<typeof adminUsersDeleteResponseSchema>;
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;
export type MembershipMode = z.infer<typeof membershipModeSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type EntityId = EntityRow['id'];
export type EntityContactId = EntityContactRow['id'];
export type AgencyId = AgencyMemberRow['agency_id'];
export type ProfileId = ProfileRow['id'];
