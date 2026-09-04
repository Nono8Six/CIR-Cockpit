import { test } from "vitest";
import { assertEquals } from '#test/assert';

import { buildUserMetadata } from './createUser.ts';

test('buildUserMetadata includes a full_name when names are valid', () => {
  assertEquals(buildUserMetadata('Alice', 'Martin'), {
    first_name: 'Alice',
    last_name: 'Martin',
    full_name: 'Martin Alice'
  });
});

test('buildUserMetadata omits full_name when display name is empty', () => {
  assertEquals(buildUserMetadata('', ''), {
    first_name: '',
    last_name: '',
    full_name: undefined
  });
});
