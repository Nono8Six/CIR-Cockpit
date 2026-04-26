import type { DirectoryListRow } from "../../../../shared/schemas/directory.schema.ts";
import { sql } from "drizzle-orm";

import {
  agencies,
  entities,
  entity_contacts,
} from "../../../drizzle/schema.ts";
import {
  commercialDisplayNameSql,
  normalizeClientKind,
} from "./directoryShared.ts";

export type DirectoryDuplicateLookupRow = DirectoryListRow & {
  contact_email: string | null;
  contact_phone: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
};

export const duplicateCompanySelect = {
  id: entities.id,
  entity_type: entities.entity_type,
  client_kind: entities.client_kind,
  client_number: entities.client_number,
  account_type: entities.account_type,
  name: entities.name,
  city: entities.city,
  postal_code: entities.postal_code,
  department: entities.department,
  siret: entities.siret,
  siren: entities.siren,
  official_name: entities.official_name,
  agency_id: entities.agency_id,
  agency_name: agencies.name,
  cir_commercial_id: entities.cir_commercial_id,
  cir_commercial_name: commercialDisplayNameSql,
  archived_at: entities.archived_at,
  updated_at: entities.updated_at,
  contact_email: sql<string | null>`null`,
  contact_phone: sql<string | null>`null`,
  contact_first_name: sql<string | null>`null`,
  contact_last_name: sql<string | null>`null`,
};

export const duplicateIndividualSelect = {
  ...duplicateCompanySelect,
  contact_email: entity_contacts.email,
  contact_phone: entity_contacts.phone,
  contact_first_name: entity_contacts.first_name,
  contact_last_name: entity_contacts.last_name,
};

export const toDirectoryDuplicateRecord = (
  row: DirectoryDuplicateLookupRow,
): DirectoryListRow => ({
  id: row.id,
  entity_type: row.entity_type,
  client_kind: normalizeClientKind(row.client_kind),
  client_number: row.client_number,
  account_type: row.account_type,
  name: row.name,
  city: row.city,
  postal_code: row.postal_code,
  department: row.department,
  siret: row.siret,
  siren: row.siren,
  official_name: row.official_name,
  agency_id: row.agency_id,
  agency_name: row.agency_name,
  cir_commercial_id: row.cir_commercial_id,
  cir_commercial_name: row.cir_commercial_name,
  archived_at: row.archived_at,
  updated_at: row.updated_at,
});
