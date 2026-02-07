import type { RefObject } from 'react';

import type { EntityContact } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CockpitClientContactSelectorProps = {
  contactSelectValue: string;
  contacts: EntityContact[];
  contactsLoading: boolean;
  onContactSelect: (value: string) => void;
  contactSelectRef: RefObject<HTMLButtonElement | null>;
};

const CockpitClientContactSelector = ({
  contactSelectValue,
  contacts,
  contactsLoading,
  onContactSelect,
  contactSelectRef
}: CockpitClientContactSelectorProps) => {
  return (
    <div className="space-y-2">
      <Select value={contactSelectValue} onValueChange={onContactSelect}>
        <SelectTrigger
          className="h-8 text-[11px]"
          aria-label="Selectionner un contact"
          ref={contactSelectRef}
        >
          <SelectValue placeholder="Selectionner un contact" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucun contact</SelectItem>
          {contacts.map((contact) => (
            <SelectItem key={contact.id} value={contact.id}>
              {(contact.first_name ?? '').trim()} {contact.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {contactsLoading && (
        <p className="text-[11px] text-slate-400">Chargement des contacts...</p>
      )}
      {!contactsLoading && contacts.length === 0 && (
        <p className="text-[11px] text-slate-400">Aucun contact associe.</p>
      )}
    </div>
  );
};

export default CockpitClientContactSelector;
