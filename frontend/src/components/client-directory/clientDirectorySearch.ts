import {
  directoryListInputSchema,
  type DirectoryListInput,
  type DirectoryListRow,
  type DirectorySavedViewState,
  type DirectorySortingRule
} from 'shared/schemas/directory.schema';

export const DEFAULT_DIRECTORY_SORTING: DirectorySortingRule[] = [{ id: 'name', desc: false }];
export const DIRECTORY_PAGE_SIZE = 50;
export const DEFAULT_DIRECTORY_SEARCH: DirectoryListInput = directoryListInputSchema.parse({
  pageSize: DIRECTORY_PAGE_SIZE,
  sorting: DEFAULT_DIRECTORY_SORTING
});
export const DEFAULT_DIRECTORY_COLUMN_VISIBILITY: DirectorySavedViewState['columnVisibility'] = {};
export const DEFAULT_DIRECTORY_DENSITY: DirectorySavedViewState['density'] = 'comfortable';

const parseLegacySorting = (search: Record<string, unknown>): DirectorySortingRule[] => {
  const sortBy = typeof search.sortBy === 'string' ? search.sortBy.trim() : '';
  const sortDir = typeof search.sortDir === 'string' ? search.sortDir.trim().toLowerCase() : 'asc';

  if (!sortBy) {
    return DEFAULT_DIRECTORY_SORTING;
  }

  const parsed = directoryListInputSchema.safeParse({
    pageSize: DIRECTORY_PAGE_SIZE,
    sorting: [{ id: sortBy, desc: sortDir === 'desc' }]
  });

  return parsed.success ? parsed.data.sorting : DEFAULT_DIRECTORY_SORTING;
};

const parseSortString = (value: unknown): DirectorySortingRule[] => {
  if (typeof value !== 'string') {
    return DEFAULT_DIRECTORY_SORTING;
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

  const parsed = directoryListInputSchema.safeParse({
    pageSize: DIRECTORY_PAGE_SIZE,
    sorting: entries
  });

  return parsed.success ? parsed.data.sorting : DEFAULT_DIRECTORY_SORTING;
};

export const serializeDirectorySorting = (sorting: DirectorySortingRule[]): string =>
  sorting
    .map((rule) => `${rule.id}.${rule.desc ? 'desc' : 'asc'}`)
    .join(',');

const resolveSearchSorting = (search: Record<string, unknown>): DirectorySortingRule[] => {
  if (Array.isArray(search.sorting) && search.sorting.length > 0) {
    const parsed = directoryListInputSchema.safeParse({
      pageSize: DIRECTORY_PAGE_SIZE,
      sorting: search.sorting
    });
    if (parsed.success) {
      return parsed.data.sorting;
    }
  }

  if (search.sort) {
    return parseSortString(search.sort);
  }

  return parseLegacySorting(search);
};

export const validateDirectorySearch = (search: Record<string, unknown>): DirectoryListInput => {
  const restSearch = Object.fromEntries(
    Object.entries(search).filter(([key]) => key !== 'sort' && key !== 'sortBy' && key !== 'sortDir' && key !== 'sorting')
  );
  const parsed = directoryListInputSchema.safeParse({
    ...restSearch,
    pageSize: typeof restSearch.pageSize === 'number' || typeof restSearch.pageSize === 'string'
      ? restSearch.pageSize
      : DIRECTORY_PAGE_SIZE,
    sorting: resolveSearchSorting(search)
  });

  if (!parsed.success) {
    return DEFAULT_DIRECTORY_SEARCH;
  }

  return {
    ...parsed.data,
    pageSize: parsed.data.pageSize,
    sorting: parsed.data.sorting
  };
};

export const toDirectorySavedViewState = (
  search: DirectoryListInput,
  columnVisibility: DirectorySavedViewState['columnVisibility'],
  density: DirectorySavedViewState['density']
): DirectorySavedViewState => ({
  q: search.q,
  type: search.type,
  agencyIds: search.agencyIds,
  departments: search.departments,
  city: search.city,
  cirCommercialIds: search.cirCommercialIds,
  includeArchived: search.includeArchived,
  pageSize: search.pageSize,
  sorting: search.sorting,
  columnVisibility,
  density
});

export const toDirectorySearchFromViewState = (state: DirectorySavedViewState): DirectoryListInput =>
  directoryListInputSchema.parse({
    ...DEFAULT_DIRECTORY_SEARCH,
    q: state.q,
    type: state.type,
    agencyIds: state.agencyIds,
    departments: state.departments,
    city: state.city,
    cirCommercialIds: state.cirCommercialIds,
    includeArchived: state.includeArchived,
    pageSize: state.pageSize,
    sorting: state.sorting,
    page: 1
  });

export const isProspectEntityType = (entityType: string): boolean => {
  const normalized = entityType.trim().toLowerCase();
  return normalized.includes('prospect') || normalized.includes('particulier');
};

export const buildDirectoryRecordPath = (row: DirectoryListRow): string => {
  if (!isProspectEntityType(row.entity_type) && row.client_number) {
    return `/clients/${row.client_number}`;
  }

  return `/clients/prospects/${row.id}`;
};

export const getDirectoryTypeLabel = (entityType: string): string =>
  isProspectEntityType(entityType) ? 'Prospect' : 'Client';

export const countActiveDirectoryFilters = (search: DirectoryListInput): number =>
  [
    search.type !== 'all',
    search.departments.length > 0,
    Boolean(search.city),
    search.agencyIds.length > 0,
    search.cirCommercialIds.length > 0,
    search.includeArchived
  ].filter(Boolean).length;

export const hasActiveDirectoryFilters = (search: DirectoryListInput): boolean =>
  countActiveDirectoryFilters(search) > 0 || Boolean(search.q);
