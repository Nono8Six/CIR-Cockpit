import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataEntityContactsPayload } from '../../../../shared/schemas/data.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';

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
    const { data, error } = await db
      .from('entity_contacts')
      .update(normalized)
      .eq('id', contactId)
      .select('*')
      .single();
    if (error || !data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour le contact.');
    return data;
  }

  const { data, error } = await db
    .from('entity_contacts')
    .insert({ entity_id: entityId, ...normalized })
    .select('*')
    .single();
  if (error || !data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de creer le contact.');
  return data;
};

const deleteContact = async (db: DbClient, contactId: string): Promise<void> => {
  const { error } = await db
    .from('entity_contacts')
    .delete()
    .eq('id', contactId);
  if (error) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de supprimer le contact.');
};

export const handleDataEntityContactsAction = async (
  db: DbClient,
  _callerId: string,
  requestId: string | undefined,
  data: DataEntityContactsPayload
): Promise<Record<string, unknown>> => {
  switch (data.action) {
    case 'save': {
      const contact = await saveContact(db, data.entity_id, data.id, data.contact);
      return { request_id: requestId, ok: true, contact };
    }
    case 'delete': {
      await deleteContact(db, data.contact_id);
      return { request_id: requestId, ok: true, contact_id: data.contact_id };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
