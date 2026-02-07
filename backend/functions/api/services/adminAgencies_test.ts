import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleAdminAgenciesAction } from './adminAgencies.ts';

Deno.test('handleAdminAgenciesAction is exported as a function', () => {
  assert(typeof handleAdminAgenciesAction === 'function');
});
