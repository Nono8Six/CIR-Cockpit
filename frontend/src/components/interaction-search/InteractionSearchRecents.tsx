import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type InteractionSearchRecentsProps = {
  recents: Entity[];
  onSelectEntity: (entity: Entity) => void;
  showTypeBadge?: boolean;
};

const InteractionSearchRecents = ({
  recents,
  onSelectEntity,
  showTypeBadge = false
}: InteractionSearchRecentsProps) => (
  <div data-testid="interaction-search-recents" className="border-b border-border/70 bg-card px-3 py-2.5">
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
        Récents
      </span>
      <div data-testid="interaction-search-recents-row" className="flex min-w-0 flex-wrap items-center gap-2">
        {recents.map((entity) => (
          <button
            key={entity.id}
            type="button"
            onClick={() => onSelectEntity(entity)}
            className="flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-ring/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <span className="min-w-0 truncate max-w-[170px]">{entity.name}</span>
            {showTypeBadge && entity.entity_type ? (
              <span className="shrink-0 rounded-full border border-border/60 bg-muted/60 px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {entity.entity_type}
              </span>
            ) : null}
            <span className="hidden text-xs font-mono text-muted-foreground/80 sm:inline">
              {formatClientNumber(entity.client_number)}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default InteractionSearchRecents;
