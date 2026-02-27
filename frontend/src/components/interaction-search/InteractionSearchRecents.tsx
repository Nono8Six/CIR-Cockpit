import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type InteractionSearchRecentsProps = {
  recents: Entity[];
  onSelectEntity: (entity: Entity) => void;
};

const InteractionSearchRecents = ({ recents, onSelectEntity }: InteractionSearchRecentsProps) => (
  <div data-testid="interaction-search-recents" className="px-3 py-2 border-b border-border/70 bg-card">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 shrink-0">
        Recents
      </span>
      <div data-testid="interaction-search-recents-row" className="flex min-w-0 flex-wrap items-center gap-2">
        {recents.map((entity) => (
          <button
            key={entity.id}
            type="button"
            onClick={() => onSelectEntity(entity)}
            className="flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-muted-foreground hover:border-ring/40 hover:text-foreground"
          >
            <span className="min-w-0 truncate max-w-[170px]">{entity.name}</span>
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
