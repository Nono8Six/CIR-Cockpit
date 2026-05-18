import { assertEquals, assertThrows } from 'std/assert';

import type { AuthContext } from '../types.ts';
import { resolveUnifiedSearchAgencyIds } from './dataSearchEntitiesUnified.ts';
import {
  getUnifiedEntityType,
  matchesUnifiedEntitySearch,
  matchesUnifiedProfileSearch,
  matchesUnifiedSupplierContactSearch,
  sortUnifiedResults,
  toUnifiedEntityResult,
  toUnifiedProfileResult,
  toUnifiedSupplierContactResult,
  type UnifiedEntitySearchRow,
  type UnifiedProfileSearchRow,
  type UnifiedSupplierContactSearchRow
} from './dataSearchEntitiesUnifiedMapping.ts';

const createAuthContext = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  userId: 'user-1',
  role: 'agency_admin',
  agencyIds: ['agency-1'],
  activeAgencyId: 'agency-1',
  isSuperAdmin: false,
  ...overrides
});

const readStatus = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = Reflect.get(value, 'status');
  return typeof candidate === 'number' ? candidate : undefined;
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

const entityRow = (overrides: Partial<UnifiedEntitySearchRow> = {}): UnifiedEntitySearchRow => ({
  id: 'entity-1',
  entity_type: 'Client',
  client_kind: 'company',
  account_type: 'term',
  name: 'ACME Bordeaux',
  first_name: null,
  last_name: null,
  client_number: '100012',
  siret: '12345678901234',
  siren: '123456789',
  supplier_code: null,
  supplier_number: null,
  primary_phone: '01 02 03 04 05',
  primary_email: 'contact@acme.example',
  city: 'Bordeaux',
  agency_name: 'CIR Bordeaux',
  referent_name: 'Alice Referente',
  updated_at: '2026-05-14T10:00:00.000Z',
  archived_at: null,
  ...overrides
});

const profileRow = (overrides: Partial<UnifiedProfileSearchRow> = {}): UnifiedProfileSearchRow => ({
  id: 'profile-1',
  agency_id: 'agency-1',
  email: 'interne@example.com',
  display_name: 'Claire Interne',
  first_name: 'Claire',
  last_name: 'Interne',
  phone: '+33 6 01 02 03 04',
  agency_name: 'CIR Bordeaux',
  updated_at: '2026-05-14T09:00:00.000Z',
  archived_at: null,
  ...overrides
});

const supplierContactRow = (
  overrides: Partial<UnifiedSupplierContactSearchRow> = {}
): UnifiedSupplierContactSearchRow => ({
  ...entityRow({
    id: 'supplier-1',
    entity_type: 'Fournisseur',
    name: 'SEA Aquitaine',
    supplier_code: 'SEA1',
    primary_phone: '05 58 36 96 19',
    primary_email: 'contact@sea.example'
  }),
  contact_id: 'contact-1',
  contact_first_name: 'Jeanne',
  contact_last_name: 'Martin',
  contact_position: 'ADV',
  contact_phone: '06 01 02 03 04',
  contact_email: 'jeanne.martin@sea.example',
  ...overrides
});

Deno.test('matchesUnifiedEntitySearch covers V1 entity fields and normalized phone', () => {
  const row = entityRow({
    supplier_code: 'SUP1',
    supplier_number: '445566',
    first_name: 'Jean',
    last_name: 'Martin'
  });

  assertEquals(matchesUnifiedEntitySearch(row, 'acme'), true);
  assertEquals(matchesUnifiedEntitySearch(row, 'Jean'), true);
  assertEquals(matchesUnifiedEntitySearch(row, '02.03.04'), true);
  assertEquals(matchesUnifiedEntitySearch(row, 'contact@acme'), true);
  assertEquals(matchesUnifiedEntitySearch(row, '100012'), true);
  assertEquals(matchesUnifiedEntitySearch(row, '12345678901234'), true);
  assertEquals(matchesUnifiedEntitySearch(row, 'SUP1'), true);
  assertEquals(matchesUnifiedEntitySearch(row, 'Bordeaux'), true);
  assertEquals(matchesUnifiedEntitySearch(row, 'absent'), false);
});

