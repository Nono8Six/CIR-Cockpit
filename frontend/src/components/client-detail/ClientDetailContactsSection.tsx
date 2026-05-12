import EntityContactsPanelSection from '@/components/entity-contact/EntityContactsPanelSection';
import type { ClientDetailContactsSectionProps } from './ClientDetailPanel.types';

const ClientDetailContactsSection = ({
  contacts,
  focusedContactId,
  isContactsLoading,
  onAddContact,
  onEditContact,
  onDeleteContact
}: ClientDetailContactsSectionProps) => (
  <EntityContactsPanelSection
    contacts={contacts}
    focusedContactId={focusedContactId}
    isContactsLoading={isContactsLoading}
    emptyLabel="Aucun contact pour ce client."
    onAddContact={onAddContact}
    onEditContact={onEditContact}
    onDeleteContact={onDeleteContact}
  />
);

export default ClientDetailContactsSection;
