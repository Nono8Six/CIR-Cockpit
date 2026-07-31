import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { filterAppCommands, type AppCommand } from '@/app/appCommands';
import {
  APP_SEARCH_SCOPE_PREFIXES,
  applyAppSearchScope,
  parseAppSearchQuery,
  type AppSearchScope
} from '@/app/useAppSearchData';
import type { Entity, EntityContact, Interaction } from '@/types';
import { handleUiError } from '@/services/errors/handleUiError';
import { Button } from './ui/inputs/basic/Button';
import { Kbd } from './ui/data-display/Kbd';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
  CommandLoading
} from './ui/inputs/selects/Command';
import { cn } from '@/lib/utils';
import type { ConvertClientEntity } from './ConvertClientDialog';
import AppSearchResults from './app-search/AppSearchResults';
import AppSearchCommandsSection from './app-search/AppSearchCommandsSection';
import AppSearchEmptyState from './app-search/AppSearchEmptyState';
import AppSearchFooter from './app-search/AppSearchFooter';
import InteractionSearchRecents from './interaction-search/InteractionSearchRecents';

type AppSearchViewState = 'loading' | 'error' | 'idle' | 'empty' | 'results';

const SEARCH_SCOPE_CHIPS: Array<{
  label: string;
  scope: Exclude<AppSearchScope, 'all'>;
}> = [
  { label: 'Commandes', scope: 'commands' },
  { label: 'Contacts', scope: 'contacts' },
  { label: 'Interactions', scope: 'interactions' },
  { label: 'Clients', scope: 'clients' }
];

const CHIP_CLASSES = 'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type AppSearchOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  commands: AppCommand[];
  recentEntities: Entity[];
  includeArchived: boolean;
  onIncludeArchivedChange: (includeArchived: boolean) => void;
  filteredInteractions: Interaction[];
  filteredClients: Entity[];
  filteredProspects: Entity[];
  filteredContacts: EntityContact[];
  hasSearchResults: boolean;
  isEntitySearchLoading: boolean;
  entitySearchError: unknown;
  onRetrySearch?: () => Promise<unknown>;
  entityNameById: Map<string, string>;
  onOpenInteraction: (interaction: Interaction) => void;
  onFocusClient: (clientId: string, contactId?: string | null, clientNumber?: string | null) => void;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  onCreateEntity: () => void;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
};

const getAppSearchViewState = ({
  query,
  isLoading,
  hasError,
  hasResults
}: {
  query: string;
  isLoading: boolean;
  hasError: boolean;
  hasResults: boolean;
}): AppSearchViewState => {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  if (query.trim().length === 0) return 'idle';
  if (!hasResults) return 'empty';
  return 'results';
};

