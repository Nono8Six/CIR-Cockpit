import {
  aiPromptsListResponseSchema,
  aiPromptsDeleteResponseSchema,
  aiPromptsPublishResponseSchema,
  aiPromptsRestoreResponseSchema,
  aiPromptsSaveDraftResponseSchema,
  aiPromptsSetArchivedResponseSchema,
  aiSettingsGetResponseSchema,
  aiSettingsCreateQuotaResponseSchema,
  aiSettingsDeleteModelResponseSchema,
  aiSettingsDeleteQuotaResponseSchema,
  aiSettingsSaveModelResponseSchema,
  aiSettingsSaveProviderResponseSchema,
  aiSettingsSaveQuotaResponseSchema,
  aiSettingsTestProviderResponseSchema,
  aiUsageListResponseSchema,
  aiUsageSummaryResponseSchema,
  type AiPromptsListInput,
  type AiPromptsDeleteInput,
  type AiPromptsPublishInput,
  type AiPromptsRestoreInput,
  type AiPromptsSaveDraftInput,
  type AiPromptsSetArchivedInput,
  type AiSettingsSaveProviderInput,
  type AiSettingsCreateQuotaInput,
  type AiSettingsDeleteModelInput,
  type AiSettingsDeleteQuotaInput,
  type AiSettingsSaveModelInput,
  type AiSettingsSaveQuotaInput,
  type AiSettingsTestProviderInput,
  type AiUsageListInput,
  type AiUsageSummaryInput
  , aiFeatureGrantsListResponseSchema
  , aiFeatureGrantMutationResponseSchema
  , aiMembersAccessOverviewResponseSchema
  , aiUsageByMemberResponseSchema
  , type AiFeatureGrantsListInput
  , type AiFeatureGrantSaveInput
  , type AiFeatureGrantDeleteInput
  , type AiMembersAccessOverviewInput
  , type AiUsageByMemberInput
} from '../../../shared/schemas/ai.schema';
import {
  aiAssistantAskResponseSchema,
  aiAssistantStatusResponseSchema,
  type AiAssistantAskInput
} from '../../../shared/schemas/aiAssistant.schema';

import {
  invokeTrpc,
  withInvalidTrpcResponse
} from '@/services/api/invokeTrpc';

const aiInvalidResponse = {
  code: 'REQUEST_FAILED',
  message: 'Réponse serveur IA invalide.'
} as const;

export const getAiSettings = () =>
  invokeTrpc(
    (api, options) => api.ai.settings.get.query({}, options),
    withInvalidTrpcResponse(aiSettingsGetResponseSchema, aiInvalidResponse),
    'Impossible de charger les paramètres IA.'
  );

export const saveAiProvider = (input: AiSettingsSaveProviderInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.saveProvider.mutate(input, options),
    withInvalidTrpcResponse(aiSettingsSaveProviderResponseSchema, aiInvalidResponse),
    'Impossible de sauvegarder le fournisseur IA.'
  );

export const saveAiModel = (input: AiSettingsSaveModelInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.saveModel.mutate(input, options),
    withInvalidTrpcResponse(aiSettingsSaveModelResponseSchema, aiInvalidResponse),
    'Impossible de sauvegarder le modèle IA.'
  );

export const deleteAiModel = (input: AiSettingsDeleteModelInput) =>
  invokeTrpc((api, options) => api.ai.settings.deleteModel.mutate(input, options),
    withInvalidTrpcResponse(aiSettingsDeleteModelResponseSchema, aiInvalidResponse), 'Impossible de supprimer le modèle IA.');

export const createAiQuota = (input: AiSettingsCreateQuotaInput) =>
  invokeTrpc((api, options) => api.ai.settings.createQuota.mutate(input, options),
    withInvalidTrpcResponse(aiSettingsCreateQuotaResponseSchema, aiInvalidResponse), 'Impossible de créer le quota IA.');

export const saveAiQuota = (input: AiSettingsSaveQuotaInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.saveQuota.mutate(input, options),
    withInvalidTrpcResponse(aiSettingsSaveQuotaResponseSchema, aiInvalidResponse),
    'Impossible de sauvegarder le quota IA.'
  );

export const deleteAiQuota = (input: AiSettingsDeleteQuotaInput) =>
  invokeTrpc((api, options) => api.ai.settings.deleteQuota.mutate(input, options),
    withInvalidTrpcResponse(aiSettingsDeleteQuotaResponseSchema, aiInvalidResponse), 'Impossible de supprimer le quota IA.');

export const listAiAccess = (input: AiFeatureGrantsListInput = {}) =>
  invokeTrpc((api, options) => api.ai.access.list.query(input, options),
    withInvalidTrpcResponse(aiFeatureGrantsListResponseSchema, aiInvalidResponse), 'Impossible de charger les accès IA.');
