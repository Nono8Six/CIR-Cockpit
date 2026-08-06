import { describe, expectTypeOf, it } from 'vitest';

import type {
  RouterInputs,
  RouterOutputs
} from '../trpc.generated.ts';
import type {
  MotorAdviceInput,
  MotorAdviceResponse,
  MotorCatalogGetInput,
  MotorCatalogGetResponse,
  MotorCatalogListInput,
  MotorCatalogListResponse,
  MotorCompareInput,
  MotorComparisonResponse,
  MotorEnergyComputeInput,
  MotorEnergyComputeResponse,
  MotorEquivalentFromMotorInput,
  MotorEquivalentFromSpecInput,
  MotorEquivalentFromSpecResponse
} from '../../schemas/configurator/motor.schema.ts';

describe('surface tRPC Configurateurs C3-7', () => {
  it('aligne les sept contrats moteur sur les schemas partages', () => {
    type MotorInputs = RouterInputs['configurator']['motor'];
    type MotorOutputs = RouterOutputs['configurator']['motor'];

    expectTypeOf<MotorInputs['catalog']['list']>().toEqualTypeOf<MotorCatalogListInput>();
    expectTypeOf<MotorOutputs['catalog']['list']>().toEqualTypeOf<MotorCatalogListResponse>();
    expectTypeOf<MotorInputs['catalog']['get']>().toEqualTypeOf<MotorCatalogGetInput>();
    expectTypeOf<MotorOutputs['catalog']['get']>().toEqualTypeOf<MotorCatalogGetResponse>();
    expectTypeOf<MotorInputs['equivalents']['fromMotor']>()
      .toEqualTypeOf<MotorEquivalentFromMotorInput>();
    expectTypeOf<MotorOutputs['equivalents']['fromMotor']>()
      .toEqualTypeOf<MotorEquivalentFromSpecResponse>();
    expectTypeOf<MotorInputs['equivalents']['fromSpec']>()
      .toEqualTypeOf<MotorEquivalentFromSpecInput>();
    expectTypeOf<MotorOutputs['equivalents']['fromSpec']>()
      .toEqualTypeOf<MotorEquivalentFromSpecResponse>();
    expectTypeOf<MotorInputs['advice']['build']>().toEqualTypeOf<MotorAdviceInput>();
    expectTypeOf<MotorOutputs['advice']['build']>().toEqualTypeOf<MotorAdviceResponse>();
    expectTypeOf<MotorInputs['energy']['compute']>().toEqualTypeOf<MotorEnergyComputeInput>();
    expectTypeOf<MotorOutputs['energy']['compute']>().toEqualTypeOf<MotorEnergyComputeResponse>();
    expectTypeOf<MotorInputs['compare']>().toEqualTypeOf<MotorCompareInput>();
    expectTypeOf<MotorOutputs['compare']>().toEqualTypeOf<MotorComparisonResponse>();
  });
});
