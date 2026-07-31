import { TRPCError } from '@trpc/server';
import { assert, assertEquals, assertStrictEquals } from 'std/assert';

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
} from '../../../../shared/schemas/configurator/motor.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { type ConfiguratorMotorServices, createConfiguratorMotorHandlers } from './configuratorMotor.ts';
import { formatPublicTrpcErrorData } from './procedures.ts';
import { appRouter } from './router.ts';

const procedureContracts = [
  {
    path: 'configurator.motor.catalog.list',
    input: motorCatalogListInputSchema,
    output: motorCatalogListResponseSchema,
  },
  {
    path: 'configurator.motor.catalog.get',
    input: motorCatalogGetInputSchema,
    output: motorCatalogGetResponseSchema,
  },
  {
    path: 'configurator.motor.equivalents.fromMotor',
    input: motorEquivalentFromMotorInputSchema,
    output: motorEquivalentFromSpecResponseSchema,
  },
  {
    path: 'configurator.motor.equivalents.fromSpec',
    input: motorEquivalentFromSpecInputSchema,
    output: motorEquivalentFromSpecResponseSchema,
  },
  {
    path: 'configurator.motor.advice.build',
    input: motorAdviceInputSchema,
    output: motorAdviceResponseSchema,
  },
  {
    path: 'configurator.motor.energy.compute',
    input: motorEnergyComputeInputSchema,
    output: motorEnergyComputeResponseSchema,
  },
  {
    path: 'configurator.motor.compare',
    input: motorCompareInputSchema,
    output: motorComparisonResponseSchema,
  },
] as const;

type RuntimeProcedure = {
  _def: {
    inputs: unknown[];
    output?: unknown;
    type: string;
  };
};

Deno.test('C3-7 exposes seven query procedures with the shared schemas', () => {
  const procedures = (
    appRouter as unknown as {
      _def: { procedures: Record<string, RuntimeProcedure> };
    }
  )._def.procedures;
  const configuratorPaths = Object.keys(procedures)
    .filter((path) => path.startsWith('configurator.motor.'))
    .sort();

  assertEquals(
    configuratorPaths,
    procedureContracts.map(({ path }) => path).sort(),
  );
  for (const contract of procedureContracts) {
    const procedure = procedures[contract.path];
    assert(procedure);
    assertEquals(procedure._def.type, 'query');
    assertStrictEquals(procedure._def.inputs[0], contract.input);
    assertStrictEquals(procedure._def.output, contract.output);
  }
});

Deno.test('C3-7 maps invalid input to a stable CIR error with French details', () => {
  const parsed = motorCompareInputSchema.safeParse({
    operating_point_ids: ['1'],
  });
  assertEquals(parsed.success, false);
  if (parsed.success) return;

  const data = formatPublicTrpcErrorData(
    new TRPCError({
      code: 'BAD_REQUEST',
      cause: parsed.error,
    }),
    'request-input',
    'configurator.motor.compare',
  );

  assertEquals(data.appCode, 'INVALID_PAYLOAD');
  assertEquals(data.httpStatus, 400);
  assertEquals(data.requestId, 'request-input');
  assert(data.details?.includes('Au moins deux moteurs'));
});

Deno.test('C3-7 maps invalid output to CONFIGURATOR_OUTPUT_INVALID', () => {
  const parsed = motorComparisonResponseSchema.safeParse({});
  assertEquals(parsed.success, false);
  if (parsed.success) return;

  const data = formatPublicTrpcErrorData(
    new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      cause: parsed.error,
    }),
    'request-output',
    'configurator.motor.compare',
  );

  assertEquals(data.appCode, 'CONFIGURATOR_OUTPUT_INVALID');
  assertEquals(data.httpStatus, 500);
  assertEquals(data.requestId, 'request-output');
  assertEquals(data.details, undefined);
});

Deno.test('C3-7 handlers delegate every route to the matching C3 service', async () => {
  const calls: Array<{
    name: string;
    authContext?: AuthContext;
    input: unknown;
    requestId?: string;
  }> = [];
  const record = (
    name: string,
    authContext: AuthContext | undefined,
    input: unknown,
    requestId: string | undefined,
  ) => {
    calls.push({ name, authContext, input, requestId });
    return { name };
  };
  const services = {
    advice: {
      build: (input: unknown) => record('advice.build', undefined, input, undefined),
    },
    catalog: {
      get: (authContext: AuthContext, input: unknown, requestId: string) =>
        Promise.resolve(record('catalog.get', authContext, input, requestId)),
      list: (authContext: AuthContext, input: unknown, requestId: string) =>
        Promise.resolve(record('catalog.list', authContext, input, requestId)),
    },
    comparison: {
      compare: (authContext: AuthContext, input: unknown, requestId: string) =>
        Promise.resolve(record('compare', authContext, input, requestId)),
    },
    energy: {
      compute: (authContext: AuthContext, input: unknown, requestId: string) =>
        Promise.resolve(
          record('energy.compute', authContext, input, requestId),
        ),
    },
    equivalence: {
      fromMotor: (
        authContext: AuthContext,
        input: unknown,
        requestId: string,
      ) =>
        Promise.resolve(
          record('equivalents.fromMotor', authContext, input, requestId),
        ),
      fromSpec: (
        authContext: AuthContext,
        input: unknown,
        requestId: string,
      ) =>
        Promise.resolve(
          record('equivalents.fromSpec', authContext, input, requestId),
        ),
    },
  } as unknown as ConfiguratorMotorServices;
  const handlers = createConfiguratorMotorHandlers(services);
  const db = {} as DbClient;
  const authContext: AuthContext = {
    userId: '11111111-1111-4111-8111-111111111111',
    role: 'tcs',
    agencyIds: [],
    activeAgencyId: null,
    isSuperAdmin: false,
  };
  const inputs = procedureContracts.map(({ path }) => ({ path }));

  await handlers.catalogList(db, authContext, 'request-1', inputs[0] as never);
  await handlers.catalogGet(db, authContext, 'request-2', inputs[1] as never);
  await handlers.equivalentsFromMotor(
    db,
    authContext,
    'request-3',
    inputs[2] as never,
  );
  await handlers.equivalentsFromSpec(
    db,
    authContext,
    'request-4',
    inputs[3] as never,
  );
  await handlers.adviceBuild(
    db,
    authContext,
    'request-5',
    inputs[4] as never,
  );
  await handlers.energyCompute(
    db,
    authContext,
    'request-6',
    inputs[5] as never,
  );
  await handlers.compare(db, authContext, 'request-7', inputs[6] as never);

  assertEquals(
    calls.map(({ name }) => name),
    [
      'catalog.list',
      'catalog.get',
      'equivalents.fromMotor',
      'equivalents.fromSpec',
      'advice.build',
      'energy.compute',
      'compare',
    ],
  );
  for (const [index, call] of calls.entries()) {
    assertStrictEquals(call.input, inputs[index]);
    if (call.name === 'advice.build') {
      assertEquals(call.authContext, undefined);
      assertEquals(call.requestId, undefined);
    } else {
      assertStrictEquals(call.authContext, authContext);
      assertEquals(call.requestId, `request-${index + 1}`);
    }
  }
});
