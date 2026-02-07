import { assertEquals, assertThrows, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  handleAdminUsersAction,
  validatePasswordPolicy,
  generateTempPassword,
  normalizeDisplayName,
  normalizeAgencyIds,
  ensurePassword
} from './adminUsers.ts';

Deno.test('handleAdminUsersAction is exported', () => {
  assert(typeof handleAdminUsersAction === 'function');
});

// --- validatePasswordPolicy ---

Deno.test('validatePasswordPolicy accepts valid password', () => {
  validatePasswordPolicy('Str0ng!pw');
});

Deno.test('validatePasswordPolicy rejects short password', () => {
  const err = assertThrows(() => validatePasswordPolicy('Ab1!'));
  assert(String(err).includes('PASSWORD_TOO_SHORT') || (err as { code?: string }).code === 'PASSWORD_TOO_SHORT');
});

Deno.test('validatePasswordPolicy rejects password without digit', () => {
  const err = assertThrows(() => validatePasswordPolicy('NoDigitHere!'));
  assert(String(err).includes('PASSWORD_REQUIRES_DIGIT') || (err as { code?: string }).code === 'PASSWORD_REQUIRES_DIGIT');
});

Deno.test('validatePasswordPolicy rejects password without symbol', () => {
  const err = assertThrows(() => validatePasswordPolicy('NoSymbol1x'));
  assert(String(err).includes('PASSWORD_REQUIRES_SYMBOL') || (err as { code?: string }).code === 'PASSWORD_REQUIRES_SYMBOL');
});

// --- generateTempPassword ---

Deno.test('generateTempPassword generates password with default length 12', () => {
  const pwd = generateTempPassword();
  assertEquals(pwd.length, 12);
});

Deno.test('generateTempPassword respects custom length', () => {
  const pwd = generateTempPassword(16);
  assertEquals(pwd.length, 16);
});

Deno.test('generateTempPassword enforces minimum length 8', () => {
  const pwd = generateTempPassword(4);
  assertEquals(pwd.length, 8);
});

Deno.test('generateTempPassword always includes digit, symbol, letter', () => {
  for (let i = 0; i < 20; i++) {
    const pwd = generateTempPassword();
    assert(/\d/.test(pwd), `Missing digit in: ${pwd}`);
    assert(/[^a-zA-Z0-9]/.test(pwd), `Missing symbol in: ${pwd}`);
    assert(/[a-zA-Z]/.test(pwd), `Missing letter in: ${pwd}`);
  }
});

Deno.test('generateTempPassword passes password policy', () => {
  for (let i = 0; i < 20; i++) {
    const pwd = generateTempPassword();
    validatePasswordPolicy(pwd);
  }
});

// --- normalizeDisplayName ---

Deno.test('normalizeDisplayName trims whitespace', () => {
  assertEquals(normalizeDisplayName('  Alice  '), 'Alice');
});

Deno.test('normalizeDisplayName returns undefined for empty string', () => {
  assertEquals(normalizeDisplayName(''), undefined);
});

Deno.test('normalizeDisplayName returns undefined for whitespace-only', () => {
  assertEquals(normalizeDisplayName('   '), undefined);
});

Deno.test('normalizeDisplayName returns undefined for undefined input', () => {
  assertEquals(normalizeDisplayName(undefined), undefined);
});

Deno.test('normalizeDisplayName preserves valid name', () => {
  assertEquals(normalizeDisplayName('Bob'), 'Bob');
});

// --- normalizeAgencyIds ---

Deno.test('normalizeAgencyIds returns empty for undefined', () => {
  assertEquals(normalizeAgencyIds(undefined), []);
});

Deno.test('normalizeAgencyIds returns empty for empty array', () => {
  assertEquals(normalizeAgencyIds([]), []);
});

Deno.test('normalizeAgencyIds trims entries', () => {
  assertEquals(normalizeAgencyIds([' abc ', ' def ']), ['abc', 'def']);
});

Deno.test('normalizeAgencyIds removes duplicates', () => {
  assertEquals(normalizeAgencyIds(['abc', 'abc', 'def']), ['abc', 'def']);
});

Deno.test('normalizeAgencyIds removes empty strings', () => {
  assertEquals(normalizeAgencyIds(['abc', '', '  ']), ['abc']);
});

// --- ensurePassword ---

Deno.test('ensurePassword generates when empty', () => {
  const result = ensurePassword('');
  assertEquals(result.generated, true);
  assert(result.password.length >= 8);
});

Deno.test('ensurePassword generates when undefined', () => {
  const result = ensurePassword(undefined);
  assertEquals(result.generated, true);
});

Deno.test('ensurePassword uses provided password', () => {
  const result = ensurePassword('Str0ng!pw');
  assertEquals(result.generated, false);
  assertEquals(result.password, 'Str0ng!pw');
});

Deno.test('ensurePassword trims provided password', () => {
  const result = ensurePassword('  Str0ng!pw  ');
  assertEquals(result.password, 'Str0ng!pw');
  assertEquals(result.generated, false);
});

Deno.test('ensurePassword rejects weak provided password', () => {
  assertThrows(() => ensurePassword('weak'));
});
