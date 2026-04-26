import type { DbClient } from "../types.ts";
import { httpError } from "../middleware/errorHandler.ts";
import {
  type EntityRow,
  extractDbErrorDetails,
  type SaveEntityPayload,
} from "./dataEntitiesShared.ts";
import {
  persistEntityRow,
  persistPrimaryContact,
} from "./dataEntitiesSavePersistence.ts";
import { buildSaveEntityRows } from "./dataEntitiesSaveRows.ts";

export const saveEntity = async (
  db: DbClient,
  payload: SaveEntityPayload,
  agencyId: string,
  createdBy: string,
): Promise<EntityRow> => {
  const { updateRow, insertRow, primaryContact, isIndividualClient } =
    buildSaveEntityRows(
      payload,
      agencyId,
      createdBy,
    );

  if (!isIndividualClient) {
    return persistEntityRow(db, payload.id, updateRow, insertRow);
  }

  try {
    return await db.transaction(async (tx) => {
      const savedEntity = await persistEntityRow(
        tx,
        payload.id,
        updateRow,
        insertRow,
      );
      await persistPrimaryContact(tx, primaryContact, savedEntity.id);
      return savedEntity;
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      Reflect.get(error, "code") === "DB_WRITE_FAILED"
    ) {
      throw error;
    }
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible d'enregistrer le client particulier.",
      extractDbErrorDetails(error),
    );
  }
};
