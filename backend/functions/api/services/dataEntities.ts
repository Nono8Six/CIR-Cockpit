import { and, asc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';

import { agencies, entities, entity_contacts, interactions } from '../../../drizzle/schema.ts';
import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataEntitiesRouteResponse } from '../../../../shared/schemas/api-responses.ts';
import type { DataEntitiesPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  ensureAgencyAccess,
  ensureDataRateLimit,
  ensureOptionalAgencyAccess,
  getEntityAgencyId
} from './dataAccess.ts';

type EntityRow = Database['public']['Tables']['entities']['Row'];
type EntityContactRow = Database['public']['Tables']['entity_contacts']['Row'];
type EntityInsert = typeof entities.$inferInsert;
type EntityUpdate = Omit<EntityInsert, 'created_by'>;
type AgencyLookupRow = Pick<Database['public']['Tables']['agencies']['Row'], 'id' | 'archived_at'>;
type SaveEntityPayload = Extract<DataEntitiesPayload, { action: 'save' }>;
type SaveClientPayload = Extract<SaveEntityPayload, { entity_type: 'Client' }>;
type SaveIndividualClientPayload = SaveClientPayload & {
  entity: Extract<SaveClientPayload['entity'], { client_kind: 'individual' }>;
};
type ListEntitiesPayload = Extract<DataEntitiesPayload, { action: 'list' }>;
type SearchIndexPayload = Extract<DataEntitiesPayload, { action: 'search_index' }>;
type ReassignEntityPayload = Extract<DataEntitiesPayload, { action: 'reassign' }>;
type DeleteEntityPayload = Extract<DataEntitiesPayload, { action: 'delete' }>;
type AccountType = Database['public']['Enums']['account_type'];
type EntityContactInsert = Database['public']['Tables']['entity_contacts']['Insert'];
type SqlCondition = ReturnType<typeof sql>;

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

const readErrorField = (value: unknown, key: string): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const field = Reflect.get(value, key);
  if (typeof field !== 'string') {
    return undefined;
  }
  const trimmed = field.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractDbErrorDetails = (error: unknown): string | undefined => {
  const code = readErrorField(error, 'code');
  const message = readErrorField(error, 'message');
  const detail = readErrorField(error, 'detail');
  const hint = readErrorField(error, 'hint');

  const details: string[] = [];
  if (code) {
    details.push(`code=${code}`);
  }
  if (message) {
    details.push(message);
  }
  if (detail) {
    details.push(`detail=${detail}`);
  }
  if (hint) {
    details.push(`hint=${hint}`);
  }

  return details.length > 0 ? details.join(' | ') : undefined;
};

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

const saveEntity = async (
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

const archiveEntity = async (
  db: DbClient,
  entityId: string,
  archived: boolean
): Promise<EntityRow> => {
  try {
    const rows = await db
      .update(entities)
      .set({ archived_at: archived ? new Date().toISOString() : null })
      .where(eq(entities.id, entityId))
      .returning();
    const data = rows[0];
    if (!data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour l\'entite.');
    return data;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour l\'entite.');
  }
};

const resolveListAgencyCondition = (
  authContext: AuthContext,
  payload: ListEntitiesPayload
): SqlCondition | null => {
  if (payload.orphans_only) {
    ensureOptionalAgencyAccess(authContext, null);
    return isNull(entities.agency_id);
  }

  if (payload.agency_id) {
    return eq(entities.agency_id, ensureAgencyAccess(authContext, payload.agency_id));
  }

  if (authContext.isSuperAdmin) {
    return null;
  }

  if (authContext.agencyIds.length === 0) {
    return sql<boolean>`false`;
  }

  if (authContext.agencyIds.length === 1) {
    return eq(entities.agency_id, authContext.agencyIds[0]);
  }

  return inArray(entities.agency_id, authContext.agencyIds);
};

const buildEntityTypeCondition = (entityType: ListEntitiesPayload['entity_type']): SqlCondition => {
  if (entityType === 'Prospect') {
    return or(
      ilike(entities.entity_type, '%prospect%'),
      ilike(entities.entity_type, '%particulier%')
    ) ?? sql<boolean>`false`;
  }

  return eq(entities.entity_type, entityType);
};

