import { z } from 'zod/v4';

import type { Database } from '../supabase.types.ts';
import {
  resolvedConfigSnapshotSchema
} from './config.schema.ts';
import {
  directoryAgencyOptionSchema,
  directoryCompanyDetailsSchema,
  directoryCompanySearchResultSchema,
  directoryCommercialOptionSchema,
  directoryDuplicateMatchSchema,
  directoryListRowSchema,
  directoryRecordSchema,
  directorySavedViewSchema,
  directorySuggestionOptionSchema
} from './directory.schema.ts';
import { membershipModeSchema, userRoleSchema } from './user.schema.ts';
import { tierV1DirectoryRowSchema } from './tier-v1.schema.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type EntityRow = Database['public']['Tables']['entities']['Row'];
type EntityContactRow = Database['public']['Tables']['entity_contacts']['Row'];
type InteractionRow = Database['public']['Tables']['interactions']['Row'];
type InteractionDraftRow = Pick<Database['public']['Tables']['interaction_drafts']['Row'], 'id' | 'payload' | 'updated_at'>;
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

const isInteractionDraftRow = (value: unknown): value is InteractionDraftRow =>
  isRecord(value)
  && typeof value.id === 'string'
  && value.id.trim().length > 0
  && typeof value.updated_at === 'string'
  && value.updated_at.trim().length > 0
  && 'payload' in value;

const entityRowSchema = z.custom<EntityRow>((value) => isEntityRow(value), 'Entite invalide.');
const entityContactRowSchema = z.custom<EntityContactRow>((value) => isEntityContactRow(value), 'Contact invalide.');
const interactionRowSchema = z.custom<InteractionRow>((value) => isInteractionRow(value), 'Interaction invalide.');
const interactionDraftRowSchema = z.custom<InteractionDraftRow>((value) => isInteractionDraftRow(value), 'Brouillon invalide.');

const apiSuccessSchema = z.strictObject({
  request_id: z.string().trim().min(1).optional(),
  ok: z.literal(true)
});

const agencyIdSchema = z.string().trim().min(1, 'Identifiant agence requis');
const profileIdSchema = z.string().trim().min(1, 'Identifiant utilisateur requis');

const adminAgencySummarySchema = z.strictObject({
  id: agencyIdSchema,
  name: z.string().trim().min(1, "Nom d'agence requis"),
  archived_at: z.string().nullable()
});

const adminUserMembershipSchema = z.strictObject({
  agency_id: agencyIdSchema,
  agency_name: z.string().trim().min(1, "Nom d'agence requis")
});

const adminUserSummarySchema = z.strictObject({
  id: profileIdSchema,
  email: z.string().trim().min(1, 'Email requis'),
  display_name: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  role: userRoleSchema,
  archived_at: z.string().nullable(),
  created_at: z.string().trim().min(1, 'Date de creation requise'),
  memberships: z.array(adminUserMembershipSchema)
});

const auditLogActorSchema = z.strictObject({
  id: profileIdSchema,
  display_name: z.string().nullable(),
  email: z.string().trim().min(1, 'Email requis')
});

const auditLogAgencySchema = z.strictObject({
  id: agencyIdSchema,
  name: z.string().trim().min(1, "Nom d'agence requis")
});

const adminAuditLogEntrySchema = z.strictObject({
  id: z.string().trim().min(1, 'Identifiant audit requis'),
  action: z.string().trim().min(1, 'Action requise'),
  entity_table: z.string().trim().min(1, 'Table requise'),
  entity_id: z.string().trim().min(1, 'Identifiant entite requis'),
  metadata: z.unknown(),
  created_at: z.string().trim().min(1, 'Date de creation requise'),
  actor_id: profileIdSchema.nullable(),
  actor_is_super_admin: z.boolean(),
  agency_id: agencyIdSchema.nullable(),
  actor: auditLogActorSchema.nullable(),
  agency: auditLogAgencySchema.nullable()
});

export const dataEntitiesResponseSchema = apiSuccessSchema.extend({
  entity: entityRowSchema,
  propagated_interactions_count: z.number().int().nonnegative().optional(),
  deleted_interactions_count: z.number().int().nonnegative().optional()
});

