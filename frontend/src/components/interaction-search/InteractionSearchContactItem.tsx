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
    className="min-h-11 rounded-md px-2.5 py-2 text-[12px] text-foreground hover:bg-surface-1 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
  >
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-1 text-[11px] font-bold text-muted-foreground" aria-hidden="true">
      {`${contact.first_name ?? ''}${contact.last_name}`.trim().slice(0, 2).toUpperCase() || 'CT'}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] font-semibold">
        <HighlightedText
          value={`${(contact.first_name ?? '').trim()} ${contact.last_name}`.trim()}
          query={query}
        />
      </span>
      <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
        {contact.position || 'Contact'}
      </span>
    </span>
    <span className="max-w-[180px] truncate font-mono text-[11px] text-muted-foreground">
      {contact.email ? (
        <HighlightedText value={contact.email} query={query} />
      ) : (
        <HighlightedDigits formatted={contact.phone ?? ''} query={query} />
      )}
    </span>
  </CommandItem>
);

export default InteractionSearchContactItem;
