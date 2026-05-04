import { describe, expect, it } from 'vitest';

import {
  QUERY_ROOTS,
  auditLogsRootKey,
  clientsRootKey,
  directoryFiltersKey,
  directoryCompanyDetailsRootKey,
  directoryOptionCommercialsKey,
  directoryOptionCommercialsRootKey,
  directoryPaginationKey,
  directoryPageKey,
  directoryScopeKey,
  entitySearchIndexRootKey,
  interactionsKey,
  interactionsRootKey
} from '@/services/query/queryKeys';

describe('queryKeys', () => {
  it('exposes stable root keys', () => {
    expect(interactionsRootKey()).toEqual([QUERY_ROOTS.interactions]);
    expect(clientsRootKey()).toEqual([QUERY_ROOTS.clients]);
    expect(directoryCompanyDetailsRootKey()).toEqual([QUERY_ROOTS.directoryCompanyDetails]);
    expect(directoryOptionCommercialsRootKey()).toEqual([QUERY_ROOTS.directoryOptionCommercials]);
    expect(entitySearchIndexRootKey()).toEqual([QUERY_ROOTS.entitySearchIndex]);
    expect(auditLogsRootKey()).toEqual([QUERY_ROOTS.auditLogs]);
  });

  it('normalizes interactions key when agency id is missing', () => {
    expect(interactionsKey(null)).toEqual([QUERY_ROOTS.interactions, 'none']);
  });

  it('serializes directory scope and filter keys deterministically', () => {
    expect(directoryScopeKey({ mode: 'selected_agencies', agencyIds: ['agency-b', 'agency-a'] })).toEqual([
      'selected_agencies',
      ['agency-a', 'agency-b']
    ]);

    expect(directoryFiltersKey({
      q: '',
      departments: ['75', '13'],
      city: '',
      cirCommercialIds: ['user-b', 'user-a'],
      includeArchived: false
    })).toEqual({
      q: '',
      departments: ['13', '75'],
      city: '',
      cirCommercialIds: ['user-a', 'user-b'],
      includeArchived: false
    });

    expect(directoryPaginationKey({ page: 2, pageSize: 50, includeTotal: false })).toEqual({
      page: 2,
      pageSize: 50,
      includeTotal: false
    });
  });

  it('builds explicit directory list and facet keys', () => {
    const scope = { mode: 'selected_agencies' as const, agencyIds: ['agency-b', 'agency-a'] };
    const filters = {
      q: '',
      departments: ['75', '13'],
      city: '',
      cirCommercialIds: [],
      includeArchived: false
    };

    expect(directoryPageKey({
      scope,
      type: 'client',
      filters,
      pagination: { page: 1, pageSize: 25, includeTotal: false },
      sorting: [{ id: 'name', desc: false }]
    })).toEqual([
      QUERY_ROOTS.directory,
      ['selected_agencies', ['agency-a', 'agency-b']],
      'client',
      {
        q: '',
        departments: ['13', '75'],
        city: '',
        cirCommercialIds: [],
        includeArchived: false
      },
      { page: 1, pageSize: 25, includeTotal: false },
      [{ id: 'name', desc: false }]
    ]);

    expect(directoryOptionCommercialsKey({
      scope,
      type: 'client',
      includeArchived: false
    })).toEqual([
      QUERY_ROOTS.directoryOptionCommercials,
      ['selected_agencies', ['agency-a', 'agency-b']],
      'client',
      'active'
    ]);
  });
});