export const dataEntitiesListResponseSchema = apiSuccessSchema.extend({
  entities: z.array(entityRowSchema)
});

export const dataEntitiesSearchIndexResponseSchema = apiSuccessSchema.extend({
  entities: z.array(entityRowSchema),
  contacts: z.array(entityContactRowSchema)
});

export const dataEntitiesRouteResponseSchema = z.union([
  dataEntitiesResponseSchema,
  dataEntitiesListResponseSchema,
  dataEntitiesSearchIndexResponseSchema
]);

export const dataEntitiesReassignResponseSchema = dataEntitiesResponseSchema.extend({
  propagated_interactions_count: z.number().int().nonnegative()
});

const dataEntityContactsSaveResponseSchema = apiSuccessSchema.extend({
  contact: entityContactRowSchema
});

const dataEntityContactsDeleteResponseSchema = apiSuccessSchema.extend({
  contact_id: z.string().trim().min(1, 'Identifiant contact requis')
});

export const dataEntityContactsListResponseSchema = apiSuccessSchema.extend({
  contacts: z.array(entityContactRowSchema)
});

export const dataEntityContactsResponseSchema = z.union([
  dataEntityContactsListResponseSchema,
  dataEntityContactsSaveResponseSchema,
  dataEntityContactsDeleteResponseSchema
]);

export const dataInteractionsMutationResponseSchema = apiSuccessSchema.extend({
  interaction: interactionRowSchema
});

export const dataInteractionsListResponseSchema = apiSuccessSchema.extend({
  interactions: z.array(interactionRowSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export const dataInteractionsDeleteResponseSchema = apiSuccessSchema.extend({
  interaction_id: z.string().trim().min(1, 'Identifiant interaction requis')
});

export const dataInteractionsKnownCompaniesResponseSchema = apiSuccessSchema.extend({
  companies: z.array(z.string().trim().min(1, 'Entreprise requise'))
});

export const dataInteractionDraftResponseSchema = apiSuccessSchema.extend({
  draft: interactionDraftRowSchema.nullable()
});

export const dataInteractionsResponseSchema = z.union([
  dataInteractionsMutationResponseSchema,
  dataInteractionsListResponseSchema,
  dataInteractionsKnownCompaniesResponseSchema,
  dataInteractionDraftResponseSchema,
  dataInteractionsDeleteResponseSchema
]);

export const dataConfigResponseSchema = apiSuccessSchema;
export const dataProfileResponseSchema = apiSuccessSchema;
export const configGetResponseSchema = apiSuccessSchema.extend({
  snapshot: resolvedConfigSnapshotSchema
});
export const configSaveAgencyResponseSchema = apiSuccessSchema;
export const configSaveProductResponseSchema = apiSuccessSchema;
export const directoryListResponseSchema = apiSuccessSchema.extend({
  rows: z.array(directoryListRowSchema),
  total: z.number().int().nonnegative().optional(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  meta: z.strictObject({
    scope: z.strictObject({
      mode: z.enum(['single_agency', 'multi_agency', 'global_read']),
      agencyIds: z.array(z.string().trim().min(1, 'Identifiant agence requis'))
    })
  }).optional()
});

export const directoryOptionsAgenciesResponseSchema = apiSuccessSchema.extend({
  agencies: z.array(directoryAgencyOptionSchema),
});

export const directoryOptionsCommercialsResponseSchema = apiSuccessSchema.extend({
  commercials: z.array(directoryCommercialOptionSchema),
  meta: z.strictObject({
    scope: z.strictObject({
      mode: z.enum(['single_agency', 'multi_agency', 'global_read']),
      agencyIds: z.array(z.string().trim().min(1, 'Identifiant agence requis'))
    })
  }).optional()
});

export const directoryOptionsDepartmentsResponseSchema = apiSuccessSchema.extend({
  departments: z.array(z.string().trim().min(1, 'Departement requis')),
  meta: z.strictObject({
    scope: z.strictObject({
      mode: z.enum(['single_agency', 'multi_agency', 'global_read']),
      agencyIds: z.array(z.string().trim().min(1, 'Identifiant agence requis'))
    })
  }).optional()
});

export const directoryOptionsCitiesResponseSchema = apiSuccessSchema.extend({
  cities: z.array(directorySuggestionOptionSchema),
  meta: z.strictObject({
    scope: z.strictObject({
      mode: z.enum(['single_agency', 'multi_agency', 'global_read']),
      agencyIds: z.array(z.string().trim().min(1, 'Identifiant agence requis'))
    })
  }).optional()
});

export const directoryCitySuggestionsResponseSchema = apiSuccessSchema.extend({
  cities: z.array(directorySuggestionOptionSchema)
});

export const directoryRecordResponseSchema = apiSuccessSchema.extend({
  record: directoryRecordSchema
});

export const directoryCompanySearchResponseSchema = apiSuccessSchema.extend({
  companies: z.array(directoryCompanySearchResultSchema)
});

export const directoryCompanyDetailsResponseSchema = apiSuccessSchema.extend({
  company: directoryCompanyDetailsSchema
});

export const directoryDuplicatesResponseSchema = apiSuccessSchema.extend({
  matches: z.array(directoryDuplicateMatchSchema)
});

export const tierV1SearchResponseSchema = apiSuccessSchema.extend({
  results: z.array(tierV1DirectoryRowSchema)
});

export const tierV1DirectoryListResponseSchema = apiSuccessSchema.extend({
  rows: z.array(tierV1DirectoryRowSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative().optional()
});

export const directorySavedViewsListResponseSchema = apiSuccessSchema.extend({
  views: z.array(directorySavedViewSchema)
});

export const directorySavedViewResponseSchema = apiSuccessSchema.extend({
  view: directorySavedViewSchema
});

export const directorySavedViewDeleteResponseSchema = apiSuccessSchema.extend({
  view_id: z.string().trim().min(1, 'Identifiant vue requis')
});

export const adminAgenciesAgencyResponseSchema = apiSuccessSchema.extend({
  agency: adminAgencySummarySchema
});

export const adminAgenciesDeleteResponseSchema = apiSuccessSchema.extend({
  agency_id: agencyIdSchema
});

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
});

export const adminUsersSetRoleResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  role: userRoleSchema
});

export const adminUsersUpdateIdentityResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  email: z.string().trim().min(1, 'Email requis'),
  first_name: z.string().trim().min(1, 'Prenom requis'),
  last_name: z.string().trim().min(1, 'Nom requis'),
  display_name: z.string().trim().min(1, 'Nom affiche requis').optional()
});

export const adminUsersSetMembershipsResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  agency_ids: z.array(agencyIdSchema),
  membership_mode: membershipModeSchema
});

export const adminUsersResetPasswordResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  temporary_password: z.string().min(1)
});

export const adminUsersArchiveResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  archived: z.boolean()
});

export const adminUsersDeleteResponseSchema = apiSuccessSchema.extend({
  user_id: profileIdSchema,
  deleted: z.literal(true),
  anonymized_interactions: z.number().int().nonnegative().optional(),
  anonymized_agency_ids: z.array(agencyIdSchema).optional(),
  anonymized_orphan_interactions: z.number().int().nonnegative().optional()
});

export const adminUsersResponseSchema = z.union([
  adminUsersCreateResponseSchema,
  adminUsersSetRoleResponseSchema,
  adminUsersUpdateIdentityResponseSchema,
  adminUsersSetMembershipsResponseSchema,
  adminUsersResetPasswordResponseSchema,
  adminUsersArchiveResponseSchema,
  adminUsersDeleteResponseSchema
]);

export const adminUsersListResponseSchema = apiSuccessSchema.extend({
  users: z.array(adminUserSummarySchema)
});

export const adminAuditLogsResponseSchema = apiSuccessSchema.extend({
  logs: z.array(adminAuditLogEntrySchema)
});