const AppSearchOverlay = ({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  commands,
  recentEntities,
  includeArchived,
  onIncludeArchivedChange,
  filteredInteractions,
  filteredClients,
  filteredProspects,
  filteredContacts,
  hasSearchResults,
  isEntitySearchLoading,
  entitySearchError,
  onRetrySearch,
  entityNameById,
  onOpenInteraction,
  onFocusClient,
  onRequestConvert,
  onCreateEntity,
  footerLeft,
  footerRight
}: AppSearchOverlayProps) => {
  const isErrorState = Boolean(entitySearchError);
  const { normalizedQuery, scope } = parseAppSearchQuery(searchQuery);
  // Les commandes et les recents restent affiches tant que rien n'est tape :
  // l'index d'entites n'est charge qu'a l'ouverture et ne doit pas masquer l'etat initial.
  const isEntityScope = scope !== 'commands' && normalizedQuery.trim().length > 0;
  // La palette reste une recherche : a l'ouverture elle ne propose que les actions
  // de creation. La navigation, qui double le menu de gauche, n'apparait que si
  // l'utilisateur la demande (prefixe « > ») ou si sa frappe nomme une section.
  const visibleCommands = useMemo(() => {
    if (scope === 'commands') {
      return filterAppCommands(commands, normalizedQuery);
    }
    if (scope !== 'all') return [];
    if (normalizedQuery.trim().length === 0) {
      return commands.filter((command) => command.group === 'creation');
    }
    return filterAppCommands(commands, normalizedQuery);
  }, [commands, normalizedQuery, scope]);
  const viewState = getAppSearchViewState({
    query: normalizedQuery,
    isLoading: isEntitySearchLoading && isEntityScope,
    hasError: isErrorState && isEntityScope,
    hasResults: hasSearchResults || visibleCommands.length > 0
  });

  const statusMessage = viewState === 'loading'
    ? 'Chargement de la recherche globale.'
    : viewState === 'error'
      ? 'Recherche indisponible.'
      : viewState === 'idle'
        ? 'Commencez à taper pour rechercher, ou choisissez une commande.'
        : viewState === 'results'
          ? 'Résultats disponibles.'
          : 'Aucun résultat trouvé.';

  const handleRetrySearch = useCallback(() => {
    if (!onRetrySearch) return;
    void onRetrySearch().catch((error) => {
      handleUiError(error, 'Impossible de relancer la recherche globale.', {
        source: 'AppSearchOverlay.retrySearch'
      });
    });
  }, [onRetrySearch]);

  const handleFocusClient = useCallback((clientId: string, contactId?: string | null, clientNumber?: string | null) => {
    try {
      onFocusClient(clientId, contactId, clientNumber);
    } catch (error) {
      handleUiError(error, "Impossible d'ouvrir le client.", {
        source: 'AppSearchOverlay.focusClient'
      });
    }
  }, [onFocusClient]);

  const handleSelectRecent = useCallback((entity: Entity) => {
    handleFocusClient(entity.id, null, entity.client_number);
  }, [handleFocusClient]);

  const handleOpenInteraction = useCallback((interaction: Interaction) => {
    try {
      onOpenInteraction(interaction);
    } catch (error) {
      handleUiError(error, "Impossible d'ouvrir l'interaction.", {
        source: 'AppSearchOverlay.openInteraction'
      });
    }
  }, [onOpenInteraction]);

  const handleRequestConvert = useCallback((entity: ConvertClientEntity) => {
    try {
      onRequestConvert(entity);
    } catch (error) {
      handleUiError(error, 'Impossible de convertir ce prospect.', {
        source: 'AppSearchOverlay.convertProspect'
      });
    }
  }, [onRequestConvert]);

  const handleRunCommand = useCallback((command: AppCommand) => {
    try {
      command.run();
    } catch (error) {
      handleUiError(error, "Impossible d'exécuter cette commande.", {
        source: 'AppSearchOverlay.runCommand'
      });
    }
  }, []);

  const handleCreateEntity = useCallback(() => {
    try {
      onCreateEntity();
    } catch (error) {
      handleUiError(error, 'Impossible d’ouvrir la création de fiche.', {
        source: 'AppSearchOverlay.createEntity'
      });
    }
  }, [onCreateEntity]);

  // Le declencheur est memorise a l'ouverture puis refocalise a la fermeture :
  // sans cela, Escape renvoie le focus sur le body et la navigation clavier repart de zero.
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      const activeElement = document.activeElement;
      triggerRef.current = activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;
    }
  }, [open]);

  const handleCloseAutoFocus = useCallback((event: Event) => {
    const trigger = triggerRef.current;
    if (!trigger?.isConnected) return;
    event.preventDefault();
    trigger.focus();
  }, []);

  const handleScopeChipClick = useCallback((nextScope: Exclude<AppSearchScope, 'all'>) => {
    onSearchQueryChange(
      scope === nextScope
        ? applyAppSearchScope('all', searchQuery)
        : applyAppSearchScope(nextScope, searchQuery)
    );
  }, [onSearchQueryChange, scope, searchQuery]);

  const handleClearScope = useCallback(() => {
    onSearchQueryChange(applyAppSearchScope('all', searchQuery));
  }, [onSearchQueryChange, searchQuery]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={handleCloseAutoFocus}
      className="w-[calc(100vw-1rem)] max-w-3xl border-border p-0 shadow-xl sm:w-[min(100vw-2rem,48rem)]"
      overlayClassName="bg-foreground/30 backdrop-blur-[2px]"
    >
      <Command
        shouldFilter={false}
        loop
        className="rounded-none bg-card"
        data-testid="app-search-command"
      >
        <CommandInput
          value={searchQuery}
          onValueChange={onSearchQueryChange}
          placeholder="Rechercher un client, une interaction, un contact, ou taper > pour les commandes…"
          autoComplete="off"
          name="global-search"
          aria-label="Rechercher globalement"
          data-testid="app-search-input"
          className="text-sm sm:text-base"
        />
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/30 overflow-x-auto hide-scrollbar">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap mr-1">Filtres</span>
          <div className="flex gap-2">
            {SEARCH_SCOPE_CHIPS.map((chip) => {
              const isActive = scope === chip.scope;

              return (
                <button
                  key={chip.scope}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleScopeChipClick(chip.scope)}
                  className={cn(
                    CHIP_CLASSES,
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Kbd className="text-[11px]">{APP_SEARCH_SCOPE_PREFIXES[chip.scope]}</Kbd>
                  {chip.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={includeArchived}
              onClick={() => onIncludeArchivedChange(!includeArchived)}
              data-testid="app-search-archived-toggle"
              className={cn(
                CHIP_CLASSES,
                includeArchived
                  ? 'border-primary/30 bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Archivés inclus
            </button>
          </div>
        </div>
        <span aria-live="polite" className="sr-only" data-testid="app-search-status-live">
          {statusMessage}
        </span>
        {viewState === 'idle' && recentEntities.length > 0 ? (
          <InteractionSearchRecents recents={recentEntities} onSelectEntity={handleSelectRecent} />
        ) : null}
        <CommandList className="max-h-[min(66vh,30rem)] overflow-x-hidden px-1 py-2" data-testid="app-search-list">
          {viewState === 'loading' && (
            <CommandLoading className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Chargement des résultats…
            </CommandLoading>
          )}
          {viewState === 'error' && (
            <CommandEmpty className="space-y-3 px-4 py-8">
              <div className="flex items-center justify-center gap-2 text-sm text-warning-foreground">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Recherche indisponible. Veuillez réessayer.
              </div>
              {onRetrySearch && (
                <Button type="button" size="sm" variant="outline" onClick={handleRetrySearch}>
                  Réessayer
                </Button>
              )}
            </CommandEmpty>
          )}
          {(viewState === 'idle' || viewState === 'results') && (
            <AppSearchCommandsSection commands={visibleCommands} onRunCommand={handleRunCommand} />
          )}
          {viewState === 'empty' && (
            <AppSearchEmptyState
              query={normalizedQuery}
              isScoped={scope !== 'all'}
              includeArchived={includeArchived}
              onCreateEntity={handleCreateEntity}
              onIncludeArchived={() => onIncludeArchivedChange(true)}
              onClearScope={handleClearScope}
            />
          )}
          {viewState === 'results' && scope !== 'commands' && (
            <AppSearchResults
              filteredInteractions={filteredInteractions}
              filteredClients={filteredClients}
              filteredProspects={filteredProspects}
              filteredContacts={filteredContacts}
              entityNameById={entityNameById}
              onOpenInteraction={handleOpenInteraction}
              onFocusClient={handleFocusClient}
              onRequestConvert={handleRequestConvert}
            />
          )}
        </CommandList>
        <div className="border-t border-border/70 bg-surface-1/90">
          <AppSearchFooter footerLeft={footerLeft} footerRight={footerRight} />
        </div>
      </Command>
    </CommandDialog>
  );
};

export default memo(AppSearchOverlay);
