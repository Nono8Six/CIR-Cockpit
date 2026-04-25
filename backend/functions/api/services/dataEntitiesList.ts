import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';

import { entities, entity_contacts } from '../../../drizzle/schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  ensureAgencyAccess,
  ensureOptionalAgencyAccess
} from './dataAccess.ts';
import {
  extractDbErrorDetails,
  type EntityContactRow,
  type EntityRow,
  type ListEntitiesPayload,
  type SearchIndexPayload,
  type SqlCondition
} from './dataEntitiesShared.ts';

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
