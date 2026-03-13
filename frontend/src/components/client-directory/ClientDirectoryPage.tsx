import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type {
  DirectoryListInput,
  DirectorySavedView,
  DirectorySavedViewSaveInput
} from 'shared/schemas/directory.schema';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAgencies } from '@/hooks/useAgencies';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDeleteDirectorySavedView } from '@/hooks/useDeleteDirectorySavedView';
import { useDirectoryOptions } from '@/hooks/useDirectoryOptions';
import { useDirectoryPage } from '@/hooks/useDirectoryPage';
import { useDirectorySavedViews } from '@/hooks/useDirectorySavedViews';
import { useSaveDirectorySavedView } from '@/hooks/useSaveDirectorySavedView';
import { useSetDefaultDirectorySavedView } from '@/hooks/useSetDefaultDirectorySavedView';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import ClientDirectoryFilters from './ClientDirectoryFilters';
import ClientDirectoryTable from './ClientDirectoryTable';
import DirectorySavedViewsBar from './DirectorySavedViewsBar';
import DirectoryActiveFilters from './directory-filters/DirectoryActiveFilters';
import {
  DEFAULT_DIRECTORY_DENSITY,
  DEFAULT_DIRECTORY_SEARCH,
  hasActiveDirectoryFilters,
  toDirectorySavedViewState,
  toDirectorySearchFromViewState
} from './clientDirectorySearch';
import {
  buildDirectoryViewOptionColumns,
  MOBILE_DIRECTORY_COLUMN_VISIBILITY
} from './directoryGridConfig';

const MOBILE_DIRECTORY_QUERY = '(max-width: 639px)';
const DIRECTORY_OPTIONS_FETCH_DELAY_MS = 150;

type ColumnVisibilityMode = 'responsive' | 'custom' | 'saved';

const hasExplicitDirectoryState = (search: DirectoryListInput): boolean => (
  Boolean(search.q)
  || search.type !== DEFAULT_DIRECTORY_SEARCH.type
  || search.agencyIds.length > 0
  || search.departments.length > 0
  || Boolean(search.city)
  || search.cirCommercialIds.length > 0
  || search.includeArchived !== DEFAULT_DIRECTORY_SEARCH.includeArchived
  || search.page !== DEFAULT_DIRECTORY_SEARCH.page
  || search.pageSize !== DEFAULT_DIRECTORY_SEARCH.pageSize
  || JSON.stringify(search.sorting) !== JSON.stringify(DEFAULT_DIRECTORY_SEARCH.sorting)
);

const getIsMobileDirectoryViewport = (): boolean =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(MOBILE_DIRECTORY_QUERY).matches;

const getResponsiveDirectoryColumnVisibility = (isMobile: boolean): VisibilityState =>
  isMobile ? MOBILE_DIRECTORY_COLUMN_VISIBILITY : {};

