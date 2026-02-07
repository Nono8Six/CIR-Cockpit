import type { Entity, EntityContact } from '@/types';
import InteractionSearchRecents from './InteractionSearchRecents';
import InteractionSearchResults from './InteractionSearchResults';

type InteractionSearchListAreaProps = {
  showRecents: boolean;
  filteredRecents: Entity[];
  showList: boolean;
  resolvedLoading: boolean;
  showSearchError: boolean;
  showResults: boolean;
  limitedEntities: Entity[];
  limitedContacts: EntityContact[];
  query: string;
  includeArchived: boolean;
  entityHeading: string;
  onSelectEntity: (entity: Entity) => void;
  onSelectContact: (contact: EntityContact) => void;
};

const InteractionSearchListArea = ({
  showRecents,
  filteredRecents,
  showList,
  resolvedLoading,
  showSearchError,
  showResults,
  limitedEntities,
  limitedContacts,
  query,
  includeArchived,
  entityHeading,
  onSelectEntity,
  onSelectContact
}: InteractionSearchListAreaProps) => (
  <>
    {showRecents && (
      <InteractionSearchRecents
        recents={filteredRecents}
        onSelectEntity={onSelectEntity}
      />
    )}
    {showList && (
      <InteractionSearchResults
        resolvedLoading={resolvedLoading}
        showSearchError={showSearchError}
        showResults={showResults}
        showRecents={showRecents}
        limitedEntities={limitedEntities}
        limitedContacts={limitedContacts}
        query={query}
        includeArchived={includeArchived}
        entityHeading={entityHeading}
        onSelectEntity={onSelectEntity}
        onSelectContact={onSelectContact}
      />
    )}
  </>
);

export default InteractionSearchListArea;
