import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

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
import type { ConvertClientEntity } from './ConvertClientDialog';
import AppSearchResults from './app-search/AppSearchResults';
import AppSearchFooter from './app-search/AppSearchFooter';

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
  const hasQuery = searchQuery.trim().length > 0;
  const isErrorState = Boolean(entitySearchError);

  const statusMessage = isEntitySearchLoading
    ? 'Chargement de la recherche globale.'
    : isErrorState
      ? 'Recherche indisponible.'
      : !hasQuery
        ? 'Commencez a taper pour rechercher.'
        : hasSearchResults
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

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="w-[calc(100vw-1rem)] max-w-3xl border-slate-200 p-0 shadow-xl sm:w-[min(100vw-2rem,48rem)]"
      overlayClassName="bg-slate-900/30 backdrop-blur-[2px]"
    >
      <Command
        shouldFilter={false}
        loop
        className="rounded-none bg-white"
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
        <span aria-live="polite" className="sr-only" data-testid="app-search-status-live">
          {statusMessage}
        </span>
        <CommandList className="max-h-[min(66vh,30rem)] overflow-x-hidden px-1 py-2" data-testid="app-search-list">
          {isEntitySearchLoading && (
            <CommandLoading className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Chargement des resultats…
            </CommandLoading>
          )}
          {!isEntitySearchLoading && isErrorState && (
            <CommandEmpty className="space-y-3 px-4 py-8">
              <div className="flex items-center justify-center gap-2 text-sm text-amber-700">
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
          {!isEntitySearchLoading && !isErrorState && !hasQuery && (
            <CommandEmpty className="px-4 py-8 text-sm text-slate-500">
              Commencez a taper pour rechercher…
            </CommandEmpty>
          )}
          {!isEntitySearchLoading && !isErrorState && hasQuery && !hasSearchResults && (
            <CommandEmpty className="px-4 py-8 text-sm text-slate-500">
              Aucun resultat trouve.
            </CommandEmpty>
          )}
          {!isEntitySearchLoading && !isErrorState && hasQuery && hasSearchResults && (
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
        <div className="border-t border-slate-100 bg-slate-50/90">
          <AppSearchFooter footerLeft={footerLeft} footerRight={footerRight} />
        </div>
      </Command>
    </CommandDialog>
  );
};

export default AppSearchOverlay;
