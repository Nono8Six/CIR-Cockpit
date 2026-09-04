import { test } from "vitest";
import { assertEquals } from '#test/assert';

import { getErrorDetails } from './queryUsers.ts';

test('getErrorDetails extracts message from Error instances', () => {
  assertEquals(getErrorDetails(new Error('db failure')), 'db failure');
  assertEquals(getErrorDetails('no error object'), undefined);
});
