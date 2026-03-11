import type {
  UiPocClientsFilters,
  UiPocClientsSortBy,
  UiPocClientsSortDirection
} from '@/services/clients/getUiPocClientsPage';

export const UI_POC_CLIENTS_PAGE_SIZE = 25;

export const createDefaultUiPocClientsFilters = (
  activeAgencyId: string | null
): UiPocClientsFilters => ({
  search: '',
  city: '',
  department: '',
  commercial: '',
  agencyId: activeAgencyId
});

export const normalizeUiPocClientsFilters = (
  filters: UiPocClientsFilters
): UiPocClientsFilters => ({
  search: filters.search.trim(),
  city: filters.city.trim(),
  department: filters.department.trim(),
  commercial: filters.commercial.trim(),
  agencyId: filters.agencyId
});

export const getNextUiPocSortState = (
  currentBy: UiPocClientsSortBy,
  currentDirection: UiPocClientsSortDirection,
  clickedBy: UiPocClientsSortBy
): { sortBy: UiPocClientsSortBy; sortDirection: UiPocClientsSortDirection } => {
  if (clickedBy !== currentBy) {
    return { sortBy: clickedBy, sortDirection: 'asc' };
  }

  return {
    sortBy: currentBy,
    sortDirection: currentDirection === 'asc' ? 'desc' : 'asc'
  };
};
