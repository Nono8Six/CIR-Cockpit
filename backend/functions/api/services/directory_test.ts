import { assertEquals } from 'std/assert';

import type {
  DirectoryDuplicatesInput,
  DirectoryListRow
} from '../../../../shared/schemas/directory.schema.ts';
import {
  buildCompanyDuplicateReason,
  buildCompanySearchUrl,
  normalizeBooleanFlag,
  normalizeTextArray,
  rankIndividualDuplicate,
  type DirectoryDuplicateLookupRow
} from './directory.ts';

const createDirectoryListRow = (overrides: Partial<DirectoryListRow> = {}): DirectoryListRow => ({
  id: '11111111-1111-1111-1111-111111111111',
  entity_type: 'Prospect',
  client_kind: 'company',
  client_number: null,
  account_type: 'term',
  name: 'Acme',
  city: 'Paris',
  postal_code: '75001',
  department: '75',
  siret: '12345678900011',
  siren: '123456789',
  official_name: 'Acme SAS',
  agency_id: '22222222-2222-2222-2222-222222222222',
  agency_name: 'Agence Paris',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-04-19T10:00:00.000Z',
  ...overrides
});

const createDirectoryDuplicateLookupRow = (
  overrides: Partial<DirectoryDuplicateLookupRow> = {}
): DirectoryDuplicateLookupRow => ({
  ...createDirectoryListRow({
    client_kind: 'individual',
    name: 'Jane Doe'
  }),
  contact_email: 'jane@example.com',
  contact_phone: '06 12 34 56 78',
  contact_first_name: 'Jane',
  contact_last_name: 'Doe',
  ...overrides
});

Deno.test('normalizeBooleanFlag normalizes booleans, numbers and known strings', () => {
  assertEquals(normalizeBooleanFlag(true), true);
  assertEquals(normalizeBooleanFlag(false), false);
  assertEquals(normalizeBooleanFlag(1), true);
  assertEquals(normalizeBooleanFlag(0), false);
  assertEquals(normalizeBooleanFlag('oui'), true);
  assertEquals(normalizeBooleanFlag('non'), false);
  assertEquals(normalizeBooleanFlag('inconnu'), null);
});

Deno.test('normalizeTextArray trims, dedupes and drops empty entries', () => {
  assertEquals(
    normalizeTextArray(['  Alpha  ', 'Beta', 'Alpha', '', '   ']),
    ['Alpha', 'Beta']
  );
});

Deno.test('buildCompanySearchUrl includes optional filters and pagination', () => {
  const url = new URL(buildCompanySearchUrl({
    query: 'Acme',
    page: 2,
    per_page: 25,
    city: 'Paris',
    department: '75'
  }));

  assertEquals(url.searchParams.get('q'), 'Acme');
  assertEquals(url.searchParams.get('page'), '2');
  assertEquals(url.searchParams.get('per_page'), '25');
  assertEquals(url.searchParams.get('ville'), 'Paris');
  assertEquals(url.searchParams.get('departement'), '75');
});

Deno.test('buildCompanyDuplicateReason prioritizes SIRET duplicates', () => {
  const input: Extract<DirectoryDuplicatesInput, { kind: 'company' }> = {
    kind: 'company',
    agencyIds: [],
    includeArchived: true,
    siret: '12345678900011',
    siren: '123456789',
    name: 'Acme',
    city: 'Paris'
  };

  const reason = buildCompanyDuplicateReason(input, createDirectoryListRow());
  assertEquals(reason, 'SIRET deja present');
});

Deno.test('buildCompanyDuplicateReason falls back to SIREN when SIRET is absent', () => {
  const input: Extract<DirectoryDuplicatesInput, { kind: 'company' }> = {
    kind: 'company',
    agencyIds: [],
    includeArchived: true,
    siret: null,
    siren: '123456789',
    name: 'Acme',
    city: 'Paris'
  };

  const reason = buildCompanyDuplicateReason(
    input,
    createDirectoryListRow({ siret: null })
  );
  assertEquals(reason, 'SIREN deja present');
});

Deno.test('rankIndividualDuplicate gives the strongest rank to an email match', () => {
  const input: Extract<DirectoryDuplicatesInput, { kind: 'individual' }> = {
    kind: 'individual',
    agencyIds: [],
    includeArchived: true,
    first_name: 'Jane',
    last_name: 'Doe',
    postal_code: '75001',
    city: 'Paris',
    email: 'JANE@example.com',
    phone: '06 00 00 00 00'
  };

  const ranking = rankIndividualDuplicate(input, createDirectoryDuplicateLookupRow());
  assertEquals(ranking, { rank: 0, reason: 'Email deja present' });
});

Deno.test('rankIndividualDuplicate falls back to phone matching when email differs', () => {
  const input: Extract<DirectoryDuplicatesInput, { kind: 'individual' }> = {
    kind: 'individual',
    agencyIds: [],
    includeArchived: true,
    first_name: 'Jane',
    last_name: 'Doe',
    postal_code: '75001',
    city: 'Paris',
    email: 'other@example.com',
    phone: '0612345678'
  };

  const ranking = rankIndividualDuplicate(
    input,
    createDirectoryDuplicateLookupRow({ contact_email: 'different@example.com' })
  );
  assertEquals(ranking, { rank: 1, reason: 'Telephone deja present' });
});

Deno.test('rankIndividualDuplicate returns null when identity fields do not match', () => {
  const input: Extract<DirectoryDuplicatesInput, { kind: 'individual' }> = {
    kind: 'individual',
    agencyIds: [],
    includeArchived: true,
    first_name: 'Jane',
    last_name: 'Doe',
    postal_code: '75001',
    city: 'Paris',
    email: 'jane@example.com',
    phone: '0612345678'
  };

  const ranking = rankIndividualDuplicate(
    input,
    createDirectoryDuplicateLookupRow({
      contact_email: 'other@example.com',
      contact_phone: '07 99 99 99 99',
      contact_last_name: 'Smith'
    })
  );
  assertEquals(ranking, null);
});