export type ApiSuccess = z.infer<typeof apiSuccessSchema>;
export type DataEntitiesResponse = z.infer<typeof dataEntitiesResponseSchema>;
export type DataEntitiesListResponse = z.infer<typeof dataEntitiesListResponseSchema>;
export type DataEntitiesSearchIndexResponse = z.infer<typeof dataEntitiesSearchIndexResponseSchema>;
export type DataEntitiesRouteResponse = z.infer<typeof dataEntitiesRouteResponseSchema>;
export type DataEntitiesReassignResponse = z.infer<typeof dataEntitiesReassignResponseSchema>;
export type DataEntityContactsListResponse = z.infer<typeof dataEntityContactsListResponseSchema>;
export type DataEntityContactsResponse = z.infer<typeof dataEntityContactsResponseSchema>;
export type DataInteractionsMutationResponse = z.infer<typeof dataInteractionsMutationResponseSchema>;
export type DataInteractionsListResponse = z.infer<typeof dataInteractionsListResponseSchema>;
export type DataInteractionsDeleteResponse = z.infer<typeof dataInteractionsDeleteResponseSchema>;
export type DataInteractionsKnownCompaniesResponse = z.infer<typeof dataInteractionsKnownCompaniesResponseSchema>;
export type DataInteractionDraftResponse = z.infer<typeof dataInteractionDraftResponseSchema>;
export type DataInteractionsResponse = z.infer<typeof dataInteractionsResponseSchema>;
export type DataConfigResponse = z.infer<typeof dataConfigResponseSchema>;
export type DataProfileResponse = z.infer<typeof dataProfileResponseSchema>;
export type ConfigGetResponse = z.infer<typeof configGetResponseSchema>;
export type ConfigSaveAgencyResponse = z.infer<typeof configSaveAgencyResponseSchema>;
export type ConfigSaveProductResponse = z.infer<typeof configSaveProductResponseSchema>;
export type DirectoryListResponse = z.infer<typeof directoryListResponseSchema>;
export type DirectoryOptionsAgenciesResponse = z.infer<typeof directoryOptionsAgenciesResponseSchema>;
export type DirectoryOptionsCommercialsResponse = z.infer<typeof directoryOptionsCommercialsResponseSchema>;
export type DirectoryOptionsDepartmentsResponse = z.infer<typeof directoryOptionsDepartmentsResponseSchema>;
export type DirectoryOptionsCitiesResponse = z.infer<typeof directoryOptionsCitiesResponseSchema>;
export type DirectoryCitySuggestionsResponse = z.infer<typeof directoryCitySuggestionsResponseSchema>;
export type DirectoryRecordResponse = z.infer<typeof directoryRecordResponseSchema>;
export type DirectoryCompanySearchResponse = z.infer<typeof directoryCompanySearchResponseSchema>;
export type DirectoryCompanyDetailsResponse = z.infer<typeof directoryCompanyDetailsResponseSchema>;
export type DirectoryDuplicatesResponse = z.infer<typeof directoryDuplicatesResponseSchema>;
export type TierV1SearchResponse = z.infer<typeof tierV1SearchResponseSchema>;
export type TierV1DirectoryListResponse = z.infer<typeof tierV1DirectoryListResponseSchema>;
export type DirectorySavedViewsListResponse = z.infer<typeof directorySavedViewsListResponseSchema>;
export type DirectorySavedViewResponse = z.infer<typeof directorySavedViewResponseSchema>;
export type DirectorySavedViewDeleteResponse = z.infer<typeof directorySavedViewDeleteResponseSchema>;
export type AdminAgencySummary = z.infer<typeof adminAgencySummarySchema>;
export type AdminUserMembership = z.infer<typeof adminUserMembershipSchema>;
export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>;
export type AdminAuditLogEntry = z.infer<typeof adminAuditLogEntrySchema>;
export type AdminAgenciesAgencyResponse = z.infer<typeof adminAgenciesAgencyResponseSchema>;
export type AdminAgenciesDeleteResponse = z.infer<typeof adminAgenciesDeleteResponseSchema>;
export type AdminAgenciesResponse = z.infer<typeof adminAgenciesResponseSchema>;
export type AdminUsersListResponse = z.infer<typeof adminUsersListResponseSchema>;
export type AdminAuditLogsResponse = z.infer<typeof adminAuditLogsResponseSchema>;
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
