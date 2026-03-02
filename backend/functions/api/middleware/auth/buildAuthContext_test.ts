import { assertEquals } from 'std/assert';

import { isProfileAccessRevoked, toUniqueAgencyIds } from './buildAuthContext.ts';

Deno.test('buildAuthContext.toUniqueAgencyIds trims and deduplicates agency ids', () => {
  const values = toUniqueAgencyIds([
    { agency_id: ' agency-a ' },
    { agency_id: 'agency-a' },
    { agency_id: 'agency-b' }
  ]);

  assertEquals(values, ['agency-a', 'agency-b']);
});

Deno.test('buildAuthContext.isProfileAccessRevoked detects archived or system profiles', () => {
  assertEquals(
    isProfileAccessRevoked({ role: 'tcs', archived_at: '2026-02-16T00:00:00.000Z', is_system: false }),
    true
  );
  assertEquals(
    isProfileAccessRevoked({ role: 'tcs', archived_at: null, is_system: true }),
    true
  );
  assertEquals(
    isProfileAccessRevoked({ role: 'tcs', archived_at: null, is_system: false }),
    false
  );
});
