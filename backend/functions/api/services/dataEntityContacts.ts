import { eq } from 'drizzle-orm';

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
        .where(eq(entity_contacts.id, contactId))
        .returning();
      const data = rows[0];
      if (!data) {
        throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour le contact.');
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
    await db
      .delete(entity_contacts)
      .where(eq(entity_contacts.id, contactId));
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de supprimer le contact.');
  }
};

export const handleDataEntityContactsAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataEntityContactsPayload
): Promise<DataEntityContactsResponse> => {
  await ensureDataRateLimit(`data_entity_contacts:${data.action}`, authContext.userId);

  switch (data.action) {
    case 'save': {
      const agencyId = await getEntityAgencyId(db, data.entity_id);
      ensureOptionalAgencyAccess(authContext, agencyId);
      const contact = await saveContact(db, data.entity_id, data.id, data.contact);
      return { request_id: requestId, ok: true, contact };
    }
    case 'delete': {
      const entityId = await getContactEntityId(db, data.contact_id);
      const agencyId = await getEntityAgencyId(db, entityId);
      ensureOptionalAgencyAccess(authContext, agencyId);
      await deleteContact(db, data.contact_id);
      return { request_id: requestId, ok: true, contact_id: data.contact_id };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