const ClientDirectoryPage = () => {
  const sessionState = useAppSessionStateContext();
  const navigate = useNavigate({ from: '/clients/' });
  const search = useSearch({ from: '/clients/' });
  const userRole = sessionState.profile?.role ?? 'tcs';
  const activeAgencyId = sessionState.activeAgencyId;
  const effectiveSearch = useMemo<DirectoryListInput>(
    () => ({
      ...search,
      agencyIds: userRole === 'super_admin'
        ? search.agencyIds
        : activeAgencyId ? [activeAgencyId] : []
    }),
    [activeAgencyId, search, userRole]
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    getResponsiveDirectoryColumnVisibility(getIsMobileDirectoryViewport())
  );
  const [columnVisibilityMode, setColumnVisibilityMode] = useState<ColumnVisibilityMode>('responsive');
  const [density, setDensity] = useState(DEFAULT_DIRECTORY_DENSITY);
  const [filtersSyncToken, setFiltersSyncToken] = useState(0);
  const routeSearchValue = effectiveSearch.q ?? '';
  const [searchDraft, setSearchDraft] = useState(routeSearchValue);
  const directoryOptionsType = effectiveSearch.type;
  const directoryOptionsIncludeArchived = effectiveSearch.includeArchived;
  const directoryOptionsAgencyIdsKey = effectiveSearch.agencyIds.join(',');
  const directoryOptionsAgencyIds = useMemo(
    () => directoryOptionsAgencyIdsKey ? directoryOptionsAgencyIdsKey.split(',') : [],
    [directoryOptionsAgencyIdsKey]
  );
  const directoryOptionsScope = useMemo(
    () => ({
      type: directoryOptionsType,
      agencyIds: directoryOptionsAgencyIds,
      includeArchived: directoryOptionsIncludeArchived
    }),
    [directoryOptionsAgencyIds, directoryOptionsIncludeArchived, directoryOptionsType]
  );
  const [directoryOptionsInput, setDirectoryOptionsInput] = useState(directoryOptionsScope);
  const [isDirectoryOptionsEnabled, setIsDirectoryOptionsEnabled] = useState(false);
  const hasAppliedDefaultViewRef = useRef(false);

  const deferredSearchDraft = useDeferredValue(searchDraft);
  const normalizedSearchDraft = searchDraft.trim();
  const normalizedDeferredSearchDraft = deferredSearchDraft.trim();

  const querySearch = useMemo<DirectoryListInput>(
    () => ({
      ...effectiveSearch,
      q: normalizedDeferredSearchDraft || undefined
    }),
    [effectiveSearch, normalizedDeferredSearchDraft]
  );

  const uiSearch = useMemo<DirectoryListInput>(
    () => ({
      ...effectiveSearch,
      q: normalizedSearchDraft || undefined
    }),
    [effectiveSearch, normalizedSearchDraft]
  );

  useEffect(() => {
    setSearchDraft(routeSearchValue);
  }, [routeSearchValue]);

  useEffect(() => {
    setIsDirectoryOptionsEnabled(false);
    const timeoutId = window.setTimeout(() => {
      setDirectoryOptionsInput(directoryOptionsScope);
      setIsDirectoryOptionsEnabled(true);
    }, DIRECTORY_OPTIONS_FETCH_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [directoryOptionsScope]);

  const canLoadDirectory = Boolean(sessionState.session) && (userRole === 'super_admin' || Boolean(activeAgencyId));
  const directoryPageQuery = useDirectoryPage(querySearch, canLoadDirectory);
  const directoryOptionsQuery = useDirectoryOptions(
    directoryOptionsInput,
    canLoadDirectory && isDirectoryOptionsEnabled
  );
  const agenciesQuery = useAgencies(false, canLoadDirectory);
  const savedViewsQuery = useDirectorySavedViews(canLoadDirectory);
  const saveSavedViewMutation = useSaveDirectorySavedView();
  const deleteSavedViewMutation = useDeleteDirectorySavedView();
  const setDefaultSavedViewMutation = useSetDefaultDirectorySavedView();

  const totalResults = directoryPageQuery.data?.total ?? 0;
  const viewOptionColumns = useMemo(
    () => buildDirectoryViewOptionColumns(columnVisibility),
    [columnVisibility]
  );

  const applySavedViewUiState = (view: DirectorySavedView) => {
    setColumnVisibilityMode('saved');
    setColumnVisibility(view.state.columnVisibility);
    setDensity(view.state.density);
    setSearchDraft(view.state.q ?? '');
    setFiltersSyncToken((previous) => previous + 1);
  };

  useEffect(() => {
    if (columnVisibilityMode !== 'responsive' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_DIRECTORY_QUERY);
    const applyResponsiveVisibility = (matches: boolean) => {
      setColumnVisibility(getResponsiveDirectoryColumnVisibility(matches));
    };

    applyResponsiveVisibility(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      const handleChange = (event: MediaQueryListEvent) => applyResponsiveVisibility(event.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    const legacyHandler = (event: MediaQueryListEvent) => applyResponsiveVisibility(event.matches);
    mediaQuery.addListener(legacyHandler);
    return () => mediaQuery.removeListener(legacyHandler);
  }, [columnVisibilityMode]);

  useEffect(() => {
    if (hasAppliedDefaultViewRef.current || !savedViewsQuery.data) {
      return;
    }

    hasAppliedDefaultViewRef.current = true;
    if (hasExplicitDirectoryState(search)) {
      return;
    }

    const defaultView = savedViewsQuery.data.views.find((view) => view.is_default);
    if (!defaultView) {
      return;
    }

    applySavedViewUiState(defaultView);
    const nextSearch = toDirectorySearchFromViewState(defaultView.state);
    startTransition(() => {
      void navigate({
        search: () => ({
          ...nextSearch,
          agencyIds: userRole === 'super_admin'
            ? nextSearch.agencyIds
            : activeAgencyId ? [activeAgencyId] : []
        })
      });
    });
  }, [activeAgencyId, navigate, savedViewsQuery.data, search, userRole]);

  const handleSearchPatch = (patch: Partial<DirectoryListInput>) => {
    const nextSearchDraft = Object.prototype.hasOwnProperty.call(patch, 'q')
      ? (patch.q ?? '')
      : normalizedSearchDraft;

    if (Object.prototype.hasOwnProperty.call(patch, 'q')) {
      setSearchDraft(nextSearchDraft);
    }

    startTransition(() => {
      void navigate({
        search: (previous) => ({
          ...previous,
          q: nextSearchDraft || undefined,
          ...patch
        })
      });
    });
  };

  const handleApplySavedView = (view: DirectorySavedView) => {
    const nextSearch = toDirectorySearchFromViewState(view.state);
    applySavedViewUiState(view);
    startTransition(() => {
      void navigate({
        search: () => ({
          ...nextSearch,
          agencyIds: userRole === 'super_admin'
            ? nextSearch.agencyIds
            : activeAgencyId ? [activeAgencyId] : []
        })
      });
    });
  };

  const handleSaveView = async (input: DirectorySavedViewSaveInput): Promise<void> => {
    try {
      await saveSavedViewMutation.mutateAsync(input);
      notifySuccess(input.id ? 'Vue mise à jour.' : 'Vue sauvegardée.');
    } catch (error) {
      handleUiError(error, 'Impossible de sauvegarder la vue.');
    }
  };

  const handleDeleteView = async (viewId: string): Promise<void> => {
    try {
      await deleteSavedViewMutation.mutateAsync({ id: viewId });
      notifySuccess('Vue supprimée.');
    } catch (error) {
      handleUiError(error, 'Impossible de supprimer la vue.');
    }
  };

  const handleSetDefaultView = async (viewId: string): Promise<void> => {
    try {
      await setDefaultSavedViewMutation.mutateAsync({ id: viewId });
      notifySuccess('Vue par défaut enregistrée.');
    } catch (error) {
      handleUiError(error, 'Impossible de définir la vue par défaut.');
    }
  };

  const handleToggleColumn = (columnId: string) => {
    setColumnVisibilityMode('custom');
    setColumnVisibility((previous) => {
      const currentlyVisible = previous[columnId] !== false;
      return {
        ...previous,
        [columnId]: !currentlyVisible
      };
    });
  };

  const renderSavedViewsControl = () => (
    <DirectorySavedViewsBar
      views={savedViewsQuery.data?.views ?? []}
      currentState={toDirectorySavedViewState(uiSearch, columnVisibility, density)}
      isLoading={savedViewsQuery.isLoading}
      isMutating={
        saveSavedViewMutation.isPending
        || deleteSavedViewMutation.isPending
        || setDefaultSavedViewMutation.isPending
      }
      onApplyView={handleApplySavedView}
      onSaveView={handleSaveView}
      onDeleteView={handleDeleteView}
      onSetDefaultView={handleSetDefaultView}
    />
  );

  if (!canLoadDirectory) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Agence active requise pour afficher l’annuaire.
      </section>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <>
        <section className="flex min-h-0 flex-1 flex-col gap-2 px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="text-base font-semibold text-foreground sm:text-lg">Clients et prospects</h1>
              <span className="tabular-nums text-sm text-muted-foreground">
                {`${totalResults} résultat${totalResults > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void navigate({
                    to: '/clients/new',
                    search: () => effectiveSearch
                  });
                }}
              >
                <Plus className="size-4" />
                Nouvelle fiche
              </Button>
            </div>

            <div className="sm:hidden">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" aria-label="Ajouter un client ou un prospect">
                    <Plus className="size-4" />
                    Ajouter
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[220px] space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      void navigate({
                        to: '/clients/new',
                        search: () => effectiveSearch
                      });
                    }}
                  >
                    <Plus className="size-4" />
                    Nouvelle fiche
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm sm:rounded-xl">
            <div className="border-b border-border-subtle px-3 py-1.5">
              <ClientDirectoryFilters
                key={`directory-filters-${filtersSyncToken}`}
                search={uiSearch}
                cityDraftSeed={effectiveSearch.city ?? ''}
                searchDraft={searchDraft}
                agencies={agenciesQuery.data ?? []}
                commercials={directoryOptionsQuery.data?.commercials ?? []}
                departments={directoryOptionsQuery.data?.departments ?? []}
                canFilterAgency={userRole === 'super_admin' && (agenciesQuery.data?.length ?? 0) > 1}
                isFetching={directoryPageQuery.isFetching}
                density={density}
                viewOptionColumns={viewOptionColumns}
                renderSavedViews={renderSavedViewsControl}
                onToggleColumn={handleToggleColumn}
                onDensityChange={setDensity}
                onSearchDraftChange={setSearchDraft}
                onSearchPatch={handleSearchPatch}
                onReset={() => {
                  setSearchDraft('');
                  handleSearchPatch({
                    q: undefined,
                    type: 'all',
                    agencyIds: userRole === 'super_admin' ? [] : activeAgencyId ? [activeAgencyId] : [],
                    departments: [],
                    city: undefined,
                    cirCommercialIds: [],
                    includeArchived: false,
                    page: 1,
                    pageSize: DEFAULT_DIRECTORY_SEARCH.pageSize,
                    sorting: DEFAULT_DIRECTORY_SEARCH.sorting
                  });
                  setColumnVisibilityMode('responsive');
                  setColumnVisibility(getResponsiveDirectoryColumnVisibility(getIsMobileDirectoryViewport()));
                  setDensity(DEFAULT_DIRECTORY_DENSITY);
                  setFiltersSyncToken((previous) => previous + 1);
                }}
              />
            </div>

            {hasActiveDirectoryFilters(effectiveSearch) ? (
              <div className="border-b border-border/30 px-3 py-2">
                <DirectoryActiveFilters
                  search={uiSearch}
                  agencies={agenciesQuery.data ?? []}
                  commercials={directoryOptionsQuery.data?.commercials ?? []}
                  onRemove={handleSearchPatch}
                />
              </div>
            ) : null}

            <ClientDirectoryTable
              rows={directoryPageQuery.data?.rows ?? []}
              sorting={effectiveSearch.sorting}
              page={directoryPageQuery.data?.page ?? effectiveSearch.page}
              pageSize={directoryPageQuery.data?.page_size ?? effectiveSearch.pageSize}
              total={totalResults}
              isFetching={directoryPageQuery.isFetching}
              isInitialLoading={directoryPageQuery.isPending}
              columnVisibility={columnVisibility}
              density={density}
              onSortChange={(nextSorting) => handleSearchPatch({ sorting: nextSorting, page: 1 })}
              onPageChange={(page) => handleSearchPatch({ page })}
              onPageSizeChange={(nextPageSize) => handleSearchPatch({ pageSize: nextPageSize, page: 1 })}
              onOpenRecord={(row) => {
                if (row.client_number && row.entity_type === 'Client') {
                  void navigate({
                    to: '/clients/$clientNumber',
                    params: { clientNumber: row.client_number }
                  });
                  return;
                }

                void navigate({
                  to: '/clients/prospects/$prospectId',
                  params: { prospectId: row.id }
                });
              }}
            />
          </div>
        </section>
      </>
    </TooltipProvider>
  );
};

export default ClientDirectoryPage;
