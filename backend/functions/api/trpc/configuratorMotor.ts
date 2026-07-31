import {
  type MotorAdviceInput,
  motorAdviceInputSchema,
  motorAdviceResponseSchema,
  type MotorCatalogGetInput,
  motorCatalogGetInputSchema,
  motorCatalogGetResponseSchema,
  type MotorCatalogListInput,
  motorCatalogListInputSchema,
  motorCatalogListResponseSchema,
  type MotorCompareInput,
  motorCompareInputSchema,
  motorComparisonResponseSchema,
  type MotorEnergyComputeInput,
  motorEnergyComputeInputSchema,
  motorEnergyComputeResponseSchema,
  type MotorEquivalentFromMotorInput,
  motorEquivalentFromMotorInputSchema,
  type MotorEquivalentFromSpecInput,
  motorEquivalentFromSpecInputSchema,
  motorEquivalentFromSpecResponseSchema,
} from '../../../../shared/schemas/configurator/motor.schema.ts';
import { motorAdviceService } from '../services/configurator/motorAdvice.ts';
import { motorCatalogService } from '../services/configurator/motorCatalog.ts';
import { motorComparisonService } from '../services/configurator/motorCompare.ts';
import { motorEnergyService } from '../services/configurator/motorEnergy.ts';
import { motorEquivalenceService } from '../services/configurator/motorEquivalence.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { withAuthedHandler } from './procedureHelpers.ts';
import { authedProcedure, router } from './procedures.ts';

export type ConfiguratorMotorServices = {
  advice: Pick<typeof motorAdviceService, 'build'>;
  catalog: Pick<typeof motorCatalogService, 'get' | 'list'>;
  comparison: Pick<typeof motorComparisonService, 'compare'>;
  energy: Pick<typeof motorEnergyService, 'compute'>;
  equivalence: Pick<typeof motorEquivalenceService, 'fromMotor' | 'fromSpec'>;
};

const defaultServices: ConfiguratorMotorServices = {
  advice: motorAdviceService,
  catalog: motorCatalogService,
  comparison: motorComparisonService,
  energy: motorEnergyService,
  equivalence: motorEquivalenceService,
};

export const createConfiguratorMotorHandlers = (
  services: ConfiguratorMotorServices = defaultServices,
) => ({
  adviceBuild: async (
    _db: DbClient,
    _authContext: AuthContext,
    _requestId: string,
    input: MotorAdviceInput,
  ) => await services.advice.build(input),
  catalogGet: async (
    _db: DbClient,
    authContext: AuthContext,
    requestId: string,
    input: MotorCatalogGetInput,
  ) => await services.catalog.get(authContext, input, requestId),
  catalogList: async (
    _db: DbClient,
    authContext: AuthContext,
    requestId: string,
    input: MotorCatalogListInput,
  ) => await services.catalog.list(authContext, input, requestId),
  compare: async (
    _db: DbClient,
    authContext: AuthContext,
    requestId: string,
    input: MotorCompareInput,
  ) => await services.comparison.compare(authContext, input, requestId),
  energyCompute: async (
    _db: DbClient,
    authContext: AuthContext,
    requestId: string,
    input: MotorEnergyComputeInput,
  ) => await services.energy.compute(authContext, input, requestId),
  equivalentsFromMotor: async (
    _db: DbClient,
    authContext: AuthContext,
    requestId: string,
    input: MotorEquivalentFromMotorInput,
  ) => await services.equivalence.fromMotor(authContext, input, requestId),
  equivalentsFromSpec: async (
    _db: DbClient,
    authContext: AuthContext,
    requestId: string,
    input: MotorEquivalentFromSpecInput,
  ) => await services.equivalence.fromSpec(authContext, input, requestId),
});

const handlers = createConfiguratorMotorHandlers();

export const configuratorMotorRouter = router({
  catalog: router({
    list: authedProcedure
      .input(motorCatalogListInputSchema)
      .output(motorCatalogListResponseSchema)
      .query(withAuthedHandler(handlers.catalogList)),
    get: authedProcedure
      .input(motorCatalogGetInputSchema)
      .output(motorCatalogGetResponseSchema)
      .query(withAuthedHandler(handlers.catalogGet)),
  }),
  equivalents: router({
    fromMotor: authedProcedure
      .input(motorEquivalentFromMotorInputSchema)
      .output(motorEquivalentFromSpecResponseSchema)
      .query(withAuthedHandler(handlers.equivalentsFromMotor)),
    fromSpec: authedProcedure
      .input(motorEquivalentFromSpecInputSchema)
      .output(motorEquivalentFromSpecResponseSchema)
      .query(withAuthedHandler(handlers.equivalentsFromSpec)),
  }),
  advice: router({
    build: authedProcedure
      .input(motorAdviceInputSchema)
      .output(motorAdviceResponseSchema)
      .query(withAuthedHandler(handlers.adviceBuild)),
  }),
  energy: router({
    compute: authedProcedure
      .input(motorEnergyComputeInputSchema)
      .output(motorEnergyComputeResponseSchema)
      .query(withAuthedHandler(handlers.energyCompute)),
  }),
  compare: authedProcedure
    .input(motorCompareInputSchema)
    .output(motorComparisonResponseSchema)
    .query(withAuthedHandler(handlers.compare)),
});
