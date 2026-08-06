import {
  motorAdviceResponseSchema,
  motorCatalogGetResponseSchema,
  motorCatalogListResponseSchema,
  motorComparisonResponseSchema,
  motorEnergyComputeResponseSchema,
  motorEquivalentFromSpecResponseSchema,
  type MotorAdviceInput,
  type MotorAdviceResponse,
  type MotorCatalogGetInput,
  type MotorCatalogGetResponse,
  type MotorCatalogListInput,
  type MotorCatalogListResponse,
  type MotorCompareInput,
  type MotorComparisonResponse,
  type MotorEnergyComputeInput,
  type MotorEnergyComputeResponse,
  type MotorEquivalentFromMotorInput,
  type MotorEquivalentFromSpecInput,
  type MotorEquivalentFromSpecResponse
} from 'shared/schemas/configurator/motor.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { createAppError } from '@/services/errors/AppError';

/**
 * Frontiere frontend des sept routes Configurateurs moteur exposees par
 * l'Edge Function `api`. Chaque reponse est revalidee par le schema partage :
 * une reponse hors contrat devient une erreur CIR, jamais un rendu partiel.
 */

type SafeParser<TResponse> = {
  safeParse: (
    payload: unknown
  ) => { success: true; data: TResponse } | { success: false; error: { message: string } };
};

const parseConfiguratorResponse = <TResponse>(
  schema: SafeParser<TResponse>,
  payload: unknown
): TResponse => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'CONFIGURATOR_OUTPUT_INVALID',
      message: 'Réponse Configurateurs invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

export const listMotorCatalog = (
  input: MotorCatalogListInput
): Promise<MotorCatalogListResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.catalog.list.query(input, options),
    (payload) => parseConfiguratorResponse(motorCatalogListResponseSchema, payload),
    'Impossible de charger le catalogue technique moteur.'
  );

export const getMotorCatalogEntry = (
  input: MotorCatalogGetInput
): Promise<MotorCatalogGetResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.catalog.get.query(input, options),
    (payload) => parseConfiguratorResponse(motorCatalogGetResponseSchema, payload),
    'Impossible de charger la fiche technique de ce moteur.'
  );

export const findMotorEquivalentsFromMotor = (
  input: MotorEquivalentFromMotorInput
): Promise<MotorEquivalentFromSpecResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.equivalents.fromMotor.query(input, options),
    (payload) => parseConfiguratorResponse(motorEquivalentFromSpecResponseSchema, payload),
    'Impossible de rechercher les équivalents depuis ce moteur.'
  );

export const findMotorEquivalentsFromSpec = (
  input: MotorEquivalentFromSpecInput
): Promise<MotorEquivalentFromSpecResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.equivalents.fromSpec.query(input, options),
    (payload) => parseConfiguratorResponse(motorEquivalentFromSpecResponseSchema, payload),
    'Impossible de rechercher les équivalents depuis cette spécification.'
  );

export const buildMotorAdvice = (input: MotorAdviceInput): Promise<MotorAdviceResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.advice.build.query(input, options),
    (payload) => parseConfiguratorResponse(motorAdviceResponseSchema, payload),
    'Impossible de construire les conseils pour ce candidat.'
  );

export const computeMotorEnergy = (
  input: MotorEnergyComputeInput
): Promise<MotorEnergyComputeResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.energy.compute.query(input, options),
    (payload) => parseConfiguratorResponse(motorEnergyComputeResponseSchema, payload),
    'Impossible de calculer la consommation annuelle.'
  );

export const compareMotors = (input: MotorCompareInput): Promise<MotorComparisonResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.compare.query(input, options),
    (payload) => parseConfiguratorResponse(motorComparisonResponseSchema, payload),
    'Impossible de comparer ces moteurs.'
  );
