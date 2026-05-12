import EntityContactsPanelSection from '@/components/entity-contact/EntityContactsPanelSection';
import type { ProspectDetailContactsSectionProps } from './ProspectDetailPanel.types';

const ProspectDetailContactsSection = ({
  contacts,
  focusedContactId,
  isContactsLoading,
  onAddContact,
  onEditContact,
  onDeleteContact
}: ProspectDetailContactsSectionProps) => (
  <EntityContactsPanelSection
    contacts={contacts}
    focusedContactId={focusedContactId}
    isContactsLoading={isContactsLoading}
    emptyLabel="Aucun contact pour ce prospect."
    onAddContact={onAddContact}
    onEditContact={onEditContact}
    onDeleteContact={onDeleteContact}
  />
);

export default ProspectDetailContactsSection;
