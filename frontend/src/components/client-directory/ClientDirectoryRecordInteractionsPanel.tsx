import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, ListFilter, Search } from 'lucide-react';

import type { EntityInteractionsScope } from '@/services/interactions/getInteractionsByEntity';
import type { Interaction } from '@/types';
import { Button } from '../ui/inputs/basic/Button';
import { Input } from '../ui/inputs/basic/Input';
import { Tabs, TabsList, TabsTrigger } from '../ui/navigation/Tabs';
import ClientDirectoryInteractionSection, {
  type InteractionListState
} from './ClientDirectoryInteractionSection';

export interface ClientDirectoryRecordInteractionsPanelProps {
  filters: {
    scope: EntityInteractionsScope;
    searchText: string;
    onScopeChange: (scope: EntityInteractionsScope) => void;
    onSearchTextChange: (value: string) => void;
  };
  list: InteractionListState;
  onDeleteInteraction: (interaction: Interaction) => void;
  onOpenInteraction: (interaction: Interaction) => void;
}

const scopeLabels = {
  all: 'Toutes',
  closed: 'Terminées',
  open: 'En cours'
} satisfies Record<EntityInteractionsScope, string>;

const emptyLabels = {
  all: 'Aucune interaction pour cette fiche.',
  closed: 'Aucune interaction passée pour cette fiche.',
  open: 'Aucune demande en cours pour cette fiche.'
} satisfies Record<EntityInteractionsScope, string>;

const scopeIcons = {
  all: ListFilter,
  closed: CheckCircle2,
  open: Clock3
} satisfies Record<EntityInteractionsScope, typeof ListFilter>;

/**
 * Renders the interactions container for a client record.
 * Displays filter tabs (en cours, historique, toutes), a text search input,
 * and a list of interactions in a timeline view, with monospace pagination controls.
 *
 * @param props - The component properties.
 * @param props.filters - Filters state and callbacks.
 * @param props.list - Interactions list state, pagination, and error/loading states.
 * @param props.onDeleteInteraction - Callback to delete an interaction.
 * @param props.onOpenInteraction - Callback to open/view an interaction.
 * @returns The rendered JSX element.
 */
const ClientDirectoryRecordInteractionsPanel = ({
  filters,
  list,
  onDeleteInteraction,
  onOpenInteraction
}: ClientDirectoryRecordInteractionsPanelProps) => {
  const ActiveIcon = scopeIcons[filters.scope];
  const visibleCount = filters.searchText.trim() ? list.visibleInteractions : list.totalInteractions;
  const countLabel = `${visibleCount} élément${visibleCount > 1 ? 's' : ''}`;

  return (
    <div className="space-y-4">
      {/* Filters & Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded bg-neutral-50 border border-neutral-200 text-neutral-500">
            <ActiveIcon size={12} strokeWidth={1.5} />
          </span>
          <div>
            <h3 className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              Interactions
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {scopeLabels[filters.scope]} · {countLabel}
              {list.isRefreshing ? ' · Actualisation…' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={filters.scope}
            onValueChange={(value) => filters.onScopeChange(value as EntityInteractionsScope)}
          >
            <TabsList className="flex h-8 items-center bg-neutral-100/80 p-0.5 rounded border border-neutral-200">
              {(['open', 'closed', 'all'] satisfies EntityInteractionsScope[]).map((scope) => (
                <TabsTrigger
                   key={scope}
                   value={scope}
                   className="px-2.5 py-1 text-[11px] rounded-sm data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm text-neutral-500 hover:text-neutral-800 font-semibold"
                >
                  {scopeLabels[scope]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
            <Input
              id="directory-record-interactions-search"
              name="directory-record-interactions-search"
              aria-label="Filtrer les interactions"
              className="pl-8 h-8 text-xs border-neutral-200/80 focus-visible:ring-neutral-400/50 bg-white text-neutral-900 placeholder-neutral-400 font-medium"
              density="dense"
              placeholder="Rechercher..."
              value={filters.searchText}
              onChange={(event) => filters.onSearchTextChange(event.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Interactions Feed Content */}
      <div className="pt-2">
        <ClientDirectoryInteractionSection
          emptyLabel={emptyLabels[filters.scope]}
          list={list}
          onDeleteInteraction={onDeleteInteraction}
          onOpenInteraction={onOpenInteraction}
        />
      </div>

      {/* Footer Pagination */}
      <div className="flex items-center justify-between gap-3 border-t border-neutral-250/70 pt-3.5">
        <p className="text-[11px] text-neutral-500 font-medium font-mono">
          Page {list.currentPage}/{list.totalPages}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7 border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-md"
            aria-label="Page précédente des interactions"
            disabled={list.currentPage <= 1}
            onClick={list.onPreviousPage}
          >
            <ChevronLeft size={13} strokeWidth={1.5} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7 border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-md"
            aria-label="Page suivante des interactions"
            disabled={list.currentPage >= list.totalPages}
            onClick={list.onNextPage}
          >
            <ChevronRight size={13} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientDirectoryRecordInteractionsPanel;
