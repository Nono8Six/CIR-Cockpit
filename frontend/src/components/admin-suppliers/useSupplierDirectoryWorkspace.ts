import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import type {
  DirectoryOptionsFacetInput,
  DirectorySavedView,
  DirectorySavedViewSaveInput,
  DirectorySearchState
} from '../../../../shared/schemas/system/directory.schema';

import { useAppSessionStateContext } from '../../hooks/session/useAppSession';
import { useDeleteDirectorySavedView } from '../../hooks/directory/views/useDeleteDirectorySavedView';
import { useDirectoryOptionDepartments } from '../../hooks/directory/options/useDirectoryOptionDepartments';
import { useDirectoryPage } from '../../hooks/directory/core/useDirectoryPage';
import { useDirectorySavedViews } from '../../hooks/directory/views/useDirectorySavedViews';
import { useSaveDirectorySavedView } from '../../hooks/directory/views/useSaveDirectorySavedView';
import { useSetDefaultDirectorySavedView } from '../../hooks/directory/views/useSetDefaultDirectorySavedView';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { getIsMobileDirectoryViewport, MOBILE_DIRECTORY_QUERY } from '@/components/client-directory/directoryViewport';
import type { DirectoryOptionRequest } from '@/components/client-directory/directory-filters/DirectoryFilters.types';

import {
  DEFAULT_SUPPLIER_DENSITY,
  DEFAULT_SUPPLIER_SEARCH,
  countActiveSupplierFilters,
  toSupplierListInput,
  toSupplierSavedViewState,
  toSupplierSearchFromViewState
} from './supplierDirectorySearch';
import {
  DESKTOP_SUPPLIER_COLUMN_VISIBILITY,
  MOBILE_SUPPLIER_COLUMN_VISIBILITY,
  buildSupplierViewOptionColumns
} from './supplierGridConfig';

const DIRECTORY_OPTIONS_FETCH_DELAY_MS = 150;

type ColumnVisibilityMode = 'responsive' | 'custom' | 'saved';
type SupplierOptionState = 'departments';

const hasExplicitSupplierState = (search: DirectorySearchState): boolean =>
  Boolean(search.q)
  || search.departments.length > 0
  || Boolean(search.city)
  || search.includeArchived !== DEFAULT_SUPPLIER_SEARCH.includeArchived
  || search.page !== DEFAULT_SUPPLIER_SEARCH.page
  || search.pageSize !== DEFAULT_SUPPLIER_SEARCH.pageSize
  || JSON.stringify(search.sorting) !== JSON.stringify(DEFAULT_SUPPLIER_SEARCH.sorting);

const getDirectoryOptionsScopeKey = (input: DirectoryOptionsFacetInput): string => JSON.stringify(input);

const getResponsiveSupplierColumnVisibility = (isMobile: boolean): VisibilityState =>
  isMobile ? MOBILE_SUPPLIER_COLUMN_VISIBILITY : DESKTOP_SUPPLIER_COLUMN_VISIBILITY;

export interface UseSupplierDirectoryWorkspaceInput {
  search: DirectorySearchState;
  onSearchChange: (updater: (previous: DirectorySearchState) => DirectorySearchState) => void;
}

