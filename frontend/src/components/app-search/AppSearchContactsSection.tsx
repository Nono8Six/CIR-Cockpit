import { UserRound } from 'lucide-react';

import type { EntityContact } from '@/types';
import AppSearchGroup from './AppSearchGroup';
import AppSearchRow from './AppSearchRow';

type AppSearchContactsSectionProps = {
  contacts: EntityContact[];
  entityNameById: Map<string, string>;
  onFocusClient: (clientId: string, contactId?: string | null) => void;
};

const AppSearchContactsSection = ({
  contacts,
  entityNameById,
  onFocusClient
}: AppSearchContactsSectionProps) => {
  if (contacts.length === 0) return null;

  return (
    <AppSearchGroup heading="Contacts">
      {contacts.map((contact) => {
        const entityName = entityNameById.get(contact.entity_id);
        const fullName = `${(contact.first_name ?? '').trim()} ${contact.last_name}`.trim();

        return (
          <AppSearchRow
            key={contact.id}
            value={`contact ${fullName} ${contact.position ?? ''} ${contact.email ?? ''} ${contact.phone ?? ''} ${entityName ?? ''}`}
            onSelect={() => onFocusClient(contact.entity_id, contact.id)}
            icon={UserRound}
            label={fullName}
            detail={[entityName, contact.position].filter(Boolean).join(' · ') || undefined}
            meta={contact.phone ?? contact.email ?? undefined}
            testId={`app-search-contact-${contact.id}`}
          />
        );
      })}
    </AppSearchGroup>
  );
};

export default AppSearchContactsSection;
