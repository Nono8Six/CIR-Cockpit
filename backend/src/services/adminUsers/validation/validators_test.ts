import { test } from "vitest";
import { assertEquals } from '#test/assert';

import { normalizeAgencyIds } from './validators.ts';

test('normalizeAgencyIds keeps deterministic order after deduplication', () => {
  assertEquals(
    normalizeAgencyIds([' agency-z ', 'agency-a', 'agency-z', 'agency-b']),
    ['agency-z', 'agency-a', 'agency-b']
  );
});
