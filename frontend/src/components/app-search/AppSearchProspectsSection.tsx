import type { Entity } from '@/types';
import { CircleArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';

type AppSearchProspectsSectionProps = {
  prospects: Entity[];
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

const AppSearchProspectsSection = ({
  prospects,
  onRequestConvert
}: AppSearchProspectsSectionProps) => {
  if (prospects.length === 0) return null;

  return (
    <CommandGroup heading="Prospects">
      {prospects.map((entity) => (
        <CommandItem
          key={entity.id}
          value={`${entity.name} ${entity.city ?? ''} prospect convertir`}
          onSelect={() => onRequestConvert({
            id: entity.id,
            name: entity.name,
            client_number: entity.client_number ?? null,
            account_type: entity.account_type ?? null
          })}
          className="gap-3 px-3 py-2"
          data-testid={`app-search-prospect-${entity.id}`}
        >
          <CircleArrowUp className="size-4 text-slate-500" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-slate-900">{entity.name}</span>
            <span className="truncate text-xs text-slate-500">
              {entity.city || 'Sans ville'}
            </span>
          </div>
          <Badge variant="outline" density="dense" className="shrink-0">
            Convertir
          </Badge>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

export default AppSearchProspectsSection;
