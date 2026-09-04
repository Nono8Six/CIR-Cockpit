import { test } from "vitest";
import { assertEquals } from '#test/assert';

import { getErrorDetails, toUniqueAgencyIds } from './queryUsers.ts';

test('toUniqueAgencyIds trims ids and removes duplicates/nulls', () => {
  const rows = [
    { agency_id: ' agency-a ' },
    { agency_id: 'agency-a' },
    { agency_id: 'agency-b' },
    { agency_id: null }
  ];

  assertEquals(toUniqueAgencyIds(rows), ['agency-a', 'agency-b']);
});

test('getErrorDetails extracts message from Error instances', () => {
  assertEquals(getErrorDetails(new Error('db failure')), 'db failure');
  assertEquals(getErrorDetails('no error object'), undefined);
});
