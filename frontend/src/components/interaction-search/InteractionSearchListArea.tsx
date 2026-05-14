import type { TierV1DirectoryRow } from 'shared/schemas/tier-v1.schema';
import type { Entity } from '@/types';
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
  limitedResults: TierV1DirectoryRow[];
  query: string;
  includeArchived: boolean;
  entityHeading: string;
  onSelectEntity: (entity: Entity) => void;
  onSelectSearchResult: (result: TierV1DirectoryRow) => void;
  showTypeBadge?: boolean;
};

const InteractionSearchListArea = ({
  panelState,
  filteredRecents,
  limitedResults,
  query,
  includeArchived,
  entityHeading,
  onSelectEntity,
  onSelectSearchResult,
  showTypeBadge = false
}: InteractionSearchListAreaProps) => (
  <>
    {panelState.showRecents && (
      <InteractionSearchRecents
        recents={filteredRecents}
        onSelectEntity={onSelectEntity}
        showTypeBadge={showTypeBadge}
      />
    )}
    {panelState.showList && (
      <InteractionSearchResults
        status={panelState.status}
        limitedResults={limitedResults}
        query={query}
        includeArchived={includeArchived}
        entityHeading={entityHeading}
        onSelectSearchResult={onSelectSearchResult}
        showTypeBadge={showTypeBadge}
      />
    )}
  </>
);

export default InteractionSearchListArea;
