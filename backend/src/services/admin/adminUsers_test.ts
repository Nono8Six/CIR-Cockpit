import { test } from "vitest";
import { assert, assertEquals, assertThrows } from '#test/assert';

import { listAdminAuditLogs, listAdminUsers } from './adminQueries.ts';
import { handleAdminUsersAction } from './adminUsers.ts';
import {
  buildDisplayName,
  ensurePassword,
  generateTempPassword,
  normalizeAgencyIds,
  normalizePersonName,
  validatePasswordPolicy
} from '../adminUsers/validation/validators.ts';

test('handleAdminUsersAction is exported', () => {
  assert(typeof handleAdminUsersAction === 'function');
});

test('admin query handlers are exported', () => {
  assert(typeof listAdminUsers === 'function');
  assert(typeof listAdminAuditLogs === 'function');
});

test('validatePasswordPolicy accepts valid password', () => {
  validatePasswordPolicy('Str0ng!pw');
});

test('validatePasswordPolicy rejects short password', () => {
  const err = assertThrows(() => validatePasswordPolicy('Ab1!'));
  assert(String(err).includes('PASSWORD_TOO_SHORT') || (err as { code?: string }).code === 'PASSWORD_TOO_SHORT');
});

test('validatePasswordPolicy rejects password without digit', () => {
  const err = assertThrows(() => validatePasswordPolicy('NoDigitHere!'));
  assert(String(err).includes('PASSWORD_REQUIRES_DIGIT') || (err as { code?: string }).code === 'PASSWORD_REQUIRES_DIGIT');
});

test('validatePasswordPolicy rejects password without symbol', () => {
  const err = assertThrows(() => validatePasswordPolicy('NoSymbol1x'));
  assert(String(err).includes('PASSWORD_REQUIRES_SYMBOL') || (err as { code?: string }).code === 'PASSWORD_REQUIRES_SYMBOL');
});

test('generateTempPassword generates password with default length 12', () => {
  const password = generateTempPassword();
  assertEquals(password.length, 12);
});

test('generateTempPassword respects custom length', () => {
  const password = generateTempPassword(16);
  assertEquals(password.length, 16);
});

test('generateTempPassword enforces minimum length 8', () => {
  const password = generateTempPassword(4);
  assertEquals(password.length, 8);
});

test('generateTempPassword always includes digit, symbol, letter', () => {
  for (let index = 0; index < 20; index += 1) {
    const password = generateTempPassword();
    assert(/\d/.test(password), `Missing digit in: ${password}`);
    assert(/[^a-zA-Z0-9]/.test(password), `Missing symbol in: ${password}`);
    assert(/[a-zA-Z]/.test(password), `Missing letter in: ${password}`);
  }
});

test('normalizePersonName trims whitespace', () => {
  assertEquals(normalizePersonName('  Alice  '), 'Alice');
});

test('normalizePersonName returns undefined for empty values', () => {
  assertEquals(normalizePersonName(''), undefined);
  assertEquals(normalizePersonName('   '), undefined);
  assertEquals(normalizePersonName(undefined), undefined);
});

test('buildDisplayName joins names and handles empty input', () => {
  assertEquals(buildDisplayName('FERRON', 'Arnaud'), 'FERRON Arnaud');
  assertEquals(buildDisplayName('  ', ''), undefined);
});

test('normalizeAgencyIds trims entries and removes duplicates', () => {
  assertEquals(normalizeAgencyIds(undefined), []);
  assertEquals(normalizeAgencyIds([' abc ', 'abc', 'def', '', '  ']), ['abc', 'def']);
});

test('ensurePassword generates when raw password is missing', () => {
  const generated = ensurePassword('');
  assertEquals(generated.generated, true);
  assert(generated.password.length >= 8);
});

test('ensurePassword uses provided password', () => {
  const provided = ensurePassword('  Str0ng!pw  ');
  assertEquals(provided.generated, false);
  assertEquals(provided.password, 'Str0ng!pw');
});

test('ensurePassword rejects weak passwords', () => {
  assertThrows(() => ensurePassword('weak'));
});
