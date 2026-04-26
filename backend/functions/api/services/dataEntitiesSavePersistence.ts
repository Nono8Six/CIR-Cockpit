import { eq } from "drizzle-orm";

import { entities, entity_contacts } from "../../../drizzle/schema.ts";
import { httpError } from "../middleware/errorHandler.ts";
import type { DbClient } from "../types.ts";
import {
  type EntityContactInsert,
  type EntityInsert,
  type EntityRow,
  type EntityUpdate,
  extractDbErrorDetails,
} from "./dataEntitiesShared.ts";

type EntityPersistenceDb = Pick<DbClient, "insert" | "select" | "update">;

const isDbWriteFailed = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  Reflect.get(error, "code") === "DB_WRITE_FAILED";

export const persistEntityRow = async (
  database: EntityPersistenceDb,
  entityId: string | undefined,
  updateRow: EntityUpdate,
  insertRow: EntityInsert,
): Promise<EntityRow> => {
  if (entityId) {
    try {
      const rows = await database
        .update(entities)
        .set(updateRow)
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
      if (isDbWriteFailed(error)) {
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
      .where(eq(entity_contacts.entity_id, savedEntityId))
      .limit(1);
    const existingContact = existingRows[0];

    if (existingContact) {
      await database
        .update(entity_contacts)
        .set({
          first_name: normalizedContact.first_name,
          last_name: normalizedContact.last_name,
          email: normalizedContact.email,
          phone: normalizedContact.phone,
          position: normalizedContact.position,
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
