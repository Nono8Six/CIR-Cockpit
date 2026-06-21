import type { DbClient } from '../../../types.ts';
import { httpError } from '../../../middleware/errorHandler.ts';
import {
  type EntityRow,
  extractDbErrorDetails,
  type SaveEntityPayload,
  type SaveOfficialDataResyncPayload,
} from '../core/dataEntitiesShared.ts';
import {
  persistEntityRow,
  persistPrimaryContact,
  persistSelectedPrimaryContact,
} from './dataEntitiesSavePersistence.ts';
import { buildSaveEntityRows } from './dataEntitiesSaveRows.ts';

const hasPrimaryContactSelection = (
  payload: SaveEntityPayload,
): payload is SaveEntityPayload & { primary_contact_id?: string | null } =>
  (payload.entity_type === "Client" || payload.entity_type === "Prospect") &&
  Object.prototype.hasOwnProperty.call(payload, "primary_contact_id");

const getOfficialDataResync = (
  payload: SaveEntityPayload,
): SaveOfficialDataResyncPayload | undefined =>
  (payload.entity_type === "Client" || payload.entity_type === "Prospect")
    ? payload.official_data_resync
    : undefined;

export const saveEntity = async (
  db: DbClient,
  payload: SaveEntityPayload,
  agencyId: string | null,
  createdBy: string,
): Promise<EntityRow> => {
  const { updateRow, insertRow, primaryContact, isIndividualClient } =
    buildSaveEntityRows(
      payload,
      agencyId,
      createdBy,
    );
  const officialDataResync = getOfficialDataResync(payload);

  if (!isIndividualClient && !hasPrimaryContactSelection(payload) && !officialDataResync) {
    return persistEntityRow(db, payload.id, updateRow, insertRow, {
      officialDataResync,
    });
  }

  try {
    return await db.transaction(async (tx) => {
      const savedEntity = await persistEntityRow(
        tx,
        payload.id,
        updateRow,
        insertRow,
        {
          officialDataResync,
        },
      );
      if (isIndividualClient) {
        await persistPrimaryContact(tx, primaryContact, savedEntity.id);
      } else if (hasPrimaryContactSelection(payload)) {
        await persistSelectedPrimaryContact(
          tx,
          savedEntity.id,
          payload.primary_contact_id ?? null,
        );
      }
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
      "Impossible d'enregistrer la fiche.",
      extractDbErrorDetails(error),
    );
  }
};
