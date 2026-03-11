import { describe, expect, it } from 'vitest';

import {
  createDefaultUiPocClientsFilters,
  getNextUiPocSortState,
  normalizeUiPocClientsFilters
} from '@/components/poc/uiPocClientsGridUtils';

describe('uiPocClientsGridUtils', () => {
  it('creates filters using the provided default agency', () => {
    const filters = createDefaultUiPocClientsFilters('agency-1');

    expect(filters).toEqual({
      search: '',
      city: '',
      department: '',
      commercial: '',
      agencyId: 'agency-1'
    });
  });

  it('trims text filters without altering agency', () => {
    const normalized = normalizeUiPocClientsFilters({
      search: '  acme  ',
      city: '  Bordeaux ',
      department: '  33 ',
      commercial: '  user-1 ',
      agencyId: 'agency-1'
    });

    expect(normalized).toEqual({
      search: 'acme',
      city: 'Bordeaux',
      department: '33',
      commercial: 'user-1',
      agencyId: 'agency-1'
    });
  });

  it('starts new sort columns in ascending order', () => {
    const next = getNextUiPocSortState('name', 'desc', 'city');

    expect(next).toEqual({
      sortBy: 'city',
      sortDirection: 'asc'
    });
  });

  it('toggles sort direction when clicking the same column', () => {
    const ascToDesc = getNextUiPocSortState('name', 'asc', 'name');
    const descToAsc = getNextUiPocSortState('name', 'desc', 'name');

    expect(ascToDesc).toEqual({
      sortBy: 'name',
      sortDirection: 'desc'
    });
    expect(descToAsc).toEqual({
      sortBy: 'name',
      sortDirection: 'asc'
    });
  });
});
