import {
  configGetResponseSchema,
  configSaveAgencyResponseSchema,
  configSaveProductResponseSchema,
  adminAgenciesResponseSchema,
  adminAuditLogsResponseSchema,
  adminUsersListResponseSchema,
  adminUsersResponseSchema,
  dataConfigResponseSchema,
  dataEntitiesRouteResponseSchema,
  dataEntityContactsResponseSchema,
  dataInteractionsResponseSchema,
  dataProfileResponseSchema,
  directoryCitySuggestionsResponseSchema,
  directoryCompanyDetailsResponseSchema,
  directoryCompanySearchResponseSchema,
  directoryDuplicatesResponseSchema,
  directoryListResponseSchema,
  directoryOptionsAgenciesResponseSchema,
  directoryOptionsCitiesResponseSchema,
  directoryOptionsCommercialsResponseSchema,
  directoryOptionsDepartmentsResponseSchema,
  directoryRecordResponseSchema,
  directorySavedViewDeleteResponseSchema,
  directorySavedViewResponseSchema,
  directorySavedViewsListResponseSchema,
  tierV1DirectoryListResponseSchema,
  tierV1SearchResponseSchema
} from '../../../../shared/schemas/api-responses.ts';
import { adminAgenciesPayloadSchema } from '../../../../shared/schemas/agency.schema.ts';
import {
  cockpitAgencyMembersInputSchema,
  cockpitAgencyMembersResponseSchema,
  cockpitPhoneLookupInputSchema,
  cockpitPhoneLookupResponseSchema
} from '../../../../shared/schemas/cockpit.schema.ts';
import {
  configGetInputSchema,
  configSaveAgencyInputSchema,
  configSaveProductInputSchema
} from '../../../../shared/schemas/config.schema.ts';
import {
  dataConfigPayloadSchema,
  dataEntitiesPayloadSchema,
  dataEntityContactsPayloadSchema,
  dataInteractionsPayloadSchema,
  dataProfilePayloadSchema,
  type DataEntitiesPayload
} from '../../../../shared/schemas/data.schema.ts';
import {
  directoryCitySuggestionsInputSchema,
  directoryCompanyDetailsInputSchema,
  directoryCompanySearchInputSchema,
  directoryDuplicatesInputSchema,
  directoryListInputSchema,
  directoryOptionsAgenciesInputSchema,
  directoryOptionsCitiesInputSchema,
  directoryOptionsFacetInputSchema,
  directoryRouteRefSchema,
  directorySavedViewDeleteInputSchema,
  directorySavedViewSaveInputSchema,
  directorySavedViewSetDefaultInputSchema,
  directorySavedViewsListInputSchema
} from '../../../../shared/schemas/directory.schema.ts';
import {
  tierV1DirectoryListInputSchema,
  tierV1SearchInputSchema
} from '../../../../shared/schemas/tier-v1.schema.ts';
import {
  adminAuditLogsInputSchema,
  adminUsersListInputSchema,
  adminUsersPayloadSchema
} from '../../../../shared/schemas/user.schema.ts';
import { handleAdminAgenciesAction } from '../services/adminAgencies.ts';
import { listAdminAuditLogs, listAdminUsers } from '../services/adminQueries.ts';
import { handleAdminUsersAction } from '../services/adminUsers.ts';
import { saveAgencyConfigSettings, saveProductConfigSettings } from '../services/configSettings.ts';
import { getConfigSnapshot } from '../services/configSnapshot.ts';
import { handleDataConfigAction } from '../services/dataConfig.ts';
import { handleDataEntitiesAction } from '../services/dataEntities.ts';
import { handleDataEntityContactsAction } from '../services/dataEntityContacts.ts';
import { handleDataInteractionsAction } from '../services/dataInteractions.ts';
import { handleDataProfileAction } from '../services/dataProfile.ts';
import { searchEntitiesUnified } from '../services/dataSearchEntitiesUnified.ts';
import { listCockpitAgencyMembers, lookupCockpitPhone } from '../services/cockpit.ts';
import {
  getDirectoryCitySuggestions,
  getDirectoryCompanyDetails,
  getDirectoryCompanySearch,
  getDirectoryDuplicates,
  getDirectoryOptionAgencies,
  getDirectoryOptionCities,
  getDirectoryOptionCommercials,
  getDirectoryOptionDepartments,
  getDirectoryRecord,
  listDirectory
} from '../services/directory.ts';
import {
  deleteDirectorySavedView,
  listDirectorySavedViews,
  saveDirectorySavedView,
  setDefaultDirectorySavedView
} from '../services/directorySavedViews.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { authedProcedure, router, superAdminProcedure } from './procedures.ts';
import { withAuthedDualDbHandler, withAuthedHandler, withSuperAdminHandler } from './procedureHelpers.ts';

