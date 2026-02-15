import { assert } from 'std/assert';
import { handleAdminAgenciesAction } from './adminAgencies.ts';

Deno.test('handleAdminAgenciesAction is exported as a function', () => {
  assert(typeof handleAdminAgenciesAction === 'function');
});