export const listEntities = async (
  db: DbClient,
  authContext: AuthContext,
  payload: ListEntitiesPayload
): Promise<EntityRow[]> => {
  const conditions: SqlCondition[] = [buildEntityTypeCondition(payload.entity_type)];
  const agencyCondition = resolveListAgencyCondition(authContext, payload);

  if (agencyCondition) {
    conditions.push(agencyCondition);
  }

  if (payload.include_archived !== true) {
    conditions.push(isNull(entities.archived_at));
  }

  try {
    return await db
      .select()
      .from(entities)
      .where(and(...conditions) ?? sql<boolean>`true`)
      .orderBy(asc(entities.name));
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      payload.entity_type === 'Client'
        ? 'Impossible de charger les clients.'
        : 'Impossible de charger les prospects.',
      extractDbErrorDetails(error)
    );
  }
};

export const getEntitySearchIndex = async (
  db: DbClient,
  authContext: AuthContext,
  payload: SearchIndexPayload
): Promise<{ entities: EntityRow[]; contacts: EntityContactRow[] }> => {
  if (!payload.agency_id) {
    return { entities: [], contacts: [] };
  }

  const agencyId = ensureAgencyAccess(authContext, payload.agency_id);
  const entityConditions: SqlCondition[] = [eq(entities.agency_id, agencyId)];

  if (payload.include_archived !== true) {
    entityConditions.push(isNull(entities.archived_at));
  }

  let entityRows: EntityRow[];
  try {
    entityRows = await db
      .select()
      .from(entities)
      .where(and(...entityConditions) ?? sql<boolean>`true`)
      .orderBy(asc(entities.name));
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Impossible de charger les entites.',
      extractDbErrorDetails(error)
    );
  }

  const entityIds = entityRows.map((entity) => entity.id);
  if (entityIds.length === 0) {
    return { entities: entityRows, contacts: [] };
  }

  const contactConditions: SqlCondition[] = [inArray(entity_contacts.entity_id, entityIds)];
  if (payload.include_archived !== true) {
    contactConditions.push(isNull(entity_contacts.archived_at));
  }

  try {
    const contacts = await db
      .select()
      .from(entity_contacts)
      .where(and(...contactConditions) ?? sql<boolean>`true`)
      .orderBy(asc(entity_contacts.last_name));
    return { entities: entityRows, contacts };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Impossible de charger les contacts.',
      extractDbErrorDetails(error)
    );
  }
};

