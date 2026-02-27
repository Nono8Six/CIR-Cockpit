import { Building2 } from 'lucide-react';

import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { CommandItem } from '@/components/ui/command';
import HighlightedDigits from './HighlightedDigits';
import HighlightedText from './HighlightedText';

type InteractionSearchEntityItemProps = {
  entity: Entity;
  query: string;
  includeArchived: boolean;
  onSelectEntity: (entity: Entity) => void;
};

const InteractionSearchEntityItem = ({
  entity,
  query,
  includeArchived,
  onSelectEntity
}: InteractionSearchEntityItemProps) => (
  <CommandItem
    value={`entity-${entity.id}`}
    onSelect={() => onSelectEntity(entity)}
    className="rounded-md px-2.5 py-1.5 text-[12px] text-foreground hover:bg-surface-1 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
  >
    <Building2 className="text-muted-foreground/80" />
    <span className="flex-1 truncate">
      <HighlightedText value={entity.name} query={query} />
    </span>
    {includeArchived && entity.archived_at && (
      <span className="text-xs uppercase tracking-wide text-warning-foreground bg-warning/15 border border-warning/25 px-1.5 py-0.5 rounded">
        Archive
      </span>
    )}
    <span className="text-xs text-muted-foreground">
      <HighlightedDigits
        formatted={formatClientNumber(entity.client_number)}
        query={query}
      />
    </span>
  </CommandItem>
);

export default InteractionSearchEntityItem;
