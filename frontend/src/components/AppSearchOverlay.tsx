import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { AlertTriangle, Archive, Loader2 } from 'lucide-react';

import { filterAppCommands, type AppCommand } from '@/app/appCommands';
import { applyAppSearchScope, parseAppSearchQuery } from '@/app/useAppSearchData';
import type { Entity, EntityContact, Interaction } from '@/types';
import { handleUiError } from '@/services/errors/handleUiError';
import { Button } from './ui/inputs/basic/Button';
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
import AppSearchRecentsSection from './app-search/AppSearchRecentsSection';
import AppSearchScopeToken from './app-search/AppSearchScopeToken';

type AppSearchViewState = 'loading' | 'error' | 'idle' | 'empty' | 'results';

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
  const hasQuery = normalizedQuery.trim().length > 0;
  // Les commandes et les recents restent affiches tant que rien n'est tape :
  // l'index d'entites n'est charge qu'a l'ouverture et ne doit pas masquer l'etat initial.
  const isEntityScope = scope !== 'commands' && hasQuery;
  // La palette reste une recherche : a l'ouverture elle ne propose que les actions
  // de creation. La navigation, qui double le menu de gauche, n'apparait que si
  // l'utilisateur la demande (prefixe « > ») ou si sa frappe nomme une section.
  const visibleCommands = useMemo(() => {
    if (scope === 'commands') {
      return filterAppCommands(commands, normalizedQuery);
    }
    if (scope !== 'all') return [];
    if (!hasQuery) {
      return commands.filter((command) => command.group === 'creation');
    }
    return filterAppCommands(commands, normalizedQuery);
  }, [commands, hasQuery, normalizedQuery, scope]);
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
      handleUiError(error, "Impossible d'ouvrir la création de fiche.", {
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

  const handleClearScope = useCallback(() => {
    onSearchQueryChange(applyAppSearchScope('all', searchQuery));
  }, [onSearchQueryChange, searchQuery]);

  // Le champ n'affiche jamais le prefixe : il est promu en jeton et reapplique ici.
  const handleInputValueChange = useCallback((value: string) => {
    onSearchQueryChange(scope === 'all' ? value : applyAppSearchScope(scope, value));
  }, [onSearchQueryChange, scope]);

  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace' || scope === 'all' || normalizedQuery.length > 0) return;
    event.preventDefault();
    handleClearScope();
  }, [handleClearScope, normalizedQuery.length, scope]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={handleCloseAutoFocus}
      showCloseButton={false}
      className="w-[calc(100vw-1rem)] max-w-2xl gap-0 rounded-lg border-border p-0 shadow-soft sm:w-[min(100vw-2rem,40rem)]"
      overlayClassName="bg-foreground/25 backdrop-blur-[2px]"
    >
      <Command
        shouldFilter={false}
        loop
        className="rounded-none bg-card"
        data-testid="app-search-command"
      >
        <CommandInput
          value={normalizedQuery}
          onValueChange={handleInputValueChange}
          onKeyDown={handleInputKeyDown}
          placeholder={scope === 'all' ? 'Rechercher ou lancer une action…' : 'Affiner la recherche…'}
          autoComplete="off"
          name="global-search"
          aria-label="Rechercher globalement"
          data-testid="app-search-input"
          wrapperClassName="border-border px-3"
          className="h-12 text-[15px]"
          leading={scope !== 'all' ? (
            <AppSearchScopeToken scope={scope} onClear={handleClearScope} />
          ) : undefined}
          trailing={(
            <button
              type="button"
              aria-pressed={includeArchived}
              onClick={() => onIncludeArchivedChange(!includeArchived)}
              data-testid="app-search-archived-toggle"
              title="Inclure les fiches archivées dans la recherche"
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                includeArchived
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
              )}
            >
              <Archive className="size-3.5" aria-hidden="true" />
              Archivés
            </button>
          )}
        />
        <span aria-live="polite" className="sr-only" data-testid="app-search-status-live">
          {statusMessage}
        </span>
        <CommandList className="max-h-[min(60vh,26rem)] overflow-x-hidden pb-2" data-testid="app-search-list">
          {viewState === 'loading' && (
            <CommandLoading className="flex items-center justify-center gap-2 py-8 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Recherche en cours…
            </CommandLoading>
          )}
          {viewState === 'error' && (
            <CommandEmpty className="space-y-3 px-4 py-8">
              <div className="flex items-center justify-center gap-2 text-[13px] text-warning-foreground">
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
          {viewState === 'idle' && scope === 'all' && (
            <AppSearchRecentsSection recents={recentEntities} onSelectEntity={handleSelectRecent} />
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
        <div className="border-t border-border-subtle bg-surface-1">
          <AppSearchFooter
            showPrefixLegend={!hasQuery && scope === 'all'}
            footerLeft={footerLeft}
            footerRight={footerRight}
          />
        </div>
      </Command>
    </CommandDialog>
  );
};

export default memo(AppSearchOverlay);
