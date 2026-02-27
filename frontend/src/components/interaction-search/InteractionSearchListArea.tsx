import type { Entity, EntityContact } from '@/types';
import InteractionSearchRecents from './InteractionSearchRecents';
import InteractionSearchResults from './InteractionSearchResults';
import type { InteractionSearchStatus } from './InteractionSearchStatusMessage';

type InteractionSearchPanelState = {
  showRecents: boolean;
  showList: boolean;
  status: InteractionSearchStatus;
};

type InteractionSearchListAreaProps = {
  panelState: InteractionSearchPanelState;
  filteredRecents: Entity[];
  limitedEntities: Entity[];
  limitedContacts: EntityContact[];
  query: string;
  includeArchived: boolean;
  entityHeading: string;
  onSelectEntity: (entity: Entity) => void;
  onSelectContact: (contact: EntityContact) => void;
};

const InteractionSearchListArea = ({
  panelState,
  filteredRecents,
  limitedEntities,
  limitedContacts,
  query,
  includeArchived,
  entityHeading,
  onSelectEntity,
  onSelectContact
}: InteractionSearchListAreaProps) => (
  <>
    {panelState.showRecents && (
      <InteractionSearchRecents
        recents={filteredRecents}
        onSelectEntity={onSelectEntity}
      />
    )}
    {panelState.showList && (
      <InteractionSearchResults
        status={panelState.status}
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
