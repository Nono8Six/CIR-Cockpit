import { eq } from 'drizzle-orm';

import { entities, entity_contacts } from '../../../drizzle/schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  extractDbErrorDetails,
  type EntityContactInsert,
  type EntityInsert,
  type EntityRow,
  type EntityUpdate,
  type SaveClientPayload,
  type SaveEntityPayload,
  type SaveIndividualClientPayload
} from './dataEntitiesShared.ts';

const isSaveClientPayload = (payload: SaveEntityPayload): payload is SaveClientPayload =>
  payload.entity_type === 'Client';

const isSaveIndividualClientPayload = (
  payload: SaveClientPayload
): payload is SaveIndividualClientPayload =>
  payload.entity.client_kind === 'individual';

type BaseEntityUpdate = Pick<
  EntityUpdate,
  | 'entity_type'
  | 'name'
  | 'agency_id'
  | 'address'
  | 'postal_code'
  | 'department'
  | 'city'
  | 'siret'
  | 'siren'
  | 'naf_code'
  | 'official_name'
  | 'official_data_source'
  | 'official_data_synced_at'
  | 'notes'
>;

const buildBaseEntityUpdate = (
  payload: SaveEntityPayload,
  agencyId: string
): BaseEntityUpdate => {
  const entity = payload.entity;

  return {
    entity_type: payload.entity_type,
    name: entity.name.trim(),
    agency_id: agencyId,
    address: entity.address?.trim() ?? '',
    postal_code: entity.postal_code?.trim() ?? '',
    department: entity.department?.trim() ?? '',
    city: entity.city?.trim() ?? '',
    siret: entity.siret?.trim() || null,
    siren: entity.siren?.trim() || null,
    naf_code: entity.naf_code?.trim() || null,
    official_name: entity.official_name?.trim() || null,
    official_data_source: entity.official_data_source ?? null,
    official_data_synced_at: entity.official_data_synced_at?.trim() || null,
    notes: entity.notes?.trim() || null
  };
};

const buildPrimaryContactInsert = (
  payload: SaveIndividualClientPayload
): EntityContactInsert => ({
  entity_id: payload.id ?? '',
  first_name: payload.entity.primary_contact.first_name.trim() || null,
  last_name: payload.entity.primary_contact.last_name.trim() || '',
  email: payload.entity.primary_contact.email?.trim() || null,
  phone: payload.entity.primary_contact.phone?.trim() || null,
  position: payload.entity.primary_contact.position?.trim() || null,
  notes: payload.entity.primary_contact.notes?.trim() || null
});

export const saveEntity = async (
  db: DbClient,
  payload: SaveEntityPayload,
  agencyId: string,
  createdBy: string
): Promise<EntityRow> => {
  const { id: entityId } = payload;
  const baseRow = buildBaseEntityUpdate(payload, agencyId);

  let updateRow: EntityUpdate;
  let primaryContact: EntityContactInsert | null = null;
  let isIndividualClient = false;

  if (isSaveClientPayload(payload)) {
    const clientEntity = payload.entity;

    if (isSaveIndividualClientPayload(payload)) {
      isIndividualClient = true;
      updateRow = {
        ...baseRow,
        client_kind: 'individual',
        client_number: clientEntity.client_number.trim().replace(/\s+/g, ''),
        account_type: 'cash',
        cir_commercial_id: null
      };
      primaryContact = buildPrimaryContactInsert(payload);
    } else {
      updateRow = {
        ...baseRow,
        client_kind: 'company',
        client_number: clientEntity.client_number.trim().replace(/\s+/g, ''),
        account_type: clientEntity.account_type,
        cir_commercial_id: clientEntity.cir_commercial_id ?? null
      };
    }
  } else {
    updateRow = {
      ...baseRow,
      client_kind: null,
      client_number: null,
      account_type: null,
      cir_commercial_id: null
    };
  }

  const insertRow: EntityInsert = {
    ...updateRow,
    created_by: createdBy
  };

  const persistEntityRow = async (database: typeof db): Promise<EntityRow> => {
    if (entityId) {
      try {
        const rows = await database
          .update(entities)
          .set(updateRow)
          .where(eq(entities.id, entityId))
          .returning();
        const data = rows[0];
        if (!data) {
          throw httpError(500, 'DB_WRITE_FAILED', "Impossible de mettre a jour l'entite.");
        }
        return data;
      } catch (error) {
        if (
          typeof error === 'object'
          && error !== null
          && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
        ) {
          throw error;
        }
        throw httpError(
          500,
          'DB_WRITE_FAILED',
          "Impossible de mettre a jour l'entite.",
          extractDbErrorDetails(error)
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
        throw httpError(500, 'DB_WRITE_FAILED', "Impossible de creer l'entite.");
      }
      return data;
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
      ) {
        throw error;
      }
      throw httpError(
        500,
        'DB_WRITE_FAILED',
        "Impossible de creer l'entite.",
        extractDbErrorDetails(error)
      );
    }
  };

  const persistPrimaryContact = async (database: typeof db, savedEntityId: string): Promise<void> => {
    if (!primaryContact) {
      return;
    }

    const normalizedContact = {
      ...primaryContact,
      entity_id: savedEntityId
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
            notes: normalizedContact.notes
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
        'DB_WRITE_FAILED',
        "Impossible d'enregistrer le contact principal.",
        extractDbErrorDetails(error)
      );
    }
  };

  if (!isIndividualClient) {
    return persistEntityRow(db);
  }

  try {
    return await db.transaction(async (tx) => {
      const savedEntity = await persistEntityRow(tx);
      await persistPrimaryContact(tx, savedEntity.id);
      return savedEntity;
    });
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
    ) {
      throw error;
    }
    throw httpError(
      500,
      'DB_WRITE_FAILED',
      "Impossible d'enregistrer le client particulier.",
      extractDbErrorDetails(error)
    );
  }
};
