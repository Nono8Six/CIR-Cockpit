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
    className="rounded-md px-2.5 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900"
  >
    <Building2 className="text-slate-400" />
    <span className="flex-1 truncate">
      <HighlightedText value={entity.name} query={query} />
    </span>
    {includeArchived && entity.archived_at && (
      <span className="text-xs uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
        Archive
      </span>
    )}
    <span className="text-xs text-slate-500">
      <HighlightedDigits
        formatted={formatClientNumber(entity.client_number)}
        query={query}
      />
    </span>
  </CommandItem>
);

export default InteractionSearchEntityItem;
