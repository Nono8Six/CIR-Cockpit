import type { FieldErrors, FieldNamesMarkedBoolean } from 'react-hook-form';

import type { DirectoryRecord } from '../../../../../shared/schemas/system/directory.schema';
import type { OfficialDataResyncField } from '../../../../../shared/schemas/system/data.schema';
import type { EntityContact } from '@/types';

import type { EntityEditFormValues } from './entityEditPanel.schema';

export const NO_PRIMARY_CONTACT_VALUE = '__no_primary_contact__';
export const OFFICIAL_SOURCE = 'api-recherche-entreprises';

export type OfficialResyncReviewField = OfficialDataResyncField;

export type OfficialResyncDiff = {
  field: OfficialResyncReviewField;
  label: string;
  currentValue: string;
  officialValue: string;
};

export type OfficialResyncIdentityBase = {
  siren: string;
  label: string;
};

const FIELD_LABELS: Partial<Record<keyof EntityEditFormValues, string>> = {
  client_number: 'Numéro client',
  supplier_code: 'Code fournisseur',
  supplier_number: 'Numéro fournisseur',
  primary_phone: 'Téléphone principal',
  primary_email: 'Email principal',
  account_type: 'Compte',
  name: 'Nom',
  address: 'Adresse',
  postal_code: 'Code postal',
  department: 'Département',
  city: 'Ville',
  agency_id: 'Agence',
  cir_commercial_id: 'Commercial CIR',
  primary_contact_id: 'Contact principal',
  siret: 'SIRET',
  siren: 'SIREN',
  naf_code: 'Code NAF',
  official_name: 'Nom officiel',
  notes: 'Notes',
  contact_first_name: 'Prénom du contact',
  contact_last_name: 'Nom du contact',
  contact_email: 'Email du contact',
  contact_phone: 'Téléphone du contact',
  contact_position: 'Fonction du contact',
  contact_service_label: 'Service du contact',
  contact_notes: 'Notes du contact'
};

const ERROR_LABELS: Partial<Record<keyof EntityEditFormValues | 'root', string>> = {
  ...FIELD_LABELS,
  root: 'Sauvegarde'
};

const OFFICIAL_RESYNC_FIELD_LABELS: Record<OfficialResyncReviewField, string> = {
  siret: 'SIRET',
  siren: 'SIREN',
  naf_code: 'Code NAF',
  official_name: 'Nom officiel',
  official_data_source: 'Source officielle',
  official_data_synced_at: 'Date de synchronisation',
  address: 'Adresse',
  postal_code: 'Code postal',
  department: 'Département',
  city: 'Ville'
};

const DISPLAY_EMPTY_VALUE = 'Non renseigné';

export const ENTITY_EDIT_FIELD_ORDER: Array<keyof EntityEditFormValues> = [
  'client_number',
  'supplier_code',
  'supplier_number',
  'primary_phone',
  'primary_email',
  'account_type',
  'name',
  'address',
  'postal_code',
  'department',
  'city',
  'agency_id',
  'cir_commercial_id',
  'primary_contact_id',
  'contact_first_name',
  'contact_last_name',
  'contact_phone',
  'contact_email',
  'contact_position',
  'contact_service_label',
  'siret',
  'siren',
  'naf_code',
  'official_name',
  'notes',
  'contact_notes'
];

const isEntityEditField = (field: string): field is keyof EntityEditFormValues =>
  field in FIELD_LABELS;

export const normalizeText = (value: string | null | undefined): string =>
  value?.trim() ?? '';

export const nullableText = (value: string | null | undefined): string | null => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};

export const optionalText = (value: string | null | undefined): string | undefined => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : undefined;
};

export const normalizeIdentifierDigits = (value: string | null | undefined): string =>
  normalizeText(value).replace(/\D/g, '');

export const getOfficialResyncIdentityBase = (record: DirectoryRecord): OfficialResyncIdentityBase | null => {
  const siren = normalizeIdentifierDigits(record.siren);
  if (siren.length === 9) {
    return {
      siren,
      label: `SIREN ${siren}`
    };
  }

  const siret = normalizeIdentifierDigits(record.siret);
  if (siret.length === 14) {
    return {
      siren: siret.slice(0, 9),
      label: `SIREN ${siret.slice(0, 9)} extrait du SIRET ${siret}`
    };
  }

  return null;
};

const normalizeComparableValue = (value: string | null | undefined): string =>
  normalizeText(value);

const formatDiffValue = (value: string | null | undefined): string =>
  normalizeComparableValue(value) || DISPLAY_EMPTY_VALUE;