const isServiceRoleDataEntitiesAction = (
  payload: Pick<DataEntitiesPayload, 'action'>
): boolean => payload.action === 'reassign' || payload.action === 'delete';

export const selectDataEntitiesDb = (
  payload: Pick<DataEntitiesPayload, 'action'>,
  db: DbClient,
  userDb: DbClient
): DbClient => (isServiceRoleDataEntitiesAction(payload) ? db : userDb);

const rejectDeferredTierV1Contract = (): Promise<never> => {
  return Promise.reject(httpError(
    501,
    'REQUEST_FAILED',
    'Contrat V1 disponible. Implementation prevue dans la tranche suivante.'
  ));
};

export const appRouter = router({
  data: router({
    entities: authedProcedure
      .input(dataEntitiesPayloadSchema)
      .output(dataEntitiesRouteResponseSchema)
      .mutation(withAuthedDualDbHandler(handleDataEntitiesAction, selectDataEntitiesDb)),
    'entity-contacts': authedProcedure
      .input(dataEntityContactsPayloadSchema)
      .output(dataEntityContactsResponseSchema)
      .mutation(withAuthedHandler(handleDataEntityContactsAction)),
    interactions: authedProcedure
      .input(dataInteractionsPayloadSchema)
      .output(dataInteractionsResponseSchema)
      .mutation(withAuthedHandler(handleDataInteractionsAction)),
    config: authedProcedure
      .input(dataConfigPayloadSchema)
      .output(dataConfigResponseSchema)
      .mutation(withAuthedHandler((db, authContext, requestId, input) => {
        return handleDataConfigAction(db, authContext, requestId, input.agency_id, input);
      })),
    profile: authedProcedure
      .input(dataProfilePayloadSchema)
      .output(dataProfileResponseSchema)
      .mutation(withAuthedHandler(handleDataProfileAction)),
    searchEntitiesUnified: authedProcedure
      .input(tierV1SearchInputSchema)
      .output(tierV1SearchResponseSchema)
      .query(withAuthedDualDbHandler(searchEntitiesUnified, (_input, db) => db))
  }),
  cockpit: router({
    'agency-members': authedProcedure
      .input(cockpitAgencyMembersInputSchema)
      .output(cockpitAgencyMembersResponseSchema)
      .query(withAuthedHandler(listCockpitAgencyMembers)),
    'phone-lookup': authedProcedure
      .input(cockpitPhoneLookupInputSchema)
      .output(cockpitPhoneLookupResponseSchema)
      .query(withAuthedHandler(lookupCockpitPhone))
  }),
  admin: router({
    'users-list': superAdminProcedure
      .input(adminUsersListInputSchema)
      .output(adminUsersListResponseSchema)
      .query(withSuperAdminHandler(listAdminUsers)),
    'audit-logs': authedProcedure
      .input(adminAuditLogsInputSchema)
      .output(adminAuditLogsResponseSchema)
      .query(withAuthedDualDbHandler(listAdminAuditLogs, (_input, db) => db)),
    users: superAdminProcedure
      .input(adminUsersPayloadSchema)
      .output(adminUsersResponseSchema)
      .mutation(withSuperAdminHandler(handleAdminUsersAction)),
    agencies: superAdminProcedure
      .input(adminAgenciesPayloadSchema)
      .output(adminAgenciesResponseSchema)
      .mutation(withSuperAdminHandler(handleAdminAgenciesAction))
  }),
  config: router({
    get: authedProcedure
      .input(configGetInputSchema)
      .output(configGetResponseSchema)
      .query(withAuthedHandler(getConfigSnapshot)),
    'save-agency': authedProcedure
      .input(configSaveAgencyInputSchema)
      .output(configSaveAgencyResponseSchema)
      .mutation(withAuthedHandler(saveAgencyConfigSettings)),
    'save-product': superAdminProcedure
      .input(configSaveProductInputSchema)
      .output(configSaveProductResponseSchema)
      .mutation(withSuperAdminHandler(saveProductConfigSettings))
  }),
  directory: router({
    list: authedProcedure
      .input(directoryListInputSchema)
      .output(directoryListResponseSchema)
      .query(withAuthedHandler(listDirectory)),
    options: router({
      agencies: authedProcedure
        .input(directoryOptionsAgenciesInputSchema)
        .output(directoryOptionsAgenciesResponseSchema)
        .query(withAuthedHandler(getDirectoryOptionAgencies)),
      commercials: authedProcedure
        .input(directoryOptionsFacetInputSchema)
        .output(directoryOptionsCommercialsResponseSchema)
        .query(withAuthedHandler(getDirectoryOptionCommercials)),
      departments: authedProcedure
        .input(directoryOptionsFacetInputSchema)
        .output(directoryOptionsDepartmentsResponseSchema)
        .query(withAuthedHandler(getDirectoryOptionDepartments)),
      cities: authedProcedure
        .input(directoryOptionsCitiesInputSchema)
        .output(directoryOptionsCitiesResponseSchema)
        .query(withAuthedHandler(getDirectoryOptionCities))
    }),
    'city-suggestions': authedProcedure
      .input(directoryCitySuggestionsInputSchema)
      .output(directoryCitySuggestionsResponseSchema)
      .query(withAuthedHandler(getDirectoryCitySuggestions)),
    'company-search': authedProcedure
      .input(directoryCompanySearchInputSchema)
      .output(directoryCompanySearchResponseSchema)
      .query(withAuthedHandler(getDirectoryCompanySearch)),
    'company-details': authedProcedure
      .input(directoryCompanyDetailsInputSchema)
      .output(directoryCompanyDetailsResponseSchema)
      .query(withAuthedHandler(getDirectoryCompanyDetails)),
    duplicates: authedProcedure
      .input(directoryDuplicatesInputSchema)
      .output(directoryDuplicatesResponseSchema)
      .query(withAuthedHandler(getDirectoryDuplicates)),
    record: authedProcedure
      .input(directoryRouteRefSchema)
      .output(directoryRecordResponseSchema)
      .query(withAuthedHandler(getDirectoryRecord)),
    'tiers-list': authedProcedure
      .input(tierV1DirectoryListInputSchema)
      .output(tierV1DirectoryListResponseSchema)
      .query(withAuthedHandler(rejectDeferredTierV1Contract)),
    'saved-views': router({
      list: authedProcedure
        .input(directorySavedViewsListInputSchema)
        .output(directorySavedViewsListResponseSchema)
        .query(withAuthedHandler(listDirectorySavedViews)),
      save: authedProcedure
        .input(directorySavedViewSaveInputSchema)
        .output(directorySavedViewResponseSchema)
        .mutation(withAuthedHandler(saveDirectorySavedView)),
      delete: authedProcedure
        .input(directorySavedViewDeleteInputSchema)
        .output(directorySavedViewDeleteResponseSchema)
        .mutation(withAuthedHandler(deleteDirectorySavedView)),
      'set-default': authedProcedure
        .input(directorySavedViewSetDefaultInputSchema)
        .output(directorySavedViewResponseSchema)
        .mutation(withAuthedHandler(setDefaultDirectorySavedView))
    })
  })
});

export type AppRouter = typeof appRouter;
