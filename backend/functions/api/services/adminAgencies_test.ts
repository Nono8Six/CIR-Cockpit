import { assert, assertEquals, assertThrows } from 'std/assert';

import {
  handleAdminAgenciesAction,
  handleAgencyNameConflict,
  isAgencyNameConflictError
} from './adminAgencies.ts';

Deno.test('handleAdminAgenciesAction is exported as a function', () => {
  assert(typeof handleAdminAgenciesAction === 'function');
});

Deno.test('isAgencyNameConflictError detects postgres unique violations', () => {
  assertEquals(
    isAgencyNameConflictError({ code: '23505', message: 'duplicate key value violates unique constraint' }),
    true
  );
  assertEquals(
    isAgencyNameConflictError({ message: 'agencies_name_unique_idx violated' }),
    true
  );
  assertEquals(
    isAgencyNameConflictError({ message: 'other database error' }),
    false
  );
});

Deno.test('handleAgencyNameConflict maps unique violation to 409 AGENCY_NAME_EXISTS', () => {
  const error = assertThrows(() =>
    handleAgencyNameConflict({ code: '23505', message: 'duplicate key value violates unique constraint' })
  );
  assertEquals(Reflect.get(error as object, 'status'), 409);
  assertEquals(Reflect.get(error as object, 'code'), 'AGENCY_NAME_EXISTS');
});

Deno.test('handleAgencyNameConflict maps unknown db error to 400 AGENCY_UPDATE_FAILED', () => {
  const error = assertThrows(() =>
    handleAgencyNameConflict({ message: 'db unavailable' })
  );
  assertEquals(Reflect.get(error as object, 'status'), 400);
  assertEquals(Reflect.get(error as object, 'code'), 'AGENCY_UPDATE_FAILED');
});
