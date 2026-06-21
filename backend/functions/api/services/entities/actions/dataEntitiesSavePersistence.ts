import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { entities, entity_contacts } from '../../../../../drizzle/schema.ts';
import { httpError } from '../../../middleware/errorHandler.ts';
import type { DbClient } from '../../../types.ts';
import {
  type EntityContactInsert,
  type EntityInsert,
  type EntityRow,
  type EntityUpdate,
  extractDbErrorDetails,
  type SaveOfficialDataResyncPayload,
} from '../core/dataEntitiesShared.ts';

type EntityPersistenceDb = Pick<DbClient, "insert" | "select" | "update">;

type PersistEntityRowOptions = {
  officialDataResync?: SaveOfficialDataResyncPayload;
};

const OFFICIAL_RESYNC_FIELDS = [
  "siret",
  "siren",
  "naf_code",
  "official_name",
  "official_data_source",
  "official_data_synced_at",
  "address",
  "postal_code",
  "department",
  "city",
] as const satisfies ReadonlyArray<SaveOfficialDataResyncPayload["selected_fields"][number]>;

type OfficialResyncField = typeof OFFICIAL_RESYNC_FIELDS[number];
type CurrentOfficialRow = Pick<EntityRow, OfficialResyncField>;

const isDbWriteFailed = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  Reflect.get(error, "code") === "DB_WRITE_FAILED";

const isExpectedPersistenceError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = Reflect.get(error, "code");
  return code === "DB_WRITE_FAILED" || code === "CONFLICT" || code === "VALIDATION_ERROR";
};

const normalizeIdentifierDigits = (value: string | null | undefined): string =>
  value?.replace(/\D/g, "") ?? "";

const getCurrentBaseSiren = (row: CurrentOfficialRow): string => {
  const siren = normalizeIdentifierDigits(row.siren);
  if (siren.length === 9) {
    return siren;
  }

  const siret = normalizeIdentifierDigits(row.siret);
  return siret.length === 14 ? siret.slice(0, 9) : "";
};

const assertOfficialResyncIdentity = (
  currentRow: CurrentOfficialRow,
  officialDataResync: SaveOfficialDataResyncPayload,
): void => {
  const currentBaseSiren = getCurrentBaseSiren(currentRow);

  if (officialDataResync.identity_mode === "persisted_identifier") {
    if (!currentBaseSiren || currentBaseSiren !== officialDataResync.base_siren) {
      throw httpError(
        409,
        "CONFLICT",
        "La resynchronisation officielle ne correspond pas au SIREN actuellement en base.",
      );
    }
    return;
  }

  if (currentBaseSiren) {
    throw httpError(
      409,
      "CONFLICT",
      "Cette fiche possede deja un SIREN ou SIRET sauvegarde. Utilisez la resynchronisation basee sur l'identifiant existant.",
    );
  }

  if (!officialDataResync.selected_fields.includes("siren")) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "Le rattachement officiel manuel doit enregistrer le SIREN.",
    );
  }
};

const resolveOfficialUpdateRow = (
  updateRow: EntityUpdate,
  currentRow: CurrentOfficialRow | undefined,
  options: PersistEntityRowOptions,
): EntityUpdate => {
  if (!currentRow) {
    return updateRow;
  }

  if (options.officialDataResync) {
    assertOfficialResyncIdentity(currentRow, options.officialDataResync);

    const selectedFields = new Set(options.officialDataResync.selected_fields);
    return OFFICIAL_RESYNC_FIELDS.reduce<EntityUpdate>((resolvedRow, field) => {
      if (selectedFields.has(field)) {
        return resolvedRow;
      }
      return {
        ...resolvedRow,
        [field]: currentRow[field],
      };
    }, updateRow);
  }

  if (!currentRow.official_data_source && !currentRow.official_data_synced_at) {
    return updateRow;
  }

  return {
    ...updateRow,
    siret: currentRow.siret,
    siren: currentRow.siren,
    naf_code: currentRow.naf_code,
    official_name: currentRow.official_name,
    official_data_source: currentRow.official_data_source,
    official_data_synced_at: currentRow.official_data_synced_at,
  };
};

