import { Plus } from 'lucide-react';

import ClientContactsList from '@/components/ClientContactsList';
import { Button } from '@/components/ui/button';
import type { ClientDetailContactsSectionProps } from './ClientDetailPanel.types';

const ClientDetailContactsSection = ({
  contacts,
  focusedContactId,
  isContactsLoading,
  onAddContact,
  onEditContact,
  onDeleteContact
}: ClientDetailContactsSectionProps) => (
  <>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground/80">Contacts</p>
        <p className="text-sm text-muted-foreground">{contacts.length} contact(s)</p>
      </div>
      <Button type="button" className="h-8 px-3 text-xs" onClick={onAddContact}>
        <Plus size={14} className="mr-1" /> Ajouter un contact
      </Button>
    </div>

    {isContactsLoading ? (
      <div className="text-sm text-muted-foreground/80">Chargement des contacts...</div>
    ) : (
      <ClientContactsList
        contacts={contacts}
        focusedContactId={focusedContactId}
        onEdit={onEditContact}
        onDelete={onDeleteContact}
      />
    )}
  </>
);

export default ClientDetailContactsSection;
