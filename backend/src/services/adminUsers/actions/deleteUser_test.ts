import { test } from "vitest";
import { assertEquals } from '#test/assert';

import { buildAgencySystemEmail, buildOrphanSystemEmail } from './deleteUser.ts';

test('buildAgencySystemEmail normalizes agency id and appends domain', () => {
  assertEquals(
    buildAgencySystemEmail('123e4567-e89b-12d3-a456-426614174000'),
    'system+agency-123e4567e89b12d3a456426614174000@cir.invalid'
  );
});

test('buildOrphanSystemEmail returns the orphan system address', () => {
  assertEquals(buildOrphanSystemEmail(), 'system+orphan@cir.invalid');
});
