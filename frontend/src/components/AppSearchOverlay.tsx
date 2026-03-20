import { memo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { applyAppSearchScope, parseAppSearchQuery, type AppSearchScope } from '@/app/useAppSearchData';
import type { Entity, EntityContact, Interaction } from '@/types';
import { handleUiError } from '@/services/errors/handleUiError';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
  CommandLoading
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { ConvertClientEntity } from './ConvertClientDialog';
import AppSearchResults from './app-search/AppSearchResults';
import AppSearchFooter from './app-search/AppSearchFooter';

type AppSearchViewState = 'loading' | 'error' | 'idle' | 'empty' | 'results';

const SEARCH_SCOPE_CHIPS: Array<{
  accent: '@' | '#' | '!';
  label: string;
  scope: Exclude<AppSearchScope, 'all'>;
}> = [
  { accent: '@', label: 'Contact', scope: 'contacts' },
  { accent: '#', label: 'Interaction', scope: 'interactions' },
  { accent: '!', label: 'Client', scope: 'clients' }
];

type AppSearchOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
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
  onFocusClient: (clientId: string, contactId?: string | null) => void;
  onRequestConvert: (entity: ConvertClientEntity) => void;
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
  footerLeft,
  footerRight
}: AppSearchOverlayProps) => {
  const isErrorState = Boolean(entitySearchError);
  const { normalizedQuery, scope } = parseAppSearchQuery(searchQuery);
  const viewState = getAppSearchViewState({
    query: normalizedQuery,
    isLoading: isEntitySearchLoading,
    hasError: isErrorState,
    hasResults: hasSearchResults
  });

  const statusMessage = viewState === 'loading'
    ? 'Chargement de la recherche globale.'
    : viewState === 'error'
      ? 'Recherche indisponible.'
      : viewState === 'idle'
        ? 'Commencez a taper pour rechercher.'
        : viewState === 'results'
          ? 'Resultats disponibles.'
          : 'Aucun resultat trouve.';

  const handleRetrySearch = useCallback(() => {
    if (!onRetrySearch) return;
    void onRetrySearch().catch((error) => {
      handleUiError(error, 'Impossible de relancer la recherche globale.', {
        source: 'AppSearchOverlay.retrySearch'
      });
    });
  }, [onRetrySearch]);

  const handleFocusClient = useCallback((clientId: string, contactId?: string | null) => {
    try {
      onFocusClient(clientId, contactId);
    } catch (error) {
      handleUiError(error, "Impossible d'ouvrir le client.", {
        source: 'AppSearchOverlay.focusClient'
      });
    }
  }, [onFocusClient]);

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

  const handleScopeChipClick = useCallback((nextScope: Exclude<AppSearchScope, 'all'>) => {
    onSearchQueryChange(
      scope === nextScope
        ? applyAppSearchScope('all', searchQuery)
        : applyAppSearchScope(nextScope, searchQuery)
    );
  }, [onSearchQueryChange, scope, searchQuery]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
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
          placeholder="Rechercher un client, une interaction, un contact…"
          autoComplete="off"
          name="global-search"
          aria-label="Rechercher globalement"
          data-testid="app-search-input"
          className="text-sm sm:text-base"
        />
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/30 overflow-x-auto hide-scrollbar">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap mr-1">Filtres</span>
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
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="text-primary font-bold">{chip.accent}</span>
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
        <span aria-live="polite" className="sr-only" data-testid="app-search-status-live">
          {statusMessage}
        </span>
        <CommandList className="max-h-[min(66vh,30rem)] overflow-x-hidden px-1 py-2" data-testid="app-search-list">
          {viewState === 'loading' && (
            <CommandLoading className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Chargement des resultats…
            </CommandLoading>
          )}
          {viewState === 'error' && (
            <CommandEmpty className="space-y-3 px-4 py-8">
              <div className="flex items-center justify-center gap-2 text-sm text-warning-foreground">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Recherche indisponible. Veuillez reessayer.
              </div>
              {onRetrySearch && (
                <Button type="button" size="sm" variant="outline" onClick={handleRetrySearch}>
                  Reessayer
                </Button>
              )}
            </CommandEmpty>
          )}
          {viewState === 'idle' && (
            <CommandEmpty className="px-4 py-8 text-sm text-muted-foreground">
              Commencez a taper pour rechercher…
            </CommandEmpty>
          )}
          {viewState === 'empty' && (
            <CommandEmpty className="px-4 py-8 text-sm text-muted-foreground">
              Aucun resultat trouve.
            </CommandEmpty>
          )}
          {viewState === 'results' && (
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
