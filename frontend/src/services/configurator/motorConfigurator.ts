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

import {
  invokeTrpc,
  withInvalidTrpcResponse
} from '@/services/api/invokeTrpc';

/**
 * Frontiere frontend des sept routes Configurateurs moteur exposees par
 * l'Edge Function `api`. Chaque reponse est revalidee par le schema partage :
 * une reponse hors contrat devient une erreur CIR, jamais un rendu partiel.
 */

const configuratorInvalidResponse = {
  code: 'CONFIGURATOR_OUTPUT_INVALID',
  message: 'Réponse Configurateurs invalide.'
} as const;

export const listMotorCatalog = (
  input: MotorCatalogListInput
): Promise<MotorCatalogListResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.catalog.list.query(input, options),
    withInvalidTrpcResponse(motorCatalogListResponseSchema, configuratorInvalidResponse),
    'Impossible de charger le catalogue technique moteur.'
  );

export const getMotorCatalogEntry = (
  input: MotorCatalogGetInput
): Promise<MotorCatalogGetResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.catalog.get.query(input, options),
    withInvalidTrpcResponse(motorCatalogGetResponseSchema, configuratorInvalidResponse),
    'Impossible de charger la fiche technique de ce moteur.'
  );

export const findMotorEquivalentsFromMotor = (
  input: MotorEquivalentFromMotorInput
): Promise<MotorEquivalentFromSpecResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.equivalents.fromMotor.query(input, options),
    withInvalidTrpcResponse(motorEquivalentFromSpecResponseSchema, configuratorInvalidResponse),
    'Impossible de rechercher les équivalents depuis ce moteur.'
  );

export const findMotorEquivalentsFromSpec = (
  input: MotorEquivalentFromSpecInput
): Promise<MotorEquivalentFromSpecResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.equivalents.fromSpec.query(input, options),
    withInvalidTrpcResponse(motorEquivalentFromSpecResponseSchema, configuratorInvalidResponse),
    'Impossible de rechercher les équivalents depuis cette spécification.'
  );

export const buildMotorAdvice = (input: MotorAdviceInput): Promise<MotorAdviceResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.advice.build.query(input, options),
    withInvalidTrpcResponse(motorAdviceResponseSchema, configuratorInvalidResponse),
    'Impossible de construire les conseils pour ce candidat.'
  );

export const computeMotorEnergy = (
  input: MotorEnergyComputeInput
): Promise<MotorEnergyComputeResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.energy.compute.query(input, options),
    withInvalidTrpcResponse(motorEnergyComputeResponseSchema, configuratorInvalidResponse),
    'Impossible de calculer la consommation annuelle.'
  );

export const compareMotors = (input: MotorCompareInput): Promise<MotorComparisonResponse> =>
  invokeTrpc(
    (api, options) => api.configurator.motor.compare.query(input, options),
    withInvalidTrpcResponse(motorComparisonResponseSchema, configuratorInvalidResponse),
    'Impossible de comparer ces moteurs.'
  );
