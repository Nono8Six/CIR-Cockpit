import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import type {
  DirectoryOptionsFacetInput,
  DirectorySearchState,
  DirectorySavedView,
  DirectorySavedViewSaveInput,
} from 'shared/schemas/directory.schema';

import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDeleteDirectorySavedView } from '@/hooks/useDeleteDirectorySavedView';
import { useDirectoryOptionAgencies } from '@/hooks/useDirectoryOptionAgencies';
import { useDirectoryOptionCommercials } from '@/hooks/useDirectoryOptionCommercials';
import { useDirectoryOptionDepartments } from '@/hooks/useDirectoryOptionDepartments';
import { useDirectoryPage } from '@/hooks/useDirectoryPage';
import { useDirectorySavedViews } from '@/hooks/useDirectorySavedViews';
import { useSaveDirectorySavedView } from '@/hooks/useSaveDirectorySavedView';
import { useSetDefaultDirectorySavedView } from '@/hooks/useSetDefaultDirectorySavedView';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';

import {
  DEFAULT_DIRECTORY_DENSITY,
  DEFAULT_DIRECTORY_SEARCH,
  toDirectoryListInput,
  toDirectorySavedViewState,
  toDirectorySearchFromViewState,
} from './clientDirectorySearch';
import {
  buildDirectoryViewOptionColumns,
  MOBILE_DIRECTORY_COLUMN_VISIBILITY,
} from './directoryGridConfig';
import { getIsMobileDirectoryViewport, MOBILE_DIRECTORY_QUERY } from './directoryViewport';

const DIRECTORY_OPTIONS_FETCH_DELAY_MS = 150;

type ColumnVisibilityMode = 'responsive' | 'custom' | 'saved';
type DirectoryOptionRequest = 'agencies' | 'commercials' | 'departments';

const hasExplicitDirectoryState = (search: DirectorySearchState): boolean =>
  Boolean(search.q) ||
  search.type !== DEFAULT_DIRECTORY_SEARCH.type ||
  search.scope.mode !== DEFAULT_DIRECTORY_SEARCH.scope.mode ||
  search.departments.length > 0 ||
  Boolean(search.city) ||
  search.cirCommercialIds.length > 0 ||
  search.includeArchived !== DEFAULT_DIRECTORY_SEARCH.includeArchived ||
  search.page !== DEFAULT_DIRECTORY_SEARCH.page ||
  search.pageSize !== DEFAULT_DIRECTORY_SEARCH.pageSize ||
  JSON.stringify(search.sorting) !== JSON.stringify(DEFAULT_DIRECTORY_SEARCH.sorting);

const getDirectoryOptionsScopeKey = (input: DirectoryOptionsFacetInput): string => JSON.stringify(input);

const getResponsiveDirectoryColumnVisibility = (isMobile: boolean): VisibilityState =>
  isMobile ? MOBILE_DIRECTORY_COLUMN_VISIBILITY : {};

export interface UseClientDirectoryWorkspaceInput {
  search: DirectorySearchState;
  onSearchChange: (updater: (previous: DirectorySearchState) => DirectorySearchState) => void;
}

