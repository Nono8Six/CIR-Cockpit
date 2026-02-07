import type { Entity, EntityContact } from '@/types';
import { CommandGroup, CommandList, CommandSeparator } from '@/components/ui/command';
import InteractionSearchContactItem from './InteractionSearchContactItem';
import InteractionSearchEntityItem from './InteractionSearchEntityItem';
import InteractionSearchStatusMessage from './InteractionSearchStatusMessage';

type InteractionSearchResultsProps = {
  resolvedLoading: boolean;
  showSearchError: boolean;
  showResults: boolean;
  showRecents: boolean;
  limitedEntities: Entity[];
  limitedContacts: EntityContact[];
  query: string;
  includeArchived: boolean;
  entityHeading: string;
  onSelectEntity: (entity: Entity) => void;
  onSelectContact: (contact: EntityContact) => void;
};

const InteractionSearchResults = ({
  resolvedLoading,
  showSearchError,
  showResults,
  showRecents,
  limitedEntities,
  limitedContacts,
  query,
  includeArchived,
  entityHeading,
  onSelectEntity,
  onSelectContact
}: InteractionSearchResultsProps) => (
  <div className="px-3 pb-3">
    <CommandList className="max-h-[220px] rounded-lg border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] overflow-hidden">
      <InteractionSearchStatusMessage
        resolvedLoading={resolvedLoading}
        showSearchError={showSearchError}
        showResults={showResults}
        showRecents={showRecents}
        hasResults={limitedEntities.length > 0 || limitedContacts.length > 0}
      />
      {!resolvedLoading && !showSearchError && limitedEntities.length > 0 && (
        <CommandGroup heading={entityHeading} className="p-2">
          {limitedEntities.map((entity) => (
            <InteractionSearchEntityItem
              key={entity.id}
              entity={entity}
              query={query}
              includeArchived={includeArchived}
              onSelectEntity={onSelectEntity}
            />
          ))}
        </CommandGroup>
      )}
      {!resolvedLoading && !showSearchError && limitedContacts.length > 0 && (
        <>
          <CommandSeparator className="mx-2" />
          <CommandGroup heading="Contacts" className="p-2">
            {limitedContacts.map((contact) => (
              <InteractionSearchContactItem
                key={contact.id}
                contact={contact}
                query={query}
                onSelectContact={onSelectContact}
              />
            ))}
          </CommandGroup>
        </>
      )}
    </CommandList>
  </div>
);

export default InteractionSearchResults;
