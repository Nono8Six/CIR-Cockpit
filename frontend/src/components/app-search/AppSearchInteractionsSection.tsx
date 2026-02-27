import type { Interaction } from '@/types';
import { ClipboardList } from 'lucide-react';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import { formatDate } from '@/utils/date/formatDate';

type AppSearchInteractionsSectionProps = {
  interactions: Interaction[];
  onOpenInteraction: (interaction: Interaction) => void;
};

const AppSearchInteractionsSection = ({ interactions, onOpenInteraction }: AppSearchInteractionsSectionProps) => {
  if (interactions.length === 0) return null;

  return (
    <CommandGroup heading="Interactions">
      {interactions.map((interaction) => (
        <CommandItem
          key={interaction.id}
          value={`${interaction.company_name} ${interaction.subject ?? ''} ${interaction.contact_name ?? ''} ${interaction.order_ref ?? ''}`}
          onSelect={() => onOpenInteraction(interaction)}
          className="gap-3 px-3 py-2"
          data-testid={`app-search-interaction-${interaction.id}`}
        >
          <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {interaction.company_name}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{interaction.subject}</span>
              <span>•</span>
              <span className="truncate">{interaction.contact_name}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <span className="text-xs text-muted-foreground/80">{formatDate(interaction.created_at)}</span>
            {interaction.order_ref && (
              <span className="rounded bg-muted px-1.5 text-xs font-mono text-muted-foreground">
                #{interaction.order_ref}
              </span>
            )}
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

export default AppSearchInteractionsSection;
