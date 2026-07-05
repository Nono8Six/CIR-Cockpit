import {
  configGetResponseSchema,
  configIntegrityInteractionUpdateResponseSchema,
  configIntegrityInteractionsResponseSchema,
  configUsageResponseSchema,
  configReferenceActionResponseSchema,
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
} from '../../../../shared/schemas/system/api-responses.ts';
import { adminAgenciesPayloadSchema } from '../../../../shared/schemas/admin/agency.schema.ts';
import {
  cockpitAgencyMembersInputSchema,
  cockpitAgencyMembersResponseSchema,
  cockpitPhoneLookupInputSchema,
  cockpitPhoneLookupResponseSchema
} from '../../../../shared/schemas/interaction/cockpit.schema.ts';
import {
  configGetInputSchema,
  configIntegrityInteractionUpdateInputSchema,
  configIntegrityInteractionsInputSchema,
  configUsageInputSchema,
  configReferenceActionInputSchema
} from '../../../../shared/schemas/system/config.schema.ts';
import {
  dataConfigPayloadSchema,
  dataEntitiesPayloadSchema,
  dataEntityContactsPayloadSchema,
  dataInteractionsPayloadSchema,
  dataProfilePayloadSchema,
  type DataEntitiesPayload
} from '../../../../shared/schemas/system/data.schema.ts';
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
} from '../../../../shared/schemas/system/directory.schema.ts';
import {
  tierV1DirectoryListInputSchema,
  tierV1SearchInputSchema
} from '../../../../shared/schemas/interaction/tier-v1.schema.ts';
import {
  pricingReferenceAnomaliesListInputSchema,
  pricingReferenceAnomaliesListResponseSchema,
  pricingReferenceAnomaliesExportInputSchema,
  pricingReferenceAnomaliesExportResponseSchema,
  pricingReferenceAnomaliesSummaryGetInputSchema,
  pricingReferenceAnomaliesSummaryResponseSchema,
  pricingReferenceClassificationListAllInputSchema,
  pricingReferenceClassificationListAllResponseSchema,
  pricingReferenceClassificationListInputSchema,
  pricingReferenceClassificationListResponseSchema,
  pricingReferenceDiagnoseInputSchema,
  pricingReferenceDiagnoseResponseSchema,
  pricingReferenceHealthGetInputSchema,
  pricingReferenceHealthGetResponseSchema,
  pricingReferenceImportAnalyzeInputSchema,
  pricingReferenceImportAnalyzeResponseSchema,
  pricingReferenceImportConfirmMappingInputSchema,
  pricingReferenceImportConfirmMappingResponseSchema,
  pricingReferenceImportGetInputSchema,
  pricingReferenceImportGetResponseSchema,
  pricingReferenceImportAssistMappingInputSchema,
  pricingReferenceImportAssistMappingResponseSchema,
  pricingReferenceImportInspectInputSchema,
  pricingReferenceImportInspectResponseSchema,
  pricingReferenceImportsListInputSchema,
  pricingReferenceImportsListResponseSchema,
  pricingReferenceImportsPrepareInputSchema,
  pricingReferenceImportsPrepareResponseSchema,
  pricingReferenceSegmentsListInputSchema,
  pricingReferenceSegmentsListResponseSchema
} from '../../../../shared/schemas/pricing/references.schema.ts';
import {
  aiPromptsListInputSchema,
  aiPromptsListResponseSchema,
  aiPromptsPublishInputSchema,
  aiPromptsPublishResponseSchema,
  aiPromptsRestoreInputSchema,
  aiPromptsRestoreResponseSchema,
  aiPromptsSaveDraftInputSchema,
  aiPromptsSaveDraftResponseSchema,
  aiSettingsGetInputSchema,
  aiSettingsGetResponseSchema,
  aiSettingsSaveModelInputSchema,
  aiSettingsSaveModelResponseSchema,
  aiSettingsSaveProviderInputSchema,
  aiSettingsSaveProviderResponseSchema,
  aiSettingsSaveQuotaInputSchema,
  aiSettingsSaveQuotaResponseSchema,
  aiSettingsTestProviderInputSchema,
  aiSettingsTestProviderResponseSchema,
  aiUsageListInputSchema,
  aiUsageListResponseSchema,
  aiUsageSummaryInputSchema,
  aiUsageSummaryResponseSchema
} from '../../../../shared/schemas/ai.schema.ts';
import {
  adminAuditLogsInputSchema,
  adminUsersListInputSchema,
  adminUsersPayloadSchema
} from '../../../../shared/schemas/admin/user.schema.ts';
import { handleAdminAgenciesAction } from '../services/admin/adminAgencies.ts';
import { listAdminAuditLogs, listAdminUsers } from '../services/admin/adminQueries.ts';
import { handleAdminUsersAction } from '../services/admin/adminUsers.ts';
import { handleConfigReferenceAction } from '../services/config/configSettings.ts';
import { getConfigSnapshot } from '../services/config/configSnapshot.ts';
import { getConfigIntegrityInteractions } from '../services/config/configIntegrityInteractions.ts';
import { updateConfigIntegrityInteraction } from '../services/config/configIntegrityInteractionUpdate.ts';
import { getConfigUsage } from '../services/config/configUsage.ts';
import { handleDataConfigAction } from '../services/data/dataConfig.ts';
import { handleDataEntitiesAction } from '../services/entities/core/dataEntities.ts';
import { handleDataEntityContactsAction } from '../services/entities/contacts/dataEntityContacts.ts';
import { handleDataInteractionsAction } from '../services/entities/interactions/dataInteractions.ts';
import { handleDataProfileAction } from '../services/data/dataProfile.ts';
import { searchEntitiesUnified } from '../services/search/dataSearchEntitiesUnified.ts';
import { listCockpitAgencyMembers, lookupCockpitPhone } from '../services/config/cockpit.ts';
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
} from '../services/directory/core/directorySavedViews.ts';
import {
  analyzePricingReferenceImport,
  assistPricingReferenceImportMapping,
  confirmPricingReferenceImportMapping,
  exportPricingReferenceAnomalies,
  getPricingReferenceAnomaliesSummary,
  getPricingReferenceHealth,
  getPricingReferenceImport,
  inspectPricingReferenceImport,
  listAllPricingReferenceClassification,
  listPricingReferenceAnomalies,
  listPricingReferenceClassification,
  listPricingReferenceImports,
  listPricingReferenceSegments,
  preparePricingReferenceImport
} from '../services/pricing/references/referenceImports.ts';
import {
  getAiSettings,
  getAiUsageSummary,
  listAiPrompts,
  listAiUsageEvents,
  publishAiPrompt,
  restoreAiPrompt,
  runPricingReferenceDiagnosis,
  saveAiPromptDraft,
  saveAiModel,
  saveAiProvider,
  saveAiQuota,
  testAiProvider
} from '../services/ai/aiGovernance.ts';
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
    usage: authedProcedure
      .input(configUsageInputSchema)
      .output(configUsageResponseSchema)
      .query(withAuthedHandler(getConfigUsage)),
    'integrity-interactions': authedProcedure
      .input(configIntegrityInteractionsInputSchema)
      .output(configIntegrityInteractionsResponseSchema)
      .query(withAuthedHandler(getConfigIntegrityInteractions)),
    'integrity-interaction-update': authedProcedure
      .input(configIntegrityInteractionUpdateInputSchema)
      .output(configIntegrityInteractionUpdateResponseSchema)
      .mutation(withAuthedHandler(updateConfigIntegrityInteraction)),
    reference: authedProcedure
      .input(configReferenceActionInputSchema)
      .output(configReferenceActionResponseSchema)
      .mutation(withAuthedHandler(handleConfigReferenceAction))
  }),
  pricing: router({
    references: router({
      imports: router({
        prepare: superAdminProcedure
          .input(pricingReferenceImportsPrepareInputSchema)
          .output(pricingReferenceImportsPrepareResponseSchema)
          .mutation(withSuperAdminHandler(preparePricingReferenceImport)),
        analyze: superAdminProcedure
          .input(pricingReferenceImportAnalyzeInputSchema)
          .output(pricingReferenceImportAnalyzeResponseSchema)
          .mutation(withSuperAdminHandler(analyzePricingReferenceImport)),
        inspect: superAdminProcedure
          .input(pricingReferenceImportInspectInputSchema)
          .output(pricingReferenceImportInspectResponseSchema)
          .mutation(withSuperAdminHandler(inspectPricingReferenceImport)),
        assistMapping: superAdminProcedure
          .input(pricingReferenceImportAssistMappingInputSchema)
          .output(pricingReferenceImportAssistMappingResponseSchema)
          .mutation(withSuperAdminHandler(assistPricingReferenceImportMapping)),
        confirmMapping: superAdminProcedure
          .input(pricingReferenceImportConfirmMappingInputSchema)
          .output(pricingReferenceImportConfirmMappingResponseSchema)
          .mutation(withSuperAdminHandler(confirmPricingReferenceImportMapping)),
        list: authedProcedure
          .input(pricingReferenceImportsListInputSchema)
          .output(pricingReferenceImportsListResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            listPricingReferenceImports(db, authContext.userId, requestId, input)
          )),
        get: authedProcedure
          .input(pricingReferenceImportGetInputSchema)
          .output(pricingReferenceImportGetResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            getPricingReferenceImport(db, authContext.userId, requestId, input)
          ))
      }),
      health: router({
        get: authedProcedure
          .input(pricingReferenceHealthGetInputSchema)
          .output(pricingReferenceHealthGetResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            getPricingReferenceHealth(db, authContext.userId, requestId, input)
          ))
      }),
      classification: router({
        list: authedProcedure
          .input(pricingReferenceClassificationListInputSchema)
          .output(pricingReferenceClassificationListResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            listPricingReferenceClassification(db, authContext.userId, requestId, input)
          )),
        listAll: authedProcedure
          .input(pricingReferenceClassificationListAllInputSchema)
          .output(pricingReferenceClassificationListAllResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            listAllPricingReferenceClassification(db, authContext.userId, requestId, input)
          ))
      }),
      segments: router({
        list: authedProcedure
          .input(pricingReferenceSegmentsListInputSchema)
          .output(pricingReferenceSegmentsListResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            listPricingReferenceSegments(db, authContext.userId, requestId, input)
          ))
      }),
      anomalies: router({
        list: authedProcedure
          .input(pricingReferenceAnomaliesListInputSchema)
          .output(pricingReferenceAnomaliesListResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            listPricingReferenceAnomalies(db, authContext.userId, requestId, input)
          )),
        summary: authedProcedure
          .input(pricingReferenceAnomaliesSummaryGetInputSchema)
          .output(pricingReferenceAnomaliesSummaryResponseSchema)
          .query(withAuthedHandler((db, authContext, requestId, input) =>
            getPricingReferenceAnomaliesSummary(db, authContext.userId, requestId, input)
          )),
        export: authedProcedure
          .input(pricingReferenceAnomaliesExportInputSchema)
          .output(pricingReferenceAnomaliesExportResponseSchema)
          .mutation(withAuthedHandler((db, authContext, requestId, input) =>
            exportPricingReferenceAnomalies(db, authContext.userId, requestId, input)
          ))
      }),
      diagnose: authedProcedure
        .input(pricingReferenceDiagnoseInputSchema)
        .output(pricingReferenceDiagnoseResponseSchema)
        .mutation(withAuthedHandler(runPricingReferenceDiagnosis))
    })
  }),
  ai: router({
    settings: router({
      get: superAdminProcedure
        .input(aiSettingsGetInputSchema)
        .output(aiSettingsGetResponseSchema)
        .query(withSuperAdminHandler(getAiSettings)),
      saveProvider: superAdminProcedure
        .input(aiSettingsSaveProviderInputSchema)
        .output(aiSettingsSaveProviderResponseSchema)
        .mutation(withSuperAdminHandler(saveAiProvider)),
      saveModel: superAdminProcedure
        .input(aiSettingsSaveModelInputSchema)
        .output(aiSettingsSaveModelResponseSchema)
        .mutation(withSuperAdminHandler(saveAiModel)),
      saveQuota: superAdminProcedure
        .input(aiSettingsSaveQuotaInputSchema)
        .output(aiSettingsSaveQuotaResponseSchema)
        .mutation(withSuperAdminHandler(saveAiQuota)),
      testProvider: superAdminProcedure
        .input(aiSettingsTestProviderInputSchema)
        .output(aiSettingsTestProviderResponseSchema)
        .mutation(withSuperAdminHandler(testAiProvider))
    }),
    prompts: router({
      list: superAdminProcedure
        .input(aiPromptsListInputSchema)
        .output(aiPromptsListResponseSchema)
        .query(withSuperAdminHandler(listAiPrompts)),
      saveDraft: superAdminProcedure
        .input(aiPromptsSaveDraftInputSchema)
        .output(aiPromptsSaveDraftResponseSchema)
        .mutation(withSuperAdminHandler(saveAiPromptDraft)),
      publish: superAdminProcedure
        .input(aiPromptsPublishInputSchema)
        .output(aiPromptsPublishResponseSchema)
        .mutation(withSuperAdminHandler(publishAiPrompt)),
      restore: superAdminProcedure
        .input(aiPromptsRestoreInputSchema)
        .output(aiPromptsRestoreResponseSchema)
        .mutation(withSuperAdminHandler(restoreAiPrompt))
    }),
    usage: router({
      summary: superAdminProcedure
        .input(aiUsageSummaryInputSchema)
        .output(aiUsageSummaryResponseSchema)
        .query(withSuperAdminHandler(getAiUsageSummary)),
      list: superAdminProcedure
        .input(aiUsageListInputSchema)
        .output(aiUsageListResponseSchema)
        .query(withSuperAdminHandler(listAiUsageEvents))
    })
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