export const buildOfficialResyncDiffs = (
  currentValues: Pick<EntityEditFormValues, OfficialResyncReviewField>,
  officialValues: Partial<Record<OfficialResyncReviewField, string | null>>,
): OfficialResyncDiff[] =>
  Object.entries(officialValues).flatMap(([field, officialValue]) => {
    const typedField = field as OfficialResyncReviewField;
    const currentValue = normalizeComparableValue(currentValues[typedField]);
    const nextValue = normalizeComparableValue(officialValue);

    if (currentValue === nextValue) {
      return [];
    }

    return [{
      field: typedField,
      label: OFFICIAL_RESYNC_FIELD_LABELS[typedField],
      currentValue: formatDiffValue(currentValues[typedField]),
      officialValue: formatDiffValue(officialValue)
    }];
  });

export const buildManualOfficialSearchQuery = (
  values: Pick<EntityEditFormValues, 'name' | 'address' | 'postal_code' | 'city'>,
): string =>
  [values.name, values.address, values.postal_code, values.city]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
    .slice(0, 120);

export const buildPersistedOfficialIdentityValues = (
  record: Pick<DirectoryRecord, 'siret' | 'siren'>,
  values: Pick<EntityEditFormValues, OfficialResyncReviewField>,
): Pick<EntityEditFormValues, OfficialResyncReviewField> => ({
  ...values,
  siret: normalizeText(record.siret),
  siren: normalizeText(record.siren)
});

export const getEntityEditMode = (record: DirectoryRecord): EntityEditFormValues['mode'] =>
  record.entity_type === 'Fournisseur'
    ? 'supplier'
    : record.entity_type.toLocaleLowerCase('fr').includes('prospect') ? 'prospect' : 'client';

export const getExplicitPrimaryContact = (contacts: EntityContact[]): EntityContact | null =>
  contacts.find((contact) => contact.is_primary && !contact.archived_at) ?? null;

export const isOfficialDataLocked = (record: DirectoryRecord): boolean =>
  Boolean(record.official_data_source || record.official_data_synced_at);

export const getContactLabel = (contact: EntityContact): string => {
  const name = [contact.first_name, contact.last_name]
    .map((entry) => entry?.trim())
    .filter(Boolean)
    .join(' ');
  const role = contact.service_label?.trim() || contact.position?.trim() || contact.email?.trim() || contact.phone?.trim();
  return role ? `${name || 'Contact'} - ${role}` : name || 'Contact sans nom';
};

export const buildEntityEditDefaultValues = (
  record: DirectoryRecord,
  contacts: EntityContact[],
): EntityEditFormValues => {
  const mode = getEntityEditMode(record);
  const primaryContact = getExplicitPrimaryContact(contacts);

  return {
    mode,
    client_kind: record.client_kind,
    client_number: normalizeText(record.client_number),
    supplier_code: normalizeText(record.supplier_code),
    supplier_number: normalizeText(record.supplier_number),
    primary_phone: normalizeText(record.primary_phone),
    primary_email: normalizeText(record.primary_email),
    account_type: record.account_type ?? 'cash',
    name: normalizeText(record.name),
    address: normalizeText(record.address),
    postal_code: normalizeText(record.postal_code),
    department: normalizeText(record.department),
    city: normalizeText(record.city),
    agency_id: normalizeText(record.agency_id),
    cir_commercial_id: record.cir_commercial_id,
    primary_contact_id: primaryContact?.id ?? null,
    siret: normalizeText(record.siret),
    siren: normalizeText(record.siren),
    naf_code: normalizeText(record.naf_code),
    official_name: normalizeText(record.official_name),
    official_data_source: record.official_data_source ?? null,
    official_data_synced_at: normalizeText(record.official_data_synced_at),
    notes: normalizeText(record.notes),
    contact_first_name: normalizeText(primaryContact?.first_name),
    contact_last_name: normalizeText(primaryContact?.last_name),
    contact_email: normalizeText(primaryContact?.email),
    contact_phone: normalizeText(primaryContact?.phone),
    contact_position: normalizeText(primaryContact?.position),
    contact_service_label: normalizeText(primaryContact?.service_label),
    contact_notes: normalizeText(primaryContact?.notes)
  };
};

export const getDirtyFieldLabels = (
  dirtyFields: FieldNamesMarkedBoolean<EntityEditFormValues>,
): string[] =>
  Object.entries(dirtyFields)
    .filter(([, isDirty]) => Boolean(isDirty))
    .map(([field]) => isEntityEditField(field) ? FIELD_LABELS[field] : null)
    .filter((label): label is string => Boolean(label));

export const getChangedFieldLabels = (
  values: EntityEditFormValues,
  defaultValues: EntityEditFormValues,
): string[] =>
  ENTITY_EDIT_FIELD_ORDER
    .filter((field) => values[field] !== defaultValues[field])
    .map((field) => FIELD_LABELS[field])
    .filter((label): label is string => Boolean(label));

export const getErrorLabels = (errors: FieldErrors<EntityEditFormValues>): string[] =>
  Object.keys(errors)
    .map((field) => {
      if (field === 'root') return ERROR_LABELS.root;
      return isEntityEditField(field) ? ERROR_LABELS[field] : null;
    })
    .filter((label): label is string => Boolean(label));
