import type { TierV1DirectoryRow } from 'shared/schemas/tier-v1.schema';
import { getTierTypeDisplayLabel } from '@/constants/relations';
import { CommandItem } from '@/components/ui/command';
import HighlightedText from './HighlightedText';

type InteractionSearchEntityItemProps = {
  result: TierV1DirectoryRow;
  query: string;
  includeArchived: boolean;
  onSelectSearchResult: (result: TierV1DirectoryRow) => void;
  showTypeBadge?: boolean;
};

const InteractionSearchEntityItem = ({
  result,
  query,
  includeArchived,
  onSelectSearchResult,
  showTypeBadge = false
}: InteractionSearchEntityItemProps) => (
  <CommandItem
    value={`${result.source}-${result.id}`}
    onSelect={() => onSelectSearchResult(result)}
    className="min-h-11 rounded-md px-2.5 py-2 text-[12px] text-foreground hover:bg-surface-1 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
  >
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary" aria-hidden="true">
      {result.label.trim().slice(0, 2).toUpperCase() || 'TI'}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] font-semibold">
        <HighlightedText value={result.label} query={query} />
      </span>
      <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
        {result.city || result.email || result.phone || 'Coordonnées non renseignées'}
      </span>
    </span>
    {showTypeBadge ? (
      <span
        data-testid="interaction-search-entity-type-badge"
        className="shrink-0 rounded-full border border-border/70 bg-muted/60 px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        {getTierTypeDisplayLabel(result.type)}
      </span>
    ) : null}
    {result.source === 'profile' ? (
      <span className="shrink-0 rounded-full border border-border/70 bg-card px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Compte outil
      </span>
    ) : null}
    {includeArchived && result.archived_at ? (
      <span className="text-xs uppercase tracking-wide text-warning-foreground bg-warning/15 border border-warning/25 px-1.5 py-0.5 rounded">
        Archive
      </span>
    ) : null}
    <span className="max-w-[96px] truncate font-mono text-[11px] text-muted-foreground">
      <HighlightedText value={result.identifier ?? ''} query={query} />
    </span>
  </CommandItem>
);

export default InteractionSearchEntityItem;