Deno.test('matchesUnifiedProfileSearch covers internal profile identity, email, agency and phone', () => {
  const row = profileRow();

  assertEquals(matchesUnifiedProfileSearch(row, 'claire'), true);
  assertEquals(matchesUnifiedProfileSearch(row, 'interne@example'), true);
  assertEquals(matchesUnifiedProfileSearch(row, '06 01 02'), true);
  assertEquals(matchesUnifiedProfileSearch(row, 'CIR Bordeaux'), true);
  assertEquals(matchesUnifiedProfileSearch(row, 'absent'), false);
});

Deno.test('matchesUnifiedSupplierContactSearch covers supplier contacts and labels match source', () => {
  const row = supplierContactRow();

  assertEquals(matchesUnifiedSupplierContactSearch(row, 'Jeanne'), true);
  assertEquals(matchesUnifiedSupplierContactSearch(row, '06 01 02'), true);
  assertEquals(matchesUnifiedSupplierContactSearch(row, 'jeanne.martin'), true);
  assertEquals(matchesUnifiedSupplierContactSearch(row, 'absent'), false);

  const phoneResult = toUnifiedSupplierContactResult(row, '06 01');
  assertEquals(phoneResult.id, 'contact:contact-1');
  assertEquals(phoneResult.entity_id, 'supplier-1');
  assertEquals(phoneResult.contact_id, 'contact-1');
  assertEquals(phoneResult.type, 'supplier');
  assertEquals(phoneResult.match_kind, 'phone');
  assertEquals(phoneResult.match_label, '06 01 02 03 04');

  const contactResult = toUnifiedSupplierContactResult(row, 'ADV');
  assertEquals(contactResult.match_kind, 'contact');
  assertEquals(contactResult.match_label, 'Jeanne Martin');
});

Deno.test('unified result mapping preserves source and V1 result type', () => {
  assertEquals(getUnifiedEntityType(entityRow()), 'client_term');
  assertEquals(getUnifiedEntityType(entityRow({ account_type: 'cash' })), 'client_cash');
  assertEquals(getUnifiedEntityType(entityRow({ client_kind: 'individual' })), 'individual');
  assertEquals(getUnifiedEntityType(entityRow({ entity_type: 'Prospect' })), 'prospect_company');
  assertEquals(getUnifiedEntityType(entityRow({ entity_type: 'Prospect', client_kind: 'individual' })), 'prospect_individual');
  assertEquals(getUnifiedEntityType(entityRow({ entity_type: 'Fournisseur' })), 'supplier');

  const entityResult = toUnifiedEntityResult(entityRow({ client_number: '100012' }));
  assertEquals(entityResult.source, 'entity');
  assertEquals(entityResult.type, 'client_term');
  assertEquals(entityResult.identifier, '100012');

  const profileResult = toUnifiedProfileResult(profileRow());
  assertEquals(profileResult.source, 'profile');
  assertEquals(profileResult.type, 'internal_cir');
  assertEquals(profileResult.id, 'profile:profile-1:agency-1');
});

Deno.test('sortUnifiedResults prioritizes exact and prefix matches before recency fallback', () => {
  const rows = [
    toUnifiedEntityResult(entityRow({ id: 'contains', name: 'Bordeaux ACME', updated_at: '2026-05-14T12:00:00.000Z' })),
    toUnifiedEntityResult(entityRow({ id: 'exact', name: 'ACME', updated_at: '2026-05-14T08:00:00.000Z' })),
    toUnifiedEntityResult(entityRow({ id: 'prefix', name: 'ACME Atlantique', updated_at: '2026-05-14T09:00:00.000Z' }))
  ];

  assertEquals(sortUnifiedResults(rows, 'acme').map((row) => row.id), ['exact', 'prefix', 'contains']);
});

Deno.test('resolveUnifiedSearchAgencyIds enforces agency permissions', () => {
  assertEquals(resolveUnifiedSearchAgencyIds(createAuthContext(), null), ['agency-1']);
  assertEquals(resolveUnifiedSearchAgencyIds(createAuthContext({ isSuperAdmin: true }), null), null);
  assertEquals(resolveUnifiedSearchAgencyIds(createAuthContext(), 'agency-1'), ['agency-1']);

  const error = assertThrows(() => resolveUnifiedSearchAgencyIds(createAuthContext(), 'agency-2'));
  assertEquals(readStatus(error), 403);
  assertEquals(readCode(error), 'AUTH_FORBIDDEN');
});
