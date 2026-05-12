import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { entity_contacts } from '../../../drizzle/schema.ts';
import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataEntityContactsResponse } from '../../../../shared/schemas/api-responses.ts';
import type { DataEntityContactsPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  ensureDataRateLimit,
  ensureOptionalAgencyAccess,
  getContactEntityId,
  getEntityAgencyId
} from './dataAccess.ts';

type ContactRow = Database['public']['Tables']['entity_contacts']['Row'];

type SaveContactData = Extract<DataEntityContactsPayload, { action: 'save' }>;
type ListContactsData = Extract<DataEntityContactsPayload, { action: 'list_by_entity' }>;

type DataEntityContactsDependencies = {
  ensureRateLimit: (scope: string, callerId: string) => Promise<void>;
  getEntityAgencyId: (db: DbClient, entityId: string) => Promise<string | null>;
  getContactEntityId: (db: DbClient, contactId: string) => Promise<string>;
  ensureAgencyAccess: (authContext: AuthContext, agencyId: string | null | undefined) => string | null;
};

const defaultDependencies: DataEntityContactsDependencies = {
  ensureRateLimit: ensureDataRateLimit,
  getEntityAgencyId,
  getContactEntityId,
  ensureAgencyAccess: ensureOptionalAgencyAccess
};

const saveContact = async (
  db: DbClient,
  entityId: string,
  contactId: string | undefined,
  contact: SaveContactData['contact']
): Promise<ContactRow> => {
  const normalized = {
    first_name: contact.first_name.trim(),
    last_name: contact.last_name.trim(),
    email: contact.email?.trim() || null,
    phone: contact.phone?.trim() || null,
    position: contact.position?.trim() || null,
    notes: contact.notes?.trim() || null
  };

  if (contactId) {
    try {
      const rows = await db
        .update(entity_contacts)
        .set(normalized)
        .where(and(eq(entity_contacts.id, contactId), eq(entity_contacts.entity_id, entityId)))
        .returning();
      const data = rows[0];
      if (!data) {
        throw httpError(404, 'NOT_FOUND', 'Contact introuvable pour ce tiers.');
      }
      return data;
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && ['DB_WRITE_FAILED', 'NOT_FOUND'].includes(String(Reflect.get(error, 'code')))
      ) {
        throw error;
      }
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour le contact.');
    }
  }

  try {
    const rows = await db
      .insert(entity_contacts)
      .values({ entity_id: entityId, ...normalized })
      .returning();
    const data = rows[0];
    if (!data) {
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de creer le contact.');
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
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de creer le contact.');
  }
};

const deleteContact = async (db: DbClient, contactId: string): Promise<void> => {
  try {
    const rows = await db
      .delete(entity_contacts)
      .where(eq(entity_contacts.id, contactId))
      .returning({ id: entity_contacts.id });
    if (rows.length === 0) {
      throw httpError(404, 'NOT_FOUND', 'Contact introuvable.');
    }
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de supprimer le contact.');
  }
};

const compareText = (left: string | null, right: string | null): number => {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right, 'fr');
};

const sortContacts = (contacts: ContactRow[]): ContactRow[] =>
  contacts.toSorted((left, right) =>
    compareText(left.last_name, right.last_name)
    || compareText(left.first_name, right.first_name)
    || left.created_at.localeCompare(right.created_at)
  );

const listContactsByEntity = async (
  db: DbClient,
  data: ListContactsData
): Promise<ContactRow[]> => {
  const conditions = [eq(entity_contacts.entity_id, data.entity_id)];
  if (data.include_archived !== true) {
    conditions.push(isNull(entity_contacts.archived_at));
  }

  try {
    const contacts = await db
      .select()
      .from(entity_contacts)
      .where(and(...conditions) ?? sql<boolean>`true`)
      .orderBy(asc(entity_contacts.last_name), asc(entity_contacts.first_name), asc(entity_contacts.created_at));
    return sortContacts(contacts);
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les contacts.');
  }
};

export const handleDataEntityContactsAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataEntityContactsPayload,
  dependencies: DataEntityContactsDependencies = defaultDependencies
): Promise<DataEntityContactsResponse> => {
  await dependencies.ensureRateLimit(`data_entity_contacts:${data.action}`, authContext.userId);

  switch (data.action) {
    case 'list_by_entity': {
      const agencyId = await dependencies.getEntityAgencyId(db, data.entity_id);
      dependencies.ensureAgencyAccess(authContext, agencyId);
      const contacts = await listContactsByEntity(db, data);
      return { request_id: requestId, ok: true, contacts };
    }
    case 'save': {
      const agencyId = await dependencies.getEntityAgencyId(db, data.entity_id);
      dependencies.ensureAgencyAccess(authContext, agencyId);
      const contact = await saveContact(db, data.entity_id, data.id, data.contact);
      return { request_id: requestId, ok: true, contact };
    }
    case 'delete': {
      const entityId = await dependencies.getContactEntityId(db, data.contact_id);
      const agencyId = await dependencies.getEntityAgencyId(db, entityId);
      dependencies.ensureAgencyAccess(authContext, agencyId);
      await deleteContact(db, data.contact_id);
      return { request_id: requestId, ok: true, contact_id: data.contact_id };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
