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

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { createAppError } from '@/services/errors/AppError';

const parseResponse = <TResponse>(
  schema: { safeParse: (payload: unknown) => { success: true; data: TResponse } | { success: false; error: { message: string } } },
  payload: unknown
): TResponse => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Réponse serveur IA invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

export const getAiSettings = () =>
  invokeTrpc(
    (api, options) => api.ai.settings.get.query({}, options),
    (payload) => parseResponse(aiSettingsGetResponseSchema, payload),
    'Impossible de charger les paramètres IA.'
  );

export const saveAiProvider = (input: AiSettingsSaveProviderInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.saveProvider.mutate(input, options),
    (payload) => parseResponse(aiSettingsSaveProviderResponseSchema, payload),
    'Impossible de sauvegarder le fournisseur IA.'
  );

export const saveAiModel = (input: AiSettingsSaveModelInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.saveModel.mutate(input, options),
    (payload) => parseResponse(aiSettingsSaveModelResponseSchema, payload),
    'Impossible de sauvegarder le modèle IA.'
  );

export const deleteAiModel = (input: AiSettingsDeleteModelInput) =>
  invokeTrpc((api, options) => api.ai.settings.deleteModel.mutate(input, options),
    (payload) => parseResponse(aiSettingsDeleteModelResponseSchema, payload), 'Impossible de supprimer le modèle IA.');

export const createAiQuota = (input: AiSettingsCreateQuotaInput) =>
  invokeTrpc((api, options) => api.ai.settings.createQuota.mutate(input, options),
    (payload) => parseResponse(aiSettingsCreateQuotaResponseSchema, payload), 'Impossible de créer le quota IA.');

export const saveAiQuota = (input: AiSettingsSaveQuotaInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.saveQuota.mutate(input, options),
    (payload) => parseResponse(aiSettingsSaveQuotaResponseSchema, payload),
    'Impossible de sauvegarder le quota IA.'
  );

export const deleteAiQuota = (input: AiSettingsDeleteQuotaInput) =>
  invokeTrpc((api, options) => api.ai.settings.deleteQuota.mutate(input, options),
    (payload) => parseResponse(aiSettingsDeleteQuotaResponseSchema, payload), 'Impossible de supprimer le quota IA.');

export const listAiAccess = (input: AiFeatureGrantsListInput = {}) =>
  invokeTrpc((api, options) => api.ai.access.list.query(input, options),
    (payload) => parseResponse(aiFeatureGrantsListResponseSchema, payload), 'Impossible de charger les accès IA.');
export const saveAiAccess = (input: AiFeatureGrantSaveInput) =>
  invokeTrpc((api, options) => api.ai.access.save.mutate(input, options),
    (payload) => parseResponse(aiFeatureGrantMutationResponseSchema, payload), 'Impossible de sauvegarder l accès IA.');
export const deleteAiAccess = (input: AiFeatureGrantDeleteInput) =>
  invokeTrpc((api, options) => api.ai.access.delete.mutate(input, options),
    (payload) => parseResponse(aiFeatureGrantMutationResponseSchema, payload), 'Impossible de supprimer l accès IA.');
export const getAiMembersAccessOverview = (input: AiMembersAccessOverviewInput) =>
  invokeTrpc((api, options) => api.ai.access.membersOverview.query(input, options),
    (payload) => parseResponse(aiMembersAccessOverviewResponseSchema, payload), 'Impossible de charger les accès membres IA.');
export const getAiUsageByMember = (input: AiUsageByMemberInput = { days: 30 }) =>
  invokeTrpc((api, options) => api.ai.usage.byMember.query(input, options),
    (payload) => parseResponse(aiUsageByMemberResponseSchema, payload), 'Impossible de charger la consommation par membre.');

export const testAiProvider = (input: AiSettingsTestProviderInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.testProvider.mutate(input, options),
    (payload) => parseResponse(aiSettingsTestProviderResponseSchema, payload),
    'Impossible de tester le fournisseur IA.'
  );

export const listAiPrompts = (input: AiPromptsListInput = {}) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.list.query(input, options),
    (payload) => parseResponse(aiPromptsListResponseSchema, payload),
    'Impossible de charger les prompts IA.'
  );

export const saveAiPromptDraft = (input: AiPromptsSaveDraftInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.saveDraft.mutate(input, options),
    (payload) => parseResponse(aiPromptsSaveDraftResponseSchema, payload),
    'Impossible de sauvegarder le brouillon de prompt IA.'
  );

export const publishAiPrompt = (input: AiPromptsPublishInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.publish.mutate(input, options),
    (payload) => parseResponse(aiPromptsPublishResponseSchema, payload),
    'Impossible de publier le prompt IA.'
  );

export const restoreAiPrompt = (input: AiPromptsRestoreInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.restore.mutate(input, options),
    (payload) => parseResponse(aiPromptsRestoreResponseSchema, payload),
    'Impossible de restaurer le prompt IA.'
  );

export const setAiPromptTemplateArchived = (
  input: AiPromptsSetArchivedInput,
) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.setArchived.mutate(input, options),
    (payload) => parseResponse(aiPromptsSetArchivedResponseSchema, payload),
    'Impossible de modifier l’état du template de prompt IA.',
  );

export const deleteAiPromptTemplate = (input: AiPromptsDeleteInput) =>
  invokeTrpc(
    (api, options) => api.ai.prompts.delete.mutate(input, options),
    (payload) => parseResponse(aiPromptsDeleteResponseSchema, payload),
    'Impossible de supprimer le template de prompt IA.',
  );

export const getAiUsageSummary = (input: AiUsageSummaryInput = { days: 30 }) =>
  invokeTrpc(
    (api, options) => api.ai.usage.summary.query(input, options),
    (payload) => parseResponse(aiUsageSummaryResponseSchema, payload),
    'Impossible de charger la synthèse usage IA.'
  );

export const listAiUsageEvents = (input: AiUsageListInput = { page: 1, page_size: 50 }) =>
  invokeTrpc(
    (api, options) => api.ai.usage.list.query(input, options),
    (payload) => parseResponse(aiUsageListResponseSchema, payload),
    'Impossible de charger les evenements IA.'
  );

export const askAiAssistant = (input: AiAssistantAskInput) =>
  invokeTrpc(
    (api, options) => api.ai.assistant.ask.mutate(input, options),
    (payload) => parseResponse(aiAssistantAskResponseSchema, payload),
    "Impossible d'interroger l'assistant IA."
  );

export const getAiAssistantStatus = () =>
  invokeTrpc(
    (api, options) => api.ai.assistant.status.query({}, options),
    (payload) => parseResponse(aiAssistantStatusResponseSchema, payload),
    "Impossible de vérifier la disponibilité de l'assistant IA."
  );