export const useClientDirectoryWorkspace = ({
  search,
  onSearchChange,
}: UseClientDirectoryWorkspaceInput) => {
  const sessionState = useAppSessionStateContext();
  const resolvedUserRole = sessionState.profile?.role ?? null;
  const userRole = resolvedUserRole ?? 'tcs';
  const activeAgencyId = sessionState.activeAgencyId;
  const effectiveSearch = search;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    getResponsiveDirectoryColumnVisibility(getIsMobileDirectoryViewport()),
  );
  const [columnVisibilityMode, setColumnVisibilityMode] = useState<ColumnVisibilityMode>('responsive');
  const [density, setDensity] = useState(DEFAULT_DIRECTORY_DENSITY);
  const [filtersSyncToken, setFiltersSyncToken] = useState(0);
  const routeSearchValue = effectiveSearch.q ?? '';
  const [searchDraft, setSearchDraft] = useState(routeSearchValue);
  const directoryOptionsScope = useMemo<DirectoryOptionsFacetInput>(
    () => ({
      type: effectiveSearch.type,
      scope: effectiveSearch.scope,
      includeArchived: effectiveSearch.includeArchived,
    }),
    [effectiveSearch.includeArchived, effectiveSearch.scope, effectiveSearch.type],
  );
  const [directoryOptionsInput, setDirectoryOptionsInput] = useState(directoryOptionsScope);
  const [requestedOptions, setRequestedOptions] = useState<Record<DirectoryOptionRequest, boolean>>({
    agencies: false,
    commercials: false,
    departments: false,
  });
  const [enabledOptions, setEnabledOptions] = useState<Record<DirectoryOptionRequest, boolean>>({
    agencies: false,
    commercials: false,
    departments: false,
  });
  const directoryOptionsInputKey = getDirectoryOptionsScopeKey(directoryOptionsInput);
  const directoryOptionsScopeKey = getDirectoryOptionsScopeKey(directoryOptionsScope);
  const hasAppliedDefaultViewRef = useRef(false);
  const deferredSearchDraft = useDeferredValue(searchDraft);
  const normalizedSearchDraft = searchDraft.trim();
  const normalizedDeferredSearchDraft = deferredSearchDraft.trim();
  const canLoadDirectory =
    Boolean(sessionState.session) && Boolean(resolvedUserRole) && Boolean(activeAgencyId);

  const querySearch = useMemo<DirectorySearchState>(
    () => ({
      ...effectiveSearch,
      q: normalizedDeferredSearchDraft || undefined,
    }),
    [effectiveSearch, normalizedDeferredSearchDraft],
  );
  const uiSearch = useMemo<DirectorySearchState>(
    () => ({
      ...effectiveSearch,
      q: normalizedSearchDraft || undefined,
    }),
    [effectiveSearch, normalizedSearchDraft],
  );
  const directoryListInput = useMemo(() => toDirectoryListInput(querySearch), [querySearch]);
  const directoryPageQuery = useDirectoryPage(directoryListInput, canLoadDirectory);
  const canLoadCurrentOptions = canLoadDirectory && directoryOptionsInputKey === directoryOptionsScopeKey;
  const agenciesQuery = useDirectoryOptionAgencies(
    { includeArchived: false },
    canLoadDirectory && userRole === 'super_admin' && enabledOptions.agencies,
  );
  const commercialsQuery = useDirectoryOptionCommercials(
    directoryOptionsInput,
    canLoadCurrentOptions && enabledOptions.commercials,
  );
  const departmentsQuery = useDirectoryOptionDepartments(
    directoryOptionsInput,
    canLoadCurrentOptions && enabledOptions.departments,
  );
  const savedViewsQuery = useDirectorySavedViews(canLoadDirectory);
  const saveSavedViewMutation = useSaveDirectorySavedView();
  const deleteSavedViewMutation = useDeleteDirectorySavedView();
  const setDefaultSavedViewMutation = useSetDefaultDirectorySavedView();
  const totalResults = directoryPageQuery.data?.total;
  const directoryRows = directoryPageQuery.data?.rows ?? [];
  const rowDepartments = useMemo(
    () =>
      Array.from(
        new Set(
          directoryRows
            .map((row) => row.department?.trim() ?? '')
            .filter((department) => department.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right, 'fr')),
    [directoryRows],
  );
  const rowCommercials = useMemo(
    () =>
      Array.from(
        new Map(
          directoryRows
            .filter((row) => row.cir_commercial_id && row.cir_commercial_name)
            .map((row) => [
              row.cir_commercial_id as string,
              {
                id: row.cir_commercial_id as string,
                display_name: row.cir_commercial_name as string,
              },
            ]),
        ).values(),
      ).sort((left, right) => left.display_name.localeCompare(right.display_name, 'fr')),
    [directoryRows],
  );
  const viewOptionColumns = useMemo(
    () => buildDirectoryViewOptionColumns(columnVisibility),
    [columnVisibility],
  );

  useEffect(() => {
    setSearchDraft(routeSearchValue);
  }, [routeSearchValue]);

  useEffect(() => {
    if (!Object.values(requestedOptions).some(Boolean)) {
      setEnabledOptions({
        agencies: false,
        commercials: false,
        departments: false,
      });
      setDirectoryOptionsInput(directoryOptionsScope);
      return;
    }

    setEnabledOptions({
      agencies: false,
      commercials: false,
      departments: false,
    });
    const timeoutId = window.setTimeout(() => {
      setDirectoryOptionsInput(directoryOptionsScope);
      setEnabledOptions(requestedOptions);
    }, DIRECTORY_OPTIONS_FETCH_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [directoryOptionsScope, requestedOptions]);

  useEffect(() => {
    if (
      columnVisibilityMode !== 'responsive' ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
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

  const applySavedViewUiState = (view: DirectorySavedView) => {
    setColumnVisibilityMode('saved');
    setColumnVisibility(view.state.columnVisibility);
    setDensity(view.state.density);
    setSearchDraft(view.state.q ?? '');
    setFiltersSyncToken((previous) => previous + 1);
  };

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
      onSearchChange(() => nextSearch);
    });
  }, [onSearchChange, savedViewsQuery.data, search]);

  const handleSearchPatch = (patch: Partial<DirectorySearchState>) => {
    const nextSearchDraft = Object.prototype.hasOwnProperty.call(patch, 'q')
      ? patch.q ?? ''
      : normalizedSearchDraft;

    if (Object.prototype.hasOwnProperty.call(patch, 'q')) {
      setSearchDraft(nextSearchDraft);
    }

    startTransition(() => {
      onSearchChange((previous) => ({
        ...previous,
        q: nextSearchDraft || undefined,
        ...patch,
      }));
    });
  };

  const handleApplySavedView = (view: DirectorySavedView) => {
    const nextSearch = toDirectorySearchFromViewState(view.state);
    applySavedViewUiState(view);

    startTransition(() => {
      onSearchChange(() => nextSearch);
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
      handleUiError(error, 'Impossible de definir la vue par defaut.');
    }
  };

  const handleToggleColumn = (columnId: string) => {
    setColumnVisibilityMode('custom');
    setColumnVisibility((previous) => ({
      ...previous,
      [columnId]: previous[columnId] === false,
    }));
  };

  const handleResetFilters = () => {
    setSearchDraft('');
    handleSearchPatch({
      q: undefined,
      type: 'all',
      scope: DEFAULT_DIRECTORY_SEARCH.scope,
      departments: [],
      city: undefined,
      cirCommercialIds: [],
      includeArchived: false,
      page: 1,
      pageSize: DEFAULT_DIRECTORY_SEARCH.pageSize,
      sorting: DEFAULT_DIRECTORY_SEARCH.sorting,
    });
    setColumnVisibilityMode('responsive');
    setColumnVisibility(getResponsiveDirectoryColumnVisibility(getIsMobileDirectoryViewport()));
    setDensity(DEFAULT_DIRECTORY_DENSITY);
    setFiltersSyncToken((previous) => previous + 1);
  };

  const savedViewsState = toDirectorySavedViewState(uiSearch, columnVisibility, density);
  const isSavedViewsMutating =
    saveSavedViewMutation.isPending ||
    deleteSavedViewMutation.isPending ||
    setDefaultSavedViewMutation.isPending;

  return {
    userRole,
    activeAgencyId,
    canLoadDirectory,
    effectiveSearch,
    uiSearch,
    searchDraft,
    setSearchDraft,
    density,
    setDensity,
    columnVisibility,
    filtersSyncToken,
    totalResults,
    viewOptionColumns,
    agencies: agenciesQuery.data?.agencies ?? [],
    directoryRows,
    directoryPage: directoryPageQuery.data?.page ?? effectiveSearch.page,
    directoryPageSize: directoryPageQuery.data?.page_size ?? effectiveSearch.pageSize,
    directoryIsFetching: directoryPageQuery.isFetching,
    directoryIsPending: directoryPageQuery.isPending,
    commercials: commercialsQuery.data?.commercials ?? rowCommercials,
    departments: departmentsQuery.data?.departments ?? rowDepartments,
    savedViews: savedViewsQuery.data?.views ?? [],
    savedViewsIsLoading: savedViewsQuery.isLoading,
    savedViewsState,
    isSavedViewsMutating,
    handleSearchPatch,
    requestDirectoryOptions: (options: DirectoryOptionRequest[]) => {
      setRequestedOptions((previous) => ({
        agencies: previous.agencies || options.includes('agencies'),
        commercials: previous.commercials || options.includes('commercials'),
        departments: previous.departments || options.includes('departments'),
      }));
    },
    handleApplySavedView,
    handleSaveView,
    handleDeleteView,
    handleSetDefaultView,
    handleToggleColumn,
    handleResetFilters,
  };
};

export type UseClientDirectoryWorkspaceReturn = ReturnType<typeof useClientDirectoryWorkspace>;
