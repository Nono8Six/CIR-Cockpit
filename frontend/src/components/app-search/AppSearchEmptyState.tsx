import { Archive, FilterX, Plus, SearchX } from 'lucide-react';

import { CommandGroup, CommandItem } from '../ui/inputs/selects/Command';

type AppSearchEmptyStateProps = {
  query: string;
  isScoped: boolean;
  includeArchived: boolean;
  onCreateEntity: () => void;
  onIncludeArchived: () => void;
  onClearScope: () => void;
};

const AppSearchEmptyState = ({
  query,
  isScoped,
  includeArchived,
  onCreateEntity,
  onIncludeArchived,
  onClearScope
}: AppSearchEmptyStateProps) => (
  <div data-testid="app-search-empty">
    <div className="flex items-start gap-3 px-4 py-4">
      <SearchX className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Aucun résultat pour «&nbsp;<span className="font-medium text-foreground">{query}</span>&nbsp;».
        Vous pouvez continuer autrement&nbsp;:
      </p>
    </div>
    <CommandGroup heading="Suites possibles">
      <CommandItem
        value="creer une fiche client prospect"
        onSelect={onCreateEntity}
        className="gap-3 px-3 py-2"
        data-testid="app-search-empty-create"
      >
        <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          Créer une fiche pour «&nbsp;{query}&nbsp;»
        </span>
      </CommandItem>
      {!includeArchived ? (
        <CommandItem
          value="elargir archives archivees"
          onSelect={onIncludeArchived}
          className="gap-3 px-3 py-2"
          data-testid="app-search-empty-archived"
        >
          <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            Élargir la recherche aux fiches archivées
          </span>
        </CommandItem>
      ) : null}
      {isScoped ? (
        <CommandItem
          value="effacer les filtres"
          onSelect={onClearScope}
          className="gap-3 px-3 py-2"
          data-testid="app-search-empty-clear-scope"
        >
          <FilterX className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            Effacer le filtre et chercher partout
          </span>
        </CommandItem>
      ) : null}
    </CommandGroup>
  </div>
);

export default AppSearchEmptyState;
