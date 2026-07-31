import {
  type inferRouterInputs,
  type inferRouterOutputs,
  initTRPC,
} from "@trpc/server";

import { adminAgenciesPayloadSchema } from "../schemas/admin/agency.schema.ts";
import {
  adminAgenciesResponseSchema,
  adminAuditLogsResponseSchema,
  adminUsersListResponseSchema,
  adminUsersResponseSchema,
  configGetResponseSchema,
  configIntegrityInteractionsResponseSchema,
  configIntegrityInteractionUpdateResponseSchema,
  configReferenceActionResponseSchema,
  configUsageResponseSchema,
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
  tierV1SearchResponseSchema,
} from "../schemas/system/api-responses.ts";
import {
  cockpitAgencyMembersInputSchema,
  cockpitAgencyMembersResponseSchema,
  cockpitPhoneLookupInputSchema,
  cockpitPhoneLookupResponseSchema,
} from "../schemas/interaction/cockpit.schema.ts";
import {
  configGetInputSchema,
  configIntegrityInteractionsInputSchema,
  configIntegrityInteractionUpdateInputSchema,
  configReferenceActionInputSchema,
  configUsageInputSchema,
} from "../schemas/system/config.schema.ts";
import {
  dataConfigPayloadSchema,
  dataEntitiesPayloadSchema,
  dataEntityContactsPayloadSchema,
  dataInteractionsPayloadSchema,
  dataProfilePayloadSchema,
} from "../schemas/system/data.schema.ts";
import { tierV1SearchInputSchema } from "../schemas/interaction/tier-v1.schema.ts";
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
  directorySavedViewsListInputSchema,
} from "../schemas/system/directory.schema.ts";
import {
  adminAuditLogsInputSchema,
  adminUsersListInputSchema,
  adminUsersPayloadSchema,
} from "../schemas/admin/user.schema.ts";
import {
  pricingReferenceAnomaliesExportInputSchema,
  pricingReferenceAnomaliesExportResponseSchema,
  pricingReferenceAnomaliesListInputSchema,
  pricingReferenceAnomaliesListResponseSchema,
  pricingReferenceAnomaliesSummaryGetInputSchema,
  pricingReferenceAnomaliesSummaryResponseSchema,
  pricingReferenceClassificationListAllInputSchema,
  pricingReferenceClassificationListAllResponseSchema,
  pricingReferenceClassificationListInputSchema,
  pricingReferenceClassificationListResponseSchema,
  pricingReferenceDiagnoseInputSchema,
  pricingReferenceDiagnoseResponseSchema,
  pricingReferenceDiffAggregateInputSchema,
  pricingReferenceDiffAggregateResponseSchema,
  pricingReferenceDiffsComputeInputSchema,
  pricingReferenceDiffsComputeResponseSchema,
  pricingReferenceDiffsListInputSchema,
  pricingReferenceDiffsListResponseSchema,
  pricingReferenceDiffsSummaryGetInputSchema,
  pricingReferenceDiffsSummaryResponseSchema,
  pricingReferenceHealthGetInputSchema,
  pricingReferenceHealthGetResponseSchema,
  pricingReferenceImportActivateInputSchema,
  pricingReferenceImportActivateResponseSchema,
  pricingReferenceImportAnalyzeInputSchema,
  pricingReferenceImportAnalyzeResponseSchema,
  pricingReferenceImportAssistMappingInputSchema,
  pricingReferenceImportAssistMappingResponseSchema,
  pricingReferenceImportConfirmMappingInputSchema,
  pricingReferenceImportConfirmMappingResponseSchema,
  pricingReferenceImportGetInputSchema,
  pricingReferenceImportGetResponseSchema,
  pricingReferenceImportInspectInputSchema,
  pricingReferenceImportInspectResponseSchema,
  pricingReferenceImportsListInputSchema,
  pricingReferenceImportsListResponseSchema,
  pricingReferenceImportsPrepareInputSchema,
  pricingReferenceImportsPrepareResponseSchema,
  pricingReferenceSegmentDetailInputSchema,
  pricingReferenceSegmentDetailResponseSchema,
  pricingReferenceSegmentsListInputSchema,
  pricingReferenceSegmentsListResponseSchema,
} from "../schemas/pricing/references.schema.ts";
import {
  aiFeatureGrantDeleteInputSchema,
  aiFeatureGrantMutationResponseSchema,
  aiFeatureGrantSaveInputSchema,
  aiFeatureGrantsListInputSchema,
  aiFeatureGrantsListResponseSchema,
  aiMembersAccessOverviewInputSchema,
  aiMembersAccessOverviewResponseSchema,
  aiPromptsListInputSchema,
  aiPromptsListResponseSchema,
  aiPromptsDeleteInputSchema,
  aiPromptsDeleteResponseSchema,
  aiPromptsPublishInputSchema,
  aiPromptsPublishResponseSchema,
  aiPromptsRestoreInputSchema,
  aiPromptsRestoreResponseSchema,
  aiPromptsSaveDraftInputSchema,
  aiPromptsSaveDraftResponseSchema,
  aiPromptsSetArchivedInputSchema,
  aiPromptsSetArchivedResponseSchema,
  aiSettingsGetInputSchema,
  aiSettingsGetResponseSchema,
  aiSettingsCreateQuotaInputSchema,
  aiSettingsCreateQuotaResponseSchema,
  aiSettingsDeleteModelInputSchema,
  aiSettingsDeleteModelResponseSchema,
  aiSettingsDeleteQuotaInputSchema,
  aiSettingsDeleteQuotaResponseSchema,
  aiSettingsSaveModelInputSchema,
  aiSettingsSaveModelResponseSchema,
  aiSettingsSaveProviderInputSchema,
  aiSettingsSaveProviderResponseSchema,
  aiSettingsSaveQuotaInputSchema,
  aiSettingsSaveQuotaResponseSchema,
  aiSettingsTestProviderInputSchema,
  aiSettingsTestProviderResponseSchema,
  aiUsageByMemberInputSchema,
  aiUsageByMemberResponseSchema,
  aiUsageListInputSchema,
  aiUsageListResponseSchema,
  aiUsageSummaryInputSchema,
  aiUsageSummaryResponseSchema,
} from "../schemas/ai.schema.ts";
import {
  aiAssistantAskInputSchema,
  aiAssistantAskResponseSchema,
  aiAssistantStatusResponseSchema,
} from "../schemas/aiAssistant.schema.ts";
import {
  motorAdviceInputSchema,
  motorAdviceResponseSchema,
  motorCatalogGetInputSchema,
  motorCatalogGetResponseSchema,
  motorCatalogListInputSchema,
  motorCatalogListResponseSchema,
  motorCompareInputSchema,
  motorComparisonResponseSchema,
  motorEnergyComputeInputSchema,
  motorEnergyComputeResponseSchema,
  motorEquivalentFromMotorInputSchema,
  motorEquivalentFromSpecInputSchema,
  motorEquivalentFromSpecResponseSchema,
} from "../schemas/configurator/motor.schema.ts";
import { z } from "zod/v4";

const t = initTRPC.create();

const appRouterType = t.router({
  configurator: t.router({
    motor: t.router({
      catalog: t.router({
        list: t.procedure
          .input(motorCatalogListInputSchema)
          .output(motorCatalogListResponseSchema)
          .query(() => undefined as never),
        get: t.procedure
          .input(motorCatalogGetInputSchema)
          .output(motorCatalogGetResponseSchema)
          .query(() => undefined as never),
      }),
      equivalents: t.router({
        fromMotor: t.procedure
          .input(motorEquivalentFromMotorInputSchema)
          .output(motorEquivalentFromSpecResponseSchema)
          .query(() => undefined as never),
        fromSpec: t.procedure
          .input(motorEquivalentFromSpecInputSchema)
          .output(motorEquivalentFromSpecResponseSchema)
          .query(() => undefined as never),
      }),
      advice: t.router({
        build: t.procedure
          .input(motorAdviceInputSchema)
          .output(motorAdviceResponseSchema)
          .query(() => undefined as never),
      }),
      energy: t.router({
        compute: t.procedure
          .input(motorEnergyComputeInputSchema)
          .output(motorEnergyComputeResponseSchema)
          .query(() => undefined as never),
      }),
      compare: t.procedure
        .input(motorCompareInputSchema)
        .output(motorComparisonResponseSchema)
        .query(() => undefined as never),
    }),
  }),
  data: t.router({
    entities: t.procedure
      .input(dataEntitiesPayloadSchema)
      .output(dataEntitiesRouteResponseSchema)
      .mutation(() => undefined as never),
    "entity-contacts": t.procedure
      .input(dataEntityContactsPayloadSchema)
      .output(dataEntityContactsResponseSchema)
      .mutation(() => undefined as never),
    interactions: t.procedure
      .input(dataInteractionsPayloadSchema)
      .output(dataInteractionsResponseSchema)
      .mutation(() => undefined as never),
    config: t.procedure
      .input(dataConfigPayloadSchema)
      .output(dataConfigResponseSchema)
      .mutation(() => undefined as never),
    profile: t.procedure
      .input(dataProfilePayloadSchema)
      .output(dataProfileResponseSchema)
      .mutation(() => undefined as never),
    searchEntitiesUnified: t.procedure
      .input(tierV1SearchInputSchema)
      .output(tierV1SearchResponseSchema)
      .query(() => undefined as never),
  }),
  cockpit: t.router({
    "agency-members": t.procedure
      .input(cockpitAgencyMembersInputSchema)
      .output(cockpitAgencyMembersResponseSchema)
      .query(() => undefined as never),
    "phone-lookup": t.procedure
      .input(cockpitPhoneLookupInputSchema)
      .output(cockpitPhoneLookupResponseSchema)
      .query(() => undefined as never),
  }),
  admin: t.router({
    "users-list": t.procedure
      .input(adminUsersListInputSchema)
      .output(adminUsersListResponseSchema)
      .query(() => undefined as never),
    "audit-logs": t.procedure
      .input(adminAuditLogsInputSchema)
      .output(adminAuditLogsResponseSchema)
      .query(() => undefined as never),
    users: t.procedure
      .input(adminUsersPayloadSchema)
      .output(adminUsersResponseSchema)
      .mutation(() => undefined as never),
    agencies: t.procedure
      .input(adminAgenciesPayloadSchema)
      .output(adminAgenciesResponseSchema)
      .mutation(() => undefined as never),
  }),
  config: t.router({
    get: t.procedure
      .input(configGetInputSchema)
      .output(configGetResponseSchema)
      .query(() => undefined as never),
    usage: t.procedure
      .input(configUsageInputSchema)
      .output(configUsageResponseSchema)
      .query(() => undefined as never),
    "integrity-interactions": t.procedure
      .input(configIntegrityInteractionsInputSchema)
      .output(configIntegrityInteractionsResponseSchema)
      .query(() => undefined as never),
    "integrity-interaction-update": t.procedure
      .input(configIntegrityInteractionUpdateInputSchema)
      .output(configIntegrityInteractionUpdateResponseSchema)
      .mutation(() => undefined as never),
    reference: t.procedure
      .input(configReferenceActionInputSchema)
      .output(configReferenceActionResponseSchema)
      .mutation(() => undefined as never),
  }),
  pricing: t.router({
    references: t.router({
      imports: t.router({
        prepare: t.procedure
          .input(pricingReferenceImportsPrepareInputSchema)
          .output(pricingReferenceImportsPrepareResponseSchema)
          .mutation(() => undefined as never),
        analyze: t.procedure
          .input(pricingReferenceImportAnalyzeInputSchema)
          .output(pricingReferenceImportAnalyzeResponseSchema)
          .mutation(() => undefined as never),
        activate: t.procedure
          .input(pricingReferenceImportActivateInputSchema)
          .output(pricingReferenceImportActivateResponseSchema)
          .mutation(() => undefined as never),
        inspect: t.procedure
          .input(pricingReferenceImportInspectInputSchema)
          .output(pricingReferenceImportInspectResponseSchema)
          .mutation(() => undefined as never),
        assistMapping: t.procedure
          .input(pricingReferenceImportAssistMappingInputSchema)
          .output(pricingReferenceImportAssistMappingResponseSchema)
          .mutation(() => undefined as never),
        confirmMapping: t.procedure
          .input(pricingReferenceImportConfirmMappingInputSchema)
          .output(pricingReferenceImportConfirmMappingResponseSchema)
          .mutation(() => undefined as never),
        list: t.procedure
          .input(pricingReferenceImportsListInputSchema)
          .output(pricingReferenceImportsListResponseSchema)
          .query(() => undefined as never),
        get: t.procedure
          .input(pricingReferenceImportGetInputSchema)
          .output(pricingReferenceImportGetResponseSchema)
          .query(() => undefined as never),
      }),
      health: t.router({
        get: t.procedure
          .input(pricingReferenceHealthGetInputSchema)
          .output(pricingReferenceHealthGetResponseSchema)
          .query(() => undefined as never),
      }),
      classification: t.router({
        list: t.procedure
          .input(pricingReferenceClassificationListInputSchema)
          .output(pricingReferenceClassificationListResponseSchema)
          .query(() => undefined as never),
        listAll: t.procedure
          .input(pricingReferenceClassificationListAllInputSchema)
          .output(pricingReferenceClassificationListAllResponseSchema)
          .query(() => undefined as never),
      }),
      segments: t.router({
        list: t.procedure
          .input(pricingReferenceSegmentsListInputSchema)
          .output(pricingReferenceSegmentsListResponseSchema)
          .query(() => undefined as never),
        get: t.procedure
          .input(pricingReferenceSegmentDetailInputSchema)
          .output(pricingReferenceSegmentDetailResponseSchema)
          .query(() => undefined as never),
      }),
      anomalies: t.router({
        list: t.procedure
          .input(pricingReferenceAnomaliesListInputSchema)
          .output(pricingReferenceAnomaliesListResponseSchema)
          .query(() => undefined as never),
        summary: t.procedure
          .input(pricingReferenceAnomaliesSummaryGetInputSchema)
          .output(pricingReferenceAnomaliesSummaryResponseSchema)
          .query(() => undefined as never),
        export: t.procedure
          .input(pricingReferenceAnomaliesExportInputSchema)
          .output(pricingReferenceAnomaliesExportResponseSchema)
          .mutation(() => undefined as never),
      }),
      diffs: t.router({
        aggregate: t.procedure
          .input(pricingReferenceDiffAggregateInputSchema)
          .output(pricingReferenceDiffAggregateResponseSchema)
          .query(() => undefined as never),
        summary: t.procedure
          .input(pricingReferenceDiffsSummaryGetInputSchema)
          .output(pricingReferenceDiffsSummaryResponseSchema)
          .query(() => undefined as never),
        list: t.procedure
          .input(pricingReferenceDiffsListInputSchema)
          .output(pricingReferenceDiffsListResponseSchema)
          .query(() => undefined as never),
        compute: t.procedure
          .input(pricingReferenceDiffsComputeInputSchema)
          .output(pricingReferenceDiffsComputeResponseSchema)
          .mutation(() => undefined as never),
      }),
      diagnose: t.procedure
        .input(pricingReferenceDiagnoseInputSchema)
        .output(pricingReferenceDiagnoseResponseSchema)
        .mutation(() => undefined as never),
    }),
  }),
  ai: t.router({
    assistant: t.router({
      ask: t.procedure
        .input(aiAssistantAskInputSchema)
        .output(aiAssistantAskResponseSchema)
        .mutation(() => undefined as never),
      status: t.procedure
        .input(z.strictObject({}))
        .output(aiAssistantStatusResponseSchema)
        .query(() => undefined as never),
    }),
    access: t.router({
      list: t.procedure
        .input(aiFeatureGrantsListInputSchema)
        .output(aiFeatureGrantsListResponseSchema)
        .query(() => undefined as never),
      save: t.procedure
        .input(aiFeatureGrantSaveInputSchema)
        .output(aiFeatureGrantMutationResponseSchema)
        .mutation(() => undefined as never),
      delete: t.procedure
        .input(aiFeatureGrantDeleteInputSchema)
        .output(aiFeatureGrantMutationResponseSchema)
        .mutation(() => undefined as never),
      membersOverview: t.procedure
        .input(aiMembersAccessOverviewInputSchema)
        .output(aiMembersAccessOverviewResponseSchema)
        .query(() => undefined as never),
    }),
    settings: t.router({
      get: t.procedure
        .input(aiSettingsGetInputSchema)
        .output(aiSettingsGetResponseSchema)
        .query(() => undefined as never),
      saveProvider: t.procedure
        .input(aiSettingsSaveProviderInputSchema)
        .output(aiSettingsSaveProviderResponseSchema)
        .mutation(() => undefined as never),
      saveModel: t.procedure
        .input(aiSettingsSaveModelInputSchema)
        .output(aiSettingsSaveModelResponseSchema)
        .mutation(() => undefined as never),
      deleteModel: t.procedure
        .input(aiSettingsDeleteModelInputSchema)
        .output(aiSettingsDeleteModelResponseSchema)
        .mutation(() => undefined as never),
      createQuota: t.procedure
        .input(aiSettingsCreateQuotaInputSchema)
        .output(aiSettingsCreateQuotaResponseSchema)
        .mutation(() => undefined as never),
      saveQuota: t.procedure
        .input(aiSettingsSaveQuotaInputSchema)
        .output(aiSettingsSaveQuotaResponseSchema)
        .mutation(() => undefined as never),
      deleteQuota: t.procedure
        .input(aiSettingsDeleteQuotaInputSchema)
        .output(aiSettingsDeleteQuotaResponseSchema)
        .mutation(() => undefined as never),
      testProvider: t.procedure
        .input(aiSettingsTestProviderInputSchema)
        .output(aiSettingsTestProviderResponseSchema)
        .mutation(() => undefined as never),
    }),
    prompts: t.router({
      list: t.procedure
        .input(aiPromptsListInputSchema)
        .output(aiPromptsListResponseSchema)
        .query(() => undefined as never),
      saveDraft: t.procedure
        .input(aiPromptsSaveDraftInputSchema)
        .output(aiPromptsSaveDraftResponseSchema)
        .mutation(() => undefined as never),
      publish: t.procedure
        .input(aiPromptsPublishInputSchema)
        .output(aiPromptsPublishResponseSchema)
        .mutation(() => undefined as never),
      restore: t.procedure
        .input(aiPromptsRestoreInputSchema)
        .output(aiPromptsRestoreResponseSchema)
        .mutation(() => undefined as never),
      setArchived: t.procedure
        .input(aiPromptsSetArchivedInputSchema)
        .output(aiPromptsSetArchivedResponseSchema)
        .mutation(() => undefined as never),
      delete: t.procedure
        .input(aiPromptsDeleteInputSchema)
        .output(aiPromptsDeleteResponseSchema)
        .mutation(() => undefined as never),
    }),
    usage: t.router({
      byMember: t.procedure
        .input(aiUsageByMemberInputSchema)
        .output(aiUsageByMemberResponseSchema)
        .query(() => undefined as never),
      summary: t.procedure
        .input(aiUsageSummaryInputSchema)
        .output(aiUsageSummaryResponseSchema)
        .query(() => undefined as never),
      list: t.procedure
        .input(aiUsageListInputSchema)
        .output(aiUsageListResponseSchema)
        .query(() => undefined as never),
    }),
  }),
  directory: t.router({
    list: t.procedure
      .input(directoryListInputSchema)
      .output(directoryListResponseSchema)
      .query(() => undefined as never),
    options: t.router({
      agencies: t.procedure
        .input(directoryOptionsAgenciesInputSchema)
        .output(directoryOptionsAgenciesResponseSchema)
        .query(() => undefined as never),
      commercials: t.procedure
        .input(directoryOptionsFacetInputSchema)
        .output(directoryOptionsCommercialsResponseSchema)
        .query(() => undefined as never),
      departments: t.procedure
        .input(directoryOptionsFacetInputSchema)
        .output(directoryOptionsDepartmentsResponseSchema)
        .query(() => undefined as never),
      cities: t.procedure
        .input(directoryOptionsCitiesInputSchema)
        .output(directoryOptionsCitiesResponseSchema)
        .query(() => undefined as never),
    }),
    "city-suggestions": t.procedure
      .input(directoryCitySuggestionsInputSchema)
      .output(directoryCitySuggestionsResponseSchema)
      .query(() => undefined as never),
    "company-search": t.procedure
      .input(directoryCompanySearchInputSchema)
      .output(directoryCompanySearchResponseSchema)
      .query(() => undefined as never),
    "company-details": t.procedure
      .input(directoryCompanyDetailsInputSchema)
      .output(directoryCompanyDetailsResponseSchema)
      .query(() => undefined as never),
    duplicates: t.procedure
      .input(directoryDuplicatesInputSchema)
      .output(directoryDuplicatesResponseSchema)
      .query(() => undefined as never),
    record: t.procedure
      .input(directoryRouteRefSchema)
      .output(directoryRecordResponseSchema)
      .query(() => undefined as never),
    "saved-views": t.router({
      list: t.procedure
        .input(directorySavedViewsListInputSchema)
        .output(directorySavedViewsListResponseSchema)
        .query(() => undefined as never),
      save: t.procedure
        .input(directorySavedViewSaveInputSchema)
        .output(directorySavedViewResponseSchema)
        .mutation(() => undefined as never),
      delete: t.procedure
        .input(directorySavedViewDeleteInputSchema)
        .output(directorySavedViewDeleteResponseSchema)
        .mutation(() => undefined as never),
      "set-default": t.procedure
        .input(directorySavedViewSetDefaultInputSchema)
        .output(directorySavedViewResponseSchema)
        .mutation(() => undefined as never),
    }),
  }),
});

export type AppRouter = typeof appRouterType;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