export const useSupplierDirectoryWorkspace = ({
  search,
  onSearchChange
}: UseSupplierDirectoryWorkspaceInput) => {
  const sessionState = useAppSessionStateContext();
  const resolvedUserRole = sessionState.profile?.role ?? null;
  const userRole = resolvedUserRole ?? 'tcs';
  const canManageSuppliers = userRole !== 'tcs';
  const effectiveSearch = useMemo<DirectorySearchState>(() => ({
    ...search,
    type: 'supplier',
    scope: DEFAULT_SUPPLIER_SEARCH.scope,
    cirCommercialIds: []
  }), [search]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    getResponsiveSupplierColumnVisibility(getIsMobileDirectoryViewport())
  );
  const [columnVisibilityMode, setColumnVisibilityMode] = useState<ColumnVisibilityMode>('responsive');
  const [density, setDensity] = useState(DEFAULT_SUPPLIER_DENSITY);
  const [filtersSyncToken, setFiltersSyncToken] = useState(0);
  const routeSearchValue = effectiveSearch.q ?? '';
  const [searchDraft, setSearchDraft] = useState(routeSearchValue);
  const directoryOptionsScope = useMemo<DirectoryOptionsFacetInput>(
    () => ({
      type: 'supplier',
      scope: effectiveSearch.scope,
      includeArchived: effectiveSearch.includeArchived
    }),
    [effectiveSearch.includeArchived, effectiveSearch.scope]
  );
  const [directoryOptionsInput, setDirectoryOptionsInput] = useState(directoryOptionsScope);
  const [requestedOptions, setRequestedOptions] = useState<Record<SupplierOptionState, boolean>>({
    departments: false
  });
  const [enabledOptions, setEnabledOptions] = useState<Record<SupplierOptionState, boolean>>({
    departments: false
  });
  const directoryOptionsInputKey = getDirectoryOptionsScopeKey(directoryOptionsInput);
  const directoryOptionsScopeKey = getDirectoryOptionsScopeKey(directoryOptionsScope);
  const hasAppliedDefaultViewRef = useRef(false);
  const deferredSearchDraft = useDeferredValue(searchDraft);
  const normalizedSearchDraft = searchDraft.trim();
  const normalizedDeferredSearchDraft = deferredSearchDraft.trim();
  const canLoadDirectory =
    canManageSuppliers && Boolean(sessionState.session) && Boolean(resolvedUserRole);

  const querySearch = useMemo<DirectorySearchState>(
    () => ({
      ...effectiveSearch,
      q: normalizedDeferredSearchDraft || undefined
    }),
    [effectiveSearch, normalizedDeferredSearchDraft]
  );
  const uiSearch = useMemo<DirectorySearchState>(
    () => ({
      ...effectiveSearch,
      q: normalizedSearchDraft || undefined
    }),
    [effectiveSearch, normalizedSearchDraft]
  );
  const directoryListInput = useMemo(() => toSupplierListInput(querySearch), [querySearch]);
  const directoryPageQuery = useDirectoryPage(directoryListInput, canLoadDirectory);
  const canLoadCurrentOptions = canLoadDirectory && directoryOptionsInputKey === directoryOptionsScopeKey;
  const departmentsQuery = useDirectoryOptionDepartments(
    directoryOptionsInput,
    canLoadCurrentOptions && enabledOptions.departments
  );
  const savedViewsQuery = useDirectorySavedViews('suppliers', canLoadDirectory);
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
            .filter((department) => department.length > 0)
        )
      ).sort((left, right) => left.localeCompare(right, 'fr')),
    [directoryRows]
  );
  const viewOptionColumns = useMemo(
    () => buildSupplierViewOptionColumns(columnVisibility),
    [columnVisibility]
  );

  useEffect(() => {
    setSearchDraft(routeSearchValue);
  }, [routeSearchValue]);

  useEffect(() => {
    if (!Object.values(requestedOptions).some(Boolean)) {
      setEnabledOptions({ departments: false });
      setDirectoryOptionsInput(directoryOptionsScope);
      return;
    }

    setEnabledOptions({ departments: false });
    const timeoutId = window.setTimeout(() => {
      setDirectoryOptionsInput(directoryOptionsScope);
      setEnabledOptions(requestedOptions);
    }, DIRECTORY_OPTIONS_FETCH_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [directoryOptionsScope, requestedOptions]);

  useEffect(() => {
    if (
      columnVisibilityMode !== 'responsive'
      || typeof window === 'undefined'
      || typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_DIRECTORY_QUERY);
    const applyResponsiveVisibility = (matches: boolean) => {
      setColumnVisibility(getResponsiveSupplierColumnVisibility(matches));
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
    if (hasExplicitSupplierState(search)) {
      return;
    }

    const defaultView = savedViewsQuery.data.views.find((view) => view.is_default);
    if (!defaultView) {
      return;
    }

    applySavedViewUiState(defaultView);
    const nextSearch = toSupplierSearchFromViewState(defaultView.state);

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
        type: 'supplier',
        scope: DEFAULT_SUPPLIER_SEARCH.scope,
        cirCommercialIds: []
      }));
    });
  };

  const handleApplySavedView = (view: DirectorySavedView) => {
    const nextSearch = toSupplierSearchFromViewState(view.state);
    applySavedViewUiState(view);

    startTransition(() => {
      onSearchChange(() => nextSearch);
    });
  };

  const handleSaveView = async (input: DirectorySavedViewSaveInput): Promise<void> => {
    try {
      await saveSavedViewMutation.mutateAsync({
        ...input,
        state: {
          ...input.state,
          viewType: 'suppliers',
          type: 'supplier',
          scope: DEFAULT_SUPPLIER_SEARCH.scope,
          cirCommercialIds: []
        }
      });
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
      await setDefaultSavedViewMutation.mutateAsync({ id: viewId, viewType: 'suppliers' });
      notifySuccess('Vue par défaut enregistrée.');
    } catch (error) {
      handleUiError(error, 'Impossible de definir la vue par defaut.');
    }
  };

  const handleToggleColumn = (columnId: string) => {
    setColumnVisibilityMode('custom');
    setColumnVisibility((previous) => ({
      ...previous,
      [columnId]: previous[columnId] === false
    }));
  };

  const handleResetFilters = () => {
    setSearchDraft('');
    handleSearchPatch({
      q: undefined,
      type: 'supplier',
      scope: DEFAULT_SUPPLIER_SEARCH.scope,
      departments: [],
      city: undefined,
      cirCommercialIds: [],
      includeArchived: false,
      page: 1,
      pageSize: DEFAULT_SUPPLIER_SEARCH.pageSize,
      sorting: DEFAULT_SUPPLIER_SEARCH.sorting
    });
    setColumnVisibilityMode('responsive');
    setColumnVisibility(getResponsiveSupplierColumnVisibility(getIsMobileDirectoryViewport()));
    setDensity(DEFAULT_SUPPLIER_DENSITY);
    setFiltersSyncToken((previous) => previous + 1);
  };

  const savedViewsState = toSupplierSavedViewState(uiSearch, columnVisibility, density);
  const isSavedViewsMutating =
    saveSavedViewMutation.isPending
    || deleteSavedViewMutation.isPending
    || setDefaultSavedViewMutation.isPending;

  return {
    userRole,
    canManageSuppliers,
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
    agencies: [],
    directoryRows,
    directoryPage: directoryPageQuery.data?.page ?? effectiveSearch.page,
    directoryPageSize: directoryPageQuery.data?.page_size ?? effectiveSearch.pageSize,
    directoryIsFetching: directoryPageQuery.isFetching,
    directoryIsPending: directoryPageQuery.isPending,
    departments: departmentsQuery.data?.departments ?? rowDepartments,
    savedViews: savedViewsQuery.data?.views ?? [],
    savedViewsIsLoading: savedViewsQuery.isLoading,
    savedViewsState,
    isSavedViewsMutating,
    activeFilterCount: countActiveSupplierFilters(uiSearch),
    handleSearchPatch,
    requestDirectoryOptions: (options: DirectoryOptionRequest[]) => {
      setRequestedOptions((previous) => ({
        departments: previous.departments || options.includes('departments')
      }));
    },
    handleApplySavedView,
    handleSaveView,
    handleDeleteView,
    handleSetDefaultView,
    handleToggleColumn,
    handleResetFilters
  };
};
