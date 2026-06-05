import { z } from 'zod/v4';

import type { Database, Json } from '../../supabase.types.ts';
import {
  configIntegrityInteractionRowSchema,
  configUsageSnapshotSchema,
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
import { membershipModeSchema, userRoleSchema } from '../admin/user.schema.ts';
import { tierV1DirectoryRowSchema } from '../interaction/tier-v1.schema.ts';

type EntityRow = Database['public']['Tables']['entities']['Row'];
type EntityContactRow = Database['public']['Tables']['entity_contacts']['Row'];
type InteractionRow = Database['public']['Tables']['interactions']['Row'];
type InteractionDraftRow = Pick<Database['public']['Tables']['interaction_drafts']['Row'], 'id' | 'payload' | 'updated_at'>;
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type AgencyMemberRow = Database['public']['Tables']['agency_members']['Row'];

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema)
  ])
);

const nonEmptyStringSchema = (message: string) => z.string().trim().min(1, message);
const nullableStringSchema = z.string().nullable();
const accountTypeSchema = z.enum(['term', 'cash']).nullable();

const entityRowSchema: z.ZodType<EntityRow> = z.strictObject({
  account_type: accountTypeSchema,
  address: nullableStringSchema,
  agency_id: nullableStringSchema,
  archived_at: nullableStringSchema,
  cir_agency_id: nullableStringSchema,
  cir_commercial_id: nullableStringSchema,
  city: nullableStringSchema,
  client_kind: nullableStringSchema,
  client_number: nullableStringSchema,
  country: nonEmptyStringSchema('Pays requis'),
  created_at: nonEmptyStringSchema('Date de creation requise'),
  created_by: nullableStringSchema,
  department: nullableStringSchema,
  entity_type: nonEmptyStringSchema('Type de tiers requis'),
  first_name: nullableStringSchema,
  id: nonEmptyStringSchema('Identifiant entite requis'),
  last_name: nullableStringSchema,
  naf_code: nullableStringSchema,
  name: nonEmptyStringSchema('Nom requis'),
  notes: nullableStringSchema,
  official_data_source: nullableStringSchema,
  official_data_synced_at: nullableStringSchema,
  official_name: nullableStringSchema,
  postal_code: nullableStringSchema,
  primary_email: nullableStringSchema,
  primary_phone: nullableStringSchema,
  siren: nullableStringSchema,
  siret: nullableStringSchema,
  supplier_code: nullableStringSchema,
  supplier_number: nullableStringSchema,
  updated_at: nonEmptyStringSchema('Date de mise a jour requise')
});

const entityContactRowSchema: z.ZodType<EntityContactRow> = z.strictObject({
  archived_at: nullableStringSchema,
  created_at: nonEmptyStringSchema('Date de creation requise'),
  email: nullableStringSchema,
  entity_id: nonEmptyStringSchema('Identifiant entite requis'),
  first_name: nullableStringSchema,
  id: nonEmptyStringSchema('Identifiant contact requis'),
  last_name: nonEmptyStringSchema('Nom du contact requis'),
  notes: nullableStringSchema,
  phone: nullableStringSchema,
  position: nullableStringSchema,
  updated_at: nonEmptyStringSchema('Date de mise a jour requise')
});

const interactionRowSchema: z.ZodType<InteractionRow> = z.strictObject({
  agency_id: nullableStringSchema,
  channel: nonEmptyStringSchema('Canal requis'),
  company_name: z.string(),
  contact_email: nullableStringSchema,
  contact_id: nullableStringSchema,
  contact_name: z.string(),
  contact_phone: nullableStringSchema,
  contact_service: z.string(),
  created_at: nonEmptyStringSchema('Date de creation requise'),
  created_by: nonEmptyStringSchema('Createur requis'),
  entity_id: nullableStringSchema,
  entity_type: nonEmptyStringSchema('Type de tiers requis'),
  id: nonEmptyStringSchema('Identifiant interaction requis'),
  interaction_type: nonEmptyStringSchema("Type d'interaction requis"),
  last_action_at: nonEmptyStringSchema('Date de derniere action requise'),
  mega_families: z.array(z.string()),
  notes: nullableStringSchema,
  order_ref: nullableStringSchema,
  reminder_at: nullableStringSchema,
  status: z.string(),
  status_id: nullableStringSchema,
  status_is_terminal: z.boolean(),
  subject: z.string(),
  timeline: jsonSchema,
  updated_at: nonEmptyStringSchema('Date de mise a jour requise'),
  updated_by: nullableStringSchema
});

const interactionDraftRowSchema: z.ZodType<InteractionDraftRow> = z.strictObject({
  id: nonEmptyStringSchema('Identifiant brouillon requis'),
  payload: jsonSchema,
  updated_at: nonEmptyStringSchema('Date de mise a jour requise')
});

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
export const configUsageResponseSchema = apiSuccessSchema.extend({
  usage: configUsageSnapshotSchema
});
export const configReferenceActionResponseSchema = apiSuccessSchema.extend({
  usage_count: z.number().int().nonnegative(),
  deactivated: z.boolean().optional(),
  migrated_interactions_count: z.number().int().nonnegative().optional()
});
export const configIntegrityInteractionsResponseSchema = apiSuccessSchema.extend({
  interactions: z.array(configIntegrityInteractionRowSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});
export const configIntegrityInteractionUpdateResponseSchema = apiSuccessSchema.extend({
  interaction_id: z.string().trim().min(1, 'Identifiant interaction requis')
});
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

export const adminUsersBulkDeleteResponseSchema = apiSuccessSchema.extend({
  deleted: z.literal(true),
  deleted_count: z.number().int().positive(),
  user_ids: z.array(profileIdSchema),
  anonymized_interactions: z.number().int().nonnegative(),
  anonymized_agency_ids: z.array(agencyIdSchema),
  anonymized_orphan_interactions: z.number().int().nonnegative()
});

export const adminUsersResponseSchema = z.union([
  adminUsersCreateResponseSchema,
  adminUsersSetRoleResponseSchema,
  adminUsersUpdateIdentityResponseSchema,
  adminUsersSetMembershipsResponseSchema,
  adminUsersResetPasswordResponseSchema,
  adminUsersArchiveResponseSchema,
  adminUsersDeleteResponseSchema,
  adminUsersBulkDeleteResponseSchema
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
export type ConfigUsageResponse = z.infer<typeof configUsageResponseSchema>;
export type ConfigReferenceActionResponse = z.infer<typeof configReferenceActionResponseSchema>;
export type ConfigIntegrityInteractionsResponse = z.infer<typeof configIntegrityInteractionsResponseSchema>;
export type ConfigIntegrityInteractionUpdateResponse = z.infer<typeof configIntegrityInteractionUpdateResponseSchema>;
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
export type AdminUsersBulkDeleteResponse = z.infer<typeof adminUsersBulkDeleteResponseSchema>;
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;
export type MembershipMode = z.infer<typeof membershipModeSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type EntityId = EntityRow['id'];
export type EntityContactId = EntityContactRow['id'];
export type AgencyId = AgencyMemberRow['agency_id'];
export type ProfileId = ProfileRow['id'];
