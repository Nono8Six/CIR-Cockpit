import { assertEquals } from 'std/assert';

import { buildUserMetadata } from './createUser.ts';

Deno.test('buildUserMetadata includes a full_name when names are valid', () => {
  assertEquals(buildUserMetadata('Alice', 'Martin'), {
    first_name: 'Alice',
    last_name: 'Martin',
    full_name: 'Martin Alice'
  });
});

Deno.test('buildUserMetadata omits full_name when display name is empty', () => {
  assertEquals(buildUserMetadata('', ''), {
    first_name: '',
    last_name: '',
    full_name: undefined
  });
});
