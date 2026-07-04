import {
  aiPromptsListResponseSchema,
  aiPromptsPublishResponseSchema,
  aiPromptsRestoreResponseSchema,
  aiPromptsSaveDraftResponseSchema,
  aiSettingsGetResponseSchema,
  aiSettingsSaveModelResponseSchema,
  aiSettingsSaveProviderResponseSchema,
  aiSettingsSaveQuotaResponseSchema,
  aiSettingsTestProviderResponseSchema,
  aiUsageListResponseSchema,
  aiUsageSummaryResponseSchema,
  type AiPromptsListInput,
  type AiPromptsPublishInput,
  type AiPromptsRestoreInput,
  type AiPromptsSaveDraftInput,
  type AiSettingsSaveProviderInput,
  type AiSettingsSaveModelInput,
  type AiSettingsSaveQuotaInput,
  type AiSettingsTestProviderInput,
  type AiUsageListInput,
  type AiUsageSummaryInput
} from '../../../shared/schemas/ai.schema';

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
      message: 'Reponse serveur IA invalide.',
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
    'Impossible de charger les parametres IA.'
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
    'Impossible de sauvegarder le modele IA.'
  );

export const saveAiQuota = (input: AiSettingsSaveQuotaInput) =>
  invokeTrpc(
    (api, options) => api.ai.settings.saveQuota.mutate(input, options),
    (payload) => parseResponse(aiSettingsSaveQuotaResponseSchema, payload),
    'Impossible de sauvegarder le quota IA.'
  );

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

export const getAiUsageSummary = (input: AiUsageSummaryInput = { days: 30 }) =>
  invokeTrpc(
    (api, options) => api.ai.usage.summary.query(input, options),
    (payload) => parseResponse(aiUsageSummaryResponseSchema, payload),
    'Impossible de charger la synthese usage IA.'
  );

export const listAiUsageEvents = (input: AiUsageListInput = { page: 1, page_size: 50 }) =>
  invokeTrpc(
    (api, options) => api.ai.usage.list.query(input, options),
    (payload) => parseResponse(aiUsageListResponseSchema, payload),
    'Impossible de charger les evenements IA.'
  );
