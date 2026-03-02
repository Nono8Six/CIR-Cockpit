import { assertEquals } from 'std/assert';

import { normalizeAgencyIds } from './validators.ts';

Deno.test('normalizeAgencyIds keeps deterministic order after deduplication', () => {
  assertEquals(
    normalizeAgencyIds([' agency-z ', 'agency-a', 'agency-z', 'agency-b']),
    ['agency-z', 'agency-a', 'agency-b']
  );
});
