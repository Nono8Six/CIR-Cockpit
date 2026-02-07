import { User } from 'lucide-react';

import type { EntityContact } from '@/types';
import { CommandItem } from '@/components/ui/command';
import HighlightedDigits from './HighlightedDigits';
import HighlightedText from './HighlightedText';

type InteractionSearchContactItemProps = {
  contact: EntityContact;
  query: string;
  onSelectContact: (contact: EntityContact) => void;
};

const InteractionSearchContactItem = ({
  contact,
  query,
  onSelectContact
}: InteractionSearchContactItemProps) => (
  <CommandItem
    value={`contact-${contact.id}`}
    onSelect={() => onSelectContact(contact)}
    className="rounded-md px-2.5 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900"
  >
    <User className="text-slate-400" />
    <span className="flex-1 truncate">
      <HighlightedText
        value={`${(contact.first_name ?? '').trim()} ${contact.last_name}`.trim()}
        query={query}
      />
    </span>
    <span className="text-[11px] text-slate-500 truncate">
      {contact.email ? (
        <HighlightedText value={contact.email} query={query} />
      ) : (
        <HighlightedDigits formatted={contact.phone ?? ''} query={query} />
      )}
    </span>
  </CommandItem>
);

export default InteractionSearchContactItem;