export const saveAiAccess = (input: AiFeatureGrantSaveInput) =>
  invokeTrpc((api, options) => api.ai.access.save.mutate(input, options),
    withInvalidTrpcResponse(aiFeatureGrantMutationResponseSchema, aiInvalidResponse), 'Impossible de sauvegarder l accès IA.');
export const deleteAiAccess = (input: AiFeatureGrantDeleteInput) =>
  invokeTrpc((api, options) => api.ai.access.delete.mutate(input, options),
    withInvalidTrpcResponse(aiFeatureGrantMutationResponseSchema, aiInvalidResponse), 'Impossible de supprimer l accès IA.');
export const getAiMembersAccessOverview = (input: AiMembersAccessOverviewInput) =>
  invokeTrpc((api, options) => api.ai.access.membersOverview.query(input, options),
    withInvalidTrpcResponse(aiMembersAccessOverviewResponseSchema, aiInvalidResponse), 'Impossible de charger les accès membres IA.');
export const getAiUsageByMember = (input: AiUsageByMemberInput = { days: 30 }) =>
  invokeTrpc((api, options) => api.ai.usage.byMember.query(input, options),
    withInvalidTrpcResponse(aiUsageByMemberResponseSchema, aiInvalidResponse), 'Impossible de charger la consommation par membre.');

export const testAiProvider = (input: AiSettingsTestProviderInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.testProvider.mutate(input, options),
    withInvalidTrpcResponse(aiSettingsTestProviderResponseSchema, aiInvalidResponse),
    'Impossible de tester le fournisseur IA.'
  );

export const listAiPrompts = (input: AiPromptsListInput = {}) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.list.query(input, options),
    withInvalidTrpcResponse(aiPromptsListResponseSchema, aiInvalidResponse),
    'Impossible de charger les prompts IA.'
  );

export const saveAiPromptDraft = (input: AiPromptsSaveDraftInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.saveDraft.mutate(input, options),
    withInvalidTrpcResponse(aiPromptsSaveDraftResponseSchema, aiInvalidResponse),
    'Impossible de sauvegarder le brouillon de prompt IA.'
  );

export const publishAiPrompt = (input: AiPromptsPublishInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.publish.mutate(input, options),
    withInvalidTrpcResponse(aiPromptsPublishResponseSchema, aiInvalidResponse),
    'Impossible de publier le prompt IA.'
  );

export const restoreAiPrompt = (input: AiPromptsRestoreInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.restore.mutate(input, options),
    withInvalidTrpcResponse(aiPromptsRestoreResponseSchema, aiInvalidResponse),
    'Impossible de restaurer le prompt IA.'
  );

export const setAiPromptTemplateArchived = (
  input: AiPromptsSetArchivedInput,
) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.setArchived.mutate(input, options),
    withInvalidTrpcResponse(aiPromptsSetArchivedResponseSchema, aiInvalidResponse),
    'Impossible de modifier l’état du template de prompt IA.',
  );

export const deleteAiPromptTemplate = (input: AiPromptsDeleteInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.delete.mutate(input, options),
    withInvalidTrpcResponse(aiPromptsDeleteResponseSchema, aiInvalidResponse),
    'Impossible de supprimer le template de prompt IA.',
  );

export const getAiUsageSummary = (input: AiUsageSummaryInput = { days: 30 }) =>
  invokeTrpc(
    (api, options) => api.ai.usage.summary.query(input, options),
    withInvalidTrpcResponse(aiUsageSummaryResponseSchema, aiInvalidResponse),
    'Impossible de charger la synthèse usage IA.'
  );

export const listAiUsageEvents = (input: AiUsageListInput = { page: 1, page_size: 50 }) =>
  invokeTrpc(
    (api, options) => api.ai.usage.list.query(input, options),
    withInvalidTrpcResponse(aiUsageListResponseSchema, aiInvalidResponse),
    'Impossible de charger les evenements IA.'
  );

export const askAiAssistant = (input: AiAssistantAskInput) =>
  invokeTrpc(
    (api, options) => api.ai.assistant.ask.mutate(input, options),
    withInvalidTrpcResponse(aiAssistantAskResponseSchema, aiInvalidResponse),
    "Impossible d'interroger l'assistant IA."
  );

export const getAiAssistantStatus = () =>
  invokeTrpc(
    (api, options) => api.ai.assistant.status.query({}, options),
    withInvalidTrpcResponse(aiAssistantStatusResponseSchema, aiInvalidResponse),
    "Impossible de vérifier la disponibilité de l'assistant IA."
  );
