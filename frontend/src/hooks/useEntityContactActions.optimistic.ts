import type { EntityContactPayload } from '@/services/entities/saveEntityContact';
import type { EntityContact } from '@/types';

export type ContactCacheSnapshot = {
  previousContacts: EntityContact[] | undefined;
  optimisticId?: string;
};

export const createOptimisticContactId = (): string =>
  `optimistic-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;

export const toOptimisticContact = (
  payload: EntityContactPayload,
  optimisticId: string
): EntityContact => {
  const now = new Date().toISOString();
  return {
    id: optimisticId,
    entity_id: payload.entity_id,
    first_name: payload.first_name.trim() || null,
    last_name: payload.last_name.trim(),
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    position: payload.position?.trim() || null,
    notes: payload.notes?.trim() || null,
    archived_at: null,
    created_at: now,
    updated_at: now
  };
};
