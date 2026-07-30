import {
  assertEquals,
  assertStringIncludes
} from 'std/assert';

import { getErrorCatalogEntry } from '../../../../../shared/errors/catalog.ts';
import { handleError } from '../../middleware/errorHandler.ts';
import {
  configuratorMechanicalClearanceUnavailable,
  configuratorOperatingPointNotFound,
  configuratorOutputInvalid,
  configuratorRulesetUnavailable,
  configuratorSnapshotUnavailable,
  mapConfiguratorReadError
} from './configuratorErrors.ts';

type ContextLike = {
  get: (key: string) => string | undefined;
  json: (body: Record<string, unknown>, status?: number) => Response;
};

const makeContext = (): ContextLike => ({
  get: (key: string) => key === 'requestId' ? 'req-configurator-c3' : undefined,
  json: (body: Record<string, unknown>, status?: number) =>
    new Response(JSON.stringify(body), {
      status: status ?? 200,
      headers: { 'content-type': 'application/json' }
    })
});

const errorFactories = [
  configuratorSnapshotUnavailable,
  configuratorOperatingPointNotFound,
  configuratorMechanicalClearanceUnavailable,
  configuratorRulesetUnavailable,
  () => mapConfiguratorReadError(Object.assign(new Error('private SQL'), { code: 'XX000' })),
  () => mapConfiguratorReadError(Object.assign(new Error('private timeout'), { code: '57014' })),
  () => configuratorOutputInvalid(new Error('private backend output'))
];

Deno.test('all C3-2 public errors are catalogued in French', () => {
  for (const factory of errorFactories) {
    const error = factory();
    const code = String(Reflect.get(error, 'code'));
    const entry = getErrorCatalogEntry(code);

    assertEquals(entry?.code, code);
    assertEquals(entry?.message.endsWith('.'), true);
    assertStringIncludes(entry?.message ?? '', ' ');
  }
});

Deno.test('C3-2 public errors expose request_id but no SQL, stack, claims or raw diagnostics', async () => {
  const canaries = [
    'select secret from private.table',
    'Bearer private-token',
    'private-stack',
    'request.jwt.claims',
    'raw-database-value'
  ];
  const privateFailure = Object.assign(new Error(canaries.join(' | ')), {
    code: 'XX000',
    detail: canaries.join(' | ')
  });

  const response = handleError(mapConfiguratorReadError(privateFailure), makeContext()) as Response;
  const payload = await response.json() as Record<string, unknown>;
  const serialized = JSON.stringify(payload);

  assertEquals(response.status, 500);
  assertEquals(payload.code, 'CONFIGURATOR_DB_READ_FAILED');
  assertEquals(payload.request_id, 'req-configurator-c3');
  assertEquals(payload.details, undefined);
  for (const canary of canaries) {
    assertEquals(serialized.includes(canary), false);
  }
});
