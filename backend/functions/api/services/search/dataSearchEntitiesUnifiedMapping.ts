import type { TierV1DirectoryRow } from '../../../../../shared/schemas/interaction/tier-v1.schema.ts';
import { normalizePhoneDigits } from '../directory/core/directoryShared.ts';

export type UnifiedEntitySearchRow = {
  id: string;
  entity_type: string;
  client_kind: string | null;
  account_type: 'term' | 'cash' | null;
  name: string;
  first_name: string | null;
  last_name: string | null;
  client_number: string | null;
  siret: string | null;
  siren: string | null;
  supplier_code: string | null;
  supplier_number: string | null;
  primary_phone: string | null;
  primary_email: string | null;
  city: string | null;
  agency_name: string | null;
  referent_name: string | null;
  updated_at: string;
  archived_at: string | null;
};

export type UnifiedProfileSearchRow = {
  id: string;
  agency_id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  agency_name: string | null;
  updated_at: string;
  archived_at: string | null;
};

export type UnifiedSupplierContactSearchRow = UnifiedEntitySearchRow & {
  contact_id: string;
  contact_first_name: string | null;
  contact_last_name: string;
  contact_position: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const normalizeNullableText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const toPersonLabel = (firstName: string | null, lastName: string | null): string | null =>
  normalizeNullableText([firstName, lastName].filter(Boolean).join(' '));

const includesQuery = (value: string | null | undefined, query: string): boolean =>
  normalizeText(value).includes(normalizeText(query));

const includesPhoneQuery = (value: string | null | undefined, query: string): boolean => {
  const queryDigits = normalizePhoneDigits(query);
  const valueDigits = normalizePhoneDigits(value);
  const queryVariants = [
    queryDigits,
    queryDigits.startsWith('0') ? `33${queryDigits.slice(1)}` : '',
    queryDigits.startsWith('33') ? `0${queryDigits.slice(2)}` : ''
  ].filter((entry) => entry.length > 0);
  return queryVariants.some((variant) => valueDigits.includes(variant));
};

export const getUnifiedEntityType = (row: UnifiedEntitySearchRow): TierV1DirectoryRow['type'] => {
  const normalizedType = normalizeText(row.entity_type);

  if (normalizedType === 'client' && row.client_kind === 'individual') {
    return 'individual';
  }
  if (normalizedType === 'client') {
    return row.account_type === 'cash' ? 'client_cash' : 'client_term';
  }
  if (normalizedType.includes('prospect') && row.client_kind === 'individual') {
    return 'prospect_individual';
  }
  if (normalizedType.includes('prospect') || normalizedType.includes('particulier')) {
    return 'prospect_company';
  }
  if (normalizedType === 'fournisseur') {
    return 'supplier';
  }
  return 'internal_cir';
};

export const matchesUnifiedEntitySearch = (row: UnifiedEntitySearchRow, query: string): boolean =>
  [
    row.name,
    row.first_name,
    row.last_name,
    row.primary_email,
    row.client_number,
    row.siret,
    row.siren,
    row.supplier_code,
    row.supplier_number,
    row.city
  ].some((value) => includesQuery(value, query)) || includesPhoneQuery(row.primary_phone, query);

export const matchesUnifiedSupplierContactSearch = (
  row: UnifiedSupplierContactSearchRow,
  query: string
): boolean =>
  [
    row.name,
    row.contact_first_name,
    row.contact_last_name,
    row.contact_position,
    row.contact_email
  ].some((value) => includesQuery(value, query)) || includesPhoneQuery(row.contact_phone, query);

export const matchesUnifiedProfileSearch = (row: UnifiedProfileSearchRow, query: string): boolean =>
  [
    row.display_name,
    row.first_name,
    row.last_name,
    row.email,
    row.agency_name
  ].some((value) => includesQuery(value, query)) || includesPhoneQuery(row.phone, query);

export const toUnifiedEntityResult = (row: UnifiedEntitySearchRow): TierV1DirectoryRow => {
  const type = getUnifiedEntityType(row);
  const personLabel = toPersonLabel(row.first_name, row.last_name);
  const isPersonType = type === 'individual' || type === 'prospect_individual' || type === 'internal_cir';
  const label = (isPersonType ? personLabel : null) ?? row.name;

  return {
    id: row.id,
    source: 'entity',
    type,
    label,
    identifier: row.client_number ?? row.supplier_code ?? row.supplier_number ?? row.siret ?? row.siren,
    phone: normalizeNullableText(row.primary_phone),
    email: normalizeNullableText(row.primary_email),
    city: normalizeNullableText(row.city),
    agency_name: normalizeNullableText(row.agency_name),
    referent_name: normalizeNullableText(row.referent_name),
    match_kind: 'entity',
    match_label: null,
    updated_at: row.updated_at,
    archived_at: row.archived_at
  };
};

export const toUnifiedSupplierContactResult = (
  row: UnifiedSupplierContactSearchRow,
  query: string
): TierV1DirectoryRow => {
  const contactLabel = toPersonLabel(row.contact_first_name, row.contact_last_name) ?? row.contact_last_name;
  const queryDigits = normalizePhoneDigits(query);
  const matchesPhone = queryDigits.length > 0 && includesPhoneQuery(row.contact_phone, query);
  const matchesEmail = includesQuery(row.contact_email, query);
  const matchKind = matchesPhone ? 'phone' : matchesEmail ? 'email' : 'contact';

  return {
    id: `contact:${row.contact_id}`,
    entity_id: row.id,
    contact_id: row.contact_id,
    source: 'entity',
    type: 'supplier',
    label: row.name,
    identifier: row.supplier_code ?? row.supplier_number ?? row.siret ?? row.siren,
    phone: normalizeNullableText(row.primary_phone),
    email: normalizeNullableText(row.primary_email),
    city: normalizeNullableText(row.city),
    agency_name: normalizeNullableText(row.agency_name),
    referent_name: normalizeNullableText(row.referent_name),
    match_kind: matchKind,
    match_label: matchKind === 'phone'
      ? normalizeNullableText(row.contact_phone)
      : matchKind === 'email'
        ? normalizeNullableText(row.contact_email)
        : contactLabel,
    updated_at: row.updated_at,
    archived_at: row.archived_at
  };
};

export const toUnifiedProfileResult = (row: UnifiedProfileSearchRow): TierV1DirectoryRow => ({
  id: `profile:${row.id}:${row.agency_id}`,
  source: 'profile',
  type: 'internal_cir',
  label: normalizeNullableText(row.display_name) ?? toPersonLabel(row.first_name, row.last_name) ?? row.email,
  identifier: null,
  phone: normalizeNullableText(row.phone),
  email: normalizeNullableText(row.email),
  city: null,
  agency_name: normalizeNullableText(row.agency_name),
  referent_name: null,
  updated_at: row.updated_at,
  archived_at: row.archived_at
});

export const sortUnifiedResults = (rows: TierV1DirectoryRow[], query: string): TierV1DirectoryRow[] => {
  const normalizedQuery = normalizeText(query);
  return [...rows].sort((left, right) => {
    const leftLabel = normalizeText(left.label);
    const rightLabel = normalizeText(right.label);
    const leftRank = leftLabel === normalizedQuery ? 0 : leftLabel.startsWith(normalizedQuery) ? 1 : 2;
    const rightRank = rightLabel === normalizedQuery ? 0 : rightLabel.startsWith(normalizedQuery) ? 1 : 2;
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (left.updated_at !== right.updated_at) return right.updated_at.localeCompare(left.updated_at);
    return left.label.localeCompare(right.label, 'fr');
  });
};
