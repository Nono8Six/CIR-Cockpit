import {
  directoryListInputSchema,
  directorySearchStateSchema,
  type DirectoryListInput,
  type DirectoryScopeInput,
  type DirectorySearchState,
  type DirectorySavedViewState,
  type DirectorySortingRule,
  type DirectoryDensity
} from 'shared/schemas/directory.schema';

export const DEFAULT_SUPPLIER_SORTING: DirectorySortingRule[] = [{ id: 'name', desc: false }];
export const SUPPLIER_PAGE_SIZE = 50;
export const DEFAULT_SUPPLIER_SCOPE: DirectoryScopeInput = { mode: 'all_accessible_agencies' };
export const DEFAULT_SUPPLIER_SEARCH: DirectorySearchState = directorySearchStateSchema.parse({
  type: 'supplier',
  scope: DEFAULT_SUPPLIER_SCOPE,
  pageSize: SUPPLIER_PAGE_SIZE,
  sorting: DEFAULT_SUPPLIER_SORTING
});
export const DEFAULT_SUPPLIER_DENSITY: DirectoryDensity = 'compact';

const parseSortString = (value: unknown): DirectorySortingRule[] => {
  if (typeof value !== 'string') {
    return DEFAULT_SUPPLIER_SORTING;
  }

  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [id, direction] = entry.split('.');
      return {
        id,
        desc: direction === 'desc'
      };
    });

  const parsed = directorySearchStateSchema.safeParse({
    type: 'supplier',
    pageSize: SUPPLIER_PAGE_SIZE,
    sorting: entries
  });

  return parsed.success ? parsed.data.sorting : DEFAULT_SUPPLIER_SORTING;
};

const resolveSupplierSorting = (search: Record<string, unknown>): DirectorySortingRule[] => {
  if (Array.isArray(search.sorting) && search.sorting.length > 0) {
    const parsed = directorySearchStateSchema.safeParse({
      type: 'supplier',
      pageSize: SUPPLIER_PAGE_SIZE,
      sorting: search.sorting
    });
    if (parsed.success) {
      return parsed.data.sorting;
    }
  }

  return parseSortString(search.sort);
};

export const validateSupplierDirectorySearch = (search: Record<string, unknown>): DirectorySearchState => {
  const restSearch = Object.fromEntries(
    Object.entries(search).filter(([key]) => key !== 'sort' && key !== 'sortBy' && key !== 'sortDir' && key !== 'sorting')
  );
  const parsed = directorySearchStateSchema.safeParse({
    ...restSearch,
    type: 'supplier',
    cirCommercialIds: [],
    pageSize: typeof restSearch.pageSize === 'number' || typeof restSearch.pageSize === 'string'
      ? restSearch.pageSize
      : SUPPLIER_PAGE_SIZE,
    sorting: resolveSupplierSorting(search)
  });

  if (!parsed.success) {
    return DEFAULT_SUPPLIER_SEARCH;
  }

  return {
    ...parsed.data,
    type: 'supplier',
    scope: DEFAULT_SUPPLIER_SCOPE,
    cirCommercialIds: []
  };
};

export const toSupplierSavedViewState = (
  search: DirectorySearchState,
  columnVisibility: DirectorySavedViewState['columnVisibility'],
  density: DirectorySavedViewState['density']
): DirectorySavedViewState => ({
  viewType: 'suppliers',
  q: search.q,
  type: 'supplier',
  scope: DEFAULT_SUPPLIER_SCOPE,
  departments: search.departments,
  city: search.city,
  cirCommercialIds: [],
  includeArchived: search.includeArchived,
  pageSize: search.pageSize,
  sorting: search.sorting,
  columnVisibility,
  density
});

export const toSupplierSearchFromViewState = (state: DirectorySavedViewState): DirectorySearchState =>
  directorySearchStateSchema.parse({
    ...DEFAULT_SUPPLIER_SEARCH,
    q: state.q,
    type: 'supplier',
    scope: DEFAULT_SUPPLIER_SCOPE,
    departments: state.departments,
    city: state.city,
    cirCommercialIds: [],
    includeArchived: state.includeArchived,
    pageSize: state.pageSize,
    sorting: state.sorting,
    page: 1
  });

export const toSupplierListInput = (search: DirectorySearchState): DirectoryListInput =>
  directoryListInputSchema.parse({
    scope: DEFAULT_SUPPLIER_SCOPE,
    type: 'supplier',
    filters: {
      q: search.q,
      departments: search.departments,
      city: search.city,
      cirCommercialIds: [],
      includeArchived: search.includeArchived
    },
    pagination: {
      page: search.page,
      pageSize: search.pageSize,
      includeTotal: true
    },
    sorting: search.sorting
  });

export const countActiveSupplierFilters = (search: DirectorySearchState): number =>
  [
    search.departments.length > 0,
    Boolean(search.city),
    search.includeArchived
  ].filter(Boolean).length;
