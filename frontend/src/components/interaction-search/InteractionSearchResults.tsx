import type { TierV1DirectoryRow } from 'shared/schemas/tier-v1.schema';
import { CommandGroup, CommandList } from '@/components/ui/command';
import InteractionSearchEntityItem from './InteractionSearchEntityItem';
import InteractionSearchStatusMessage, { type InteractionSearchStatus } from './InteractionSearchStatusMessage';

type InteractionSearchResultsProps = {
  status: InteractionSearchStatus;
  limitedResults: TierV1DirectoryRow[];
  query: string;
  includeArchived: boolean;
  entityHeading: string;
  onSelectSearchResult: (result: TierV1DirectoryRow) => void;
  showTypeBadge?: boolean;
};

const InteractionSearchResults = ({
  status,
  limitedResults,
  query,
  includeArchived,
  entityHeading,
  onSelectSearchResult,
  showTypeBadge = false
}: InteractionSearchResultsProps) => (
  <CommandList className="max-h-[220px] overflow-y-auto overflow-x-hidden">
    <InteractionSearchStatusMessage status={status} />
    {status === 'results' && limitedResults.length > 0 && (
      <CommandGroup heading={entityHeading} className="p-2">
        {limitedResults.map((result) => (
          <InteractionSearchEntityItem
            key={`${result.source}-${result.id}`}
            result={result}
            query={query}
            includeArchived={includeArchived}
            onSelectSearchResult={onSelectSearchResult}
            showTypeBadge={showTypeBadge}
          />
        ))}
      </CommandGroup>
    )}
  </CommandList>
);

export default InteractionSearchResults;