export const persistEntityRow = async (
  database: EntityPersistenceDb,
  entityId: string | undefined,
  updateRow: EntityUpdate,
  insertRow: EntityInsert,
  options: PersistEntityRowOptions = {},
): Promise<EntityRow> => {
  if (entityId) {
    try {
      const rowsBeforeUpdate = await database
        .select({
          siret: entities.siret,
          siren: entities.siren,
          naf_code: entities.naf_code,
          official_name: entities.official_name,
          official_data_source: entities.official_data_source,
          official_data_synced_at: entities.official_data_synced_at,
          address: entities.address,
          postal_code: entities.postal_code,
          department: entities.department,
          city: entities.city,
        })
        .from(entities)
        .where(eq(entities.id, entityId))
        .limit(1);
      const resolvedUpdateRow = resolveOfficialUpdateRow(
        updateRow,
        rowsBeforeUpdate[0],
        options,
      );
      const rows = await database
        .update(entities)
        .set(resolvedUpdateRow)
        .where(eq(entities.id, entityId))
        .returning();
      const data = rows[0];
      if (!data) {
        throw httpError(
          500,
          "DB_WRITE_FAILED",
          "Impossible de mettre a jour l'entite.",
        );
      }
      return data;
    } catch (error) {
      if (isExpectedPersistenceError(error)) {
        throw error;
      }
      throw httpError(
        500,
        "DB_WRITE_FAILED",
        "Impossible de mettre a jour l'entite.",
        extractDbErrorDetails(error),
      );
    }
  }

  if (options.officialDataResync) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "La resynchronisation officielle requiert une fiche existante.",
    );
  }

  try {
    const rows = await database
      .insert(entities)
      .values(insertRow)
      .returning();
    const data = rows[0];
    if (!data) {
      throw httpError(500, "DB_WRITE_FAILED", "Impossible de creer l'entite.");
    }
    return data;
  } catch (error) {
    if (isDbWriteFailed(error)) {
      throw error;
    }
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible de creer l'entite.",
      extractDbErrorDetails(error),
    );
  }
};

export const persistPrimaryContact = async (
  database: EntityPersistenceDb,
  primaryContact: EntityContactInsert | null,
  savedEntityId: string,
): Promise<void> => {
  if (!primaryContact) {
    return;
  }

  const normalizedContact = {
    ...primaryContact,
    entity_id: savedEntityId,
  };

  try {
    const existingRows = await database
      .select({ id: entity_contacts.id })
      .from(entity_contacts)
      .where(and(
        eq(entity_contacts.entity_id, savedEntityId),
        isNull(entity_contacts.archived_at),
      ))
      .orderBy(desc(entity_contacts.is_primary), asc(entity_contacts.created_at))
      .limit(1);
    const existingContact = existingRows[0];

    await database
      .update(entity_contacts)
      .set({ is_primary: false })
      .where(eq(entity_contacts.entity_id, savedEntityId));

    if (existingContact) {
      await database
        .update(entity_contacts)
        .set({
          first_name: normalizedContact.first_name,
          last_name: normalizedContact.last_name,
          email: normalizedContact.email,
          phone: normalizedContact.phone,
          position: normalizedContact.position,
          service_label: normalizedContact.service_label,
          is_primary: true,
          notes: normalizedContact.notes,
        })
        .where(eq(entity_contacts.id, existingContact.id));
      return;
    }

    await database
      .insert(entity_contacts)
      .values(normalizedContact);
  } catch (error) {
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible d'enregistrer le contact principal.",
      extractDbErrorDetails(error),
    );
  }
};

export const persistSelectedPrimaryContact = async (
  database: EntityPersistenceDb,
  savedEntityId: string,
  primaryContactId: string | null,
): Promise<void> => {
  try {
    await database
      .update(entity_contacts)
      .set({ is_primary: false })
      .where(eq(entity_contacts.entity_id, savedEntityId));

    if (!primaryContactId) {
      return;
    }

    const contactRows = await database
      .select({ id: entity_contacts.id })
      .from(entity_contacts)
      .where(and(
        eq(entity_contacts.id, primaryContactId),
        eq(entity_contacts.entity_id, savedEntityId),
        isNull(entity_contacts.archived_at),
      ))
      .limit(1);

    if (!contactRows[0]) {
      throw httpError(
        404,
        "NOT_FOUND",
        "Contact principal introuvable pour ce tiers.",
      );
    }

    await database
      .update(entity_contacts)
      .set({ is_primary: true })
      .where(eq(entity_contacts.id, primaryContactId));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      Reflect.get(error, "code") === "NOT_FOUND"
    ) {
      throw error;
    }
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible d'enregistrer le contact principal.",
      extractDbErrorDetails(error),
    );
  }
};