const convertToClient = async (
  db: DbClient,
  entityId: string,
  clientNumber: string,
  accountType: AccountType
): Promise<EntityRow> => {
  const trimmedNumber = clientNumber.trim().replace(/\s+/g, '');
  if (!trimmedNumber) throw httpError(400, 'VALIDATION_ERROR', 'Numero client requis.');

  try {
    const rows = await db
      .update(entities)
      .set({
        entity_type: 'Client',
        client_kind: 'company',
        client_number: trimmedNumber,
        account_type: accountType
      })
      .where(and(
        eq(entities.id, entityId),
        ne(entities.entity_type, 'Client')
      ))
      .returning();
    const data = rows[0];
    if (!data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de convertir en client.');
    return data;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de convertir en client.');
  }
};

export const ensureReassignSuperAdmin = (authContext: AuthContext): void => {
  if (!authContext.isSuperAdmin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
};

export const ensureDeleteSuperAdmin = (authContext: AuthContext): void => {
  if (!authContext.isSuperAdmin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
};

const deleteEntity = async (
  db: DbClient,
  payload: DeleteEntityPayload
): Promise<{ entity: EntityRow; deletedInteractionsCount: number }> => {
  let deletedInteractionsCount = 0;

  if (payload.delete_related_interactions === true) {
    try {
      const deletedRows = await db
        .delete(interactions)
        .where(eq(interactions.entity_id, payload.entity_id))
        .returning({ id: interactions.id });
      deletedInteractionsCount = deletedRows.length;
    } catch {
      throw httpError(
        500,
        'DB_WRITE_FAILED',
        "Impossible de supprimer les interactions de l'entite."
      );
    }
  }

  try {
    const rows = await db
      .delete(entities)
      .where(eq(entities.id, payload.entity_id))
      .returning();
    const data = rows[0];
    if (!data) {
      throw httpError(404, 'NOT_FOUND', 'Entite introuvable.');
    }
    return {
      entity: data,
      deletedInteractionsCount
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }
    throw httpError(
      500,
      'DB_WRITE_FAILED',
      "Impossible de supprimer l'entite.",
      extractDbErrorDetails(error)
    );
  }
};

const ensureTargetAgencyIsActive = async (db: DbClient, targetAgencyId: string): Promise<void> => {
  let data: AgencyLookupRow | undefined;
  try {
    const rows = await db
      .select({
        id: agencies.id,
        archived_at: agencies.archived_at
      })
      .from(agencies)
      .where(eq(agencies.id, targetAgencyId))
      .limit(1);
    data = rows[0];
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de verifier l'agence cible.");
  }
  if (!data) {
    throw httpError(404, 'NOT_FOUND', 'Agence cible introuvable.');
  }
  if (data.archived_at) {
    throw httpError(400, 'VALIDATION_ERROR', 'Agence cible archivee.');
  }
};

const ensureEntityExists = async (db: DbClient, entityId: string): Promise<void> => {
  let data: { id: string } | undefined;
  try {
    const rows = await db
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);
    data = rows[0];
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de verifier l'entite.");
  }
  if (!data) {
    throw httpError(404, 'NOT_FOUND', 'Entite introuvable.');
  }
};

export const reassignEntity = async (
  db: DbClient,
  payload: ReassignEntityPayload
): Promise<{ entity: EntityRow; propagatedInteractionsCount: number }> => {
  await ensureTargetAgencyIsActive(db, payload.target_agency_id);

  let entity: EntityRow | undefined;
  try {
    const rows = await db
      .update(entities)
      .set({ agency_id: payload.target_agency_id })
      .where(and(
        eq(entities.id, payload.entity_id),
        isNull(entities.agency_id)
      ))
      .returning();
    entity = rows[0];
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de reassigner l'entite.");
  }
  if (!entity) {
    await ensureEntityExists(db, payload.entity_id);
    throw httpError(400, 'VALIDATION_ERROR', "Seules les entites orphelines peuvent etre reattribuees.");
  }

  let propagatedRows: Array<{ id: string }> = [];
  try {
    propagatedRows = await db
      .update(interactions)
      .set({ agency_id: payload.target_agency_id })
      .where(and(
        eq(interactions.entity_id, payload.entity_id),
        isNull(interactions.agency_id)
      ))
      .returning({ id: interactions.id });
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de propager l'agence aux interactions.");
  }

  return {
    entity,
    propagatedInteractionsCount: propagatedRows?.length ?? 0
  };
};

export const handleDataEntitiesAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataEntitiesPayload
): Promise<DataEntitiesRouteResponse> => {
  await ensureDataRateLimit(`data_entities:${data.action}`, authContext.userId);

  switch (data.action) {
    case 'list': {
      const rows = await listEntities(db, authContext, data);
      return { request_id: requestId, ok: true, entities: rows };
    }
    case 'search_index': {
      const index = await getEntitySearchIndex(db, authContext, data);
      return { request_id: requestId, ok: true, ...index };
    }
    case 'save': {
      const agencyId = ensureAgencyAccess(authContext, data.agency_id);
      const entity = await saveEntity(db, data, agencyId, authContext.userId);
      return { request_id: requestId, ok: true, entity };
    }
    case 'archive': {
      const agencyId = await getEntityAgencyId(db, data.entity_id);
      ensureOptionalAgencyAccess(authContext, agencyId);
      const entity = await archiveEntity(db, data.entity_id, data.archived);
      return { request_id: requestId, ok: true, entity };
    }
    case 'delete': {
      ensureDeleteSuperAdmin(authContext);
      const { entity, deletedInteractionsCount } = await deleteEntity(db, data);
      return {
        request_id: requestId,
        ok: true,
        entity,
        deleted_interactions_count: deletedInteractionsCount
      };
    }
    case 'convert_to_client': {
      const agencyId = await getEntityAgencyId(db, data.entity_id);
      ensureOptionalAgencyAccess(authContext, agencyId);
      const entity = await convertToClient(
        db,
        data.entity_id,
        data.convert.client_number,
        data.convert.account_type
      );
      return { request_id: requestId, ok: true, entity };
    }
    case 'reassign': {
      ensureReassignSuperAdmin(authContext);
      const { entity, propagatedInteractionsCount } = await reassignEntity(db, data);
      return {
        request_id: requestId,
        ok: true,
        entity,
        propagated_interactions_count: propagatedInteractionsCount
      };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
