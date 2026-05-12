import type { EntityContact } from '@/types';

export const getEntityContactName = (contact: EntityContact): string =>
  [contact.first_name ?? '', contact.last_name ?? ''].filter(Boolean).join(' ').trim() || 'Contact';

const getContactReachLine = (contact: EntityContact): string =>
  contact.email?.trim() || contact.phone?.trim() || '';

export const getEntityContactDetail = (
  contact: EntityContact,
  emptyDetailLabel = 'Aucune information'
): string => {
  const parts = [contact.position?.trim() ?? '', getContactReachLine(contact)].filter(Boolean);
  return parts.join(' · ') || emptyDetailLabel;
};
