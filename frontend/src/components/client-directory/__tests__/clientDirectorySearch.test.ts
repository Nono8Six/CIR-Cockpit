import { describe, expect, it } from 'vitest';

import type { DirectorySavedViewState } from 'shared/schemas/directory.schema';
import {
  DEFAULT_DIRECTORY_SEARCH,
  buildDirectoryRecordPath,
  countActiveDirectoryFilters,
  getDirectoryTypeLabel,
  hasActiveDirectoryFilters,
  toDirectorySavedViewState,
  toDirectorySearchFromViewState,
  validateDirectorySearch
} from '../clientDirectorySearch';

describe('clientDirectorySearch helpers', () => {
  it('parse un tri legacy sortBy/sortDir vers le nouveau state sorting', () => {
    const search = validateDirectorySearch({
      sortBy: 'updated_at',
      sortDir: 'desc',
      page: '2'
    });

    expect(search.page).toBe(2);
    expect(search.sorting).toEqual([{ id: 'updated_at', desc: true }]);
  });

  it('parse une chaine de tri multi-colonnes', () => {
    const search = validateDirectorySearch({
      sort: 'name.asc,city.desc'
    });

    expect(search.sorting).toEqual([
      { id: 'name', desc: false },
      { id: 'city', desc: true }
    ]);
  });

  it('construit et relit un état de vue sauvegardée', () => {
    const viewState: DirectorySavedViewState = {
      q: 'sea',
      type: 'client',
      agencyIds: ['3b298857-b531-4f4d-8dcf-3b9ca62d9d01'],
      departments: ['33'],
      city: 'Bordeaux',
      cirCommercialIds: ['456cc30e-2c03-44a6-a33d-f4b2f1584405'],
      includeArchived: true,
      pageSize: 100,
      sorting: [
        { id: 'name', desc: false },
        { id: 'updated_at', desc: true }
      ],
      columnVisibility: {
        department: false,
        city: true
      },
      density: 'compact'
    };

    const search = toDirectorySearchFromViewState(viewState);
    const rebuiltViewState = toDirectorySavedViewState(search, viewState.columnVisibility, viewState.density);

    expect(search.page).toBe(1);
    expect(search.pageSize).toBe(100);
    expect(search.sorting).toEqual(viewState.sorting);
    expect(rebuiltViewState).toEqual(viewState);
  });

  it('préserve un sorting array transmis par navigate', () => {
    const search = validateDirectorySearch({
      sorting: [{ id: 'city', desc: false }]
    });

    expect(search.sorting).toEqual([{ id: 'city', desc: false }]);
  });

  it('préserve un sorting multi-colonnes transmis par navigate', () => {
    const search = validateDirectorySearch({
      sorting: [
        { id: 'agency_name', desc: true },
        { id: 'name', desc: false }
      ]
    });

    expect(search.sorting).toEqual([
      { id: 'agency_name', desc: true },
      { id: 'name', desc: false }
    ]);
  });

  it('priorise sorting array sur sort string', () => {
    const search = validateDirectorySearch({
      sorting: [{ id: 'updated_at', desc: true }],
      sort: 'name.asc'
    });

    expect(search.sorting).toEqual([{ id: 'updated_at', desc: true }]);
  });

  it('retombe sur les valeurs par défaut quand la recherche est invalide', () => {
    const search = validateDirectorySearch({
      page: 0,
      sorting: []
    });

    expect(search).toEqual(DEFAULT_DIRECTORY_SEARCH);
  });

  it('compte les filtres actifs hors recherche libre', () => {
    expect(countActiveDirectoryFilters(DEFAULT_DIRECTORY_SEARCH)).toBe(0);
    expect(countActiveDirectoryFilters({
      ...DEFAULT_DIRECTORY_SEARCH,
      type: 'client',
      departments: ['33', '64'],
      includeArchived: true
    })).toBe(3);
  });

  it('normalise les paramètres legacy mono-valeur vers les tableaux', () => {
    const search = validateDirectorySearch({
      agencyId: '3b298857-b531-4f4d-8dcf-3b9ca62d9d01',
      department: '33',
      cirCommercialId: '456cc30e-2c03-44a6-a33d-f4b2f1584405'
    });

    expect(search.agencyIds).toEqual(['3b298857-b531-4f4d-8dcf-3b9ca62d9d01']);
    expect(search.departments).toEqual(['33']);
    expect(search.cirCommercialIds).toEqual(['456cc30e-2c03-44a6-a33d-f4b2f1584405']);
  });

  it('déduplique les filtres multi-sélection', () => {
    const search = validateDirectorySearch({
      agencyIds: [
        '3b298857-b531-4f4d-8dcf-3b9ca62d9d01',
        '3b298857-b531-4f4d-8dcf-3b9ca62d9d01'
      ],
      departments: ['33', '33', '64']
    });

    expect(search.agencyIds).toEqual(['3b298857-b531-4f4d-8dcf-3b9ca62d9d01']);
    expect(search.departments).toEqual(['33', '64']);
  });

  it('considère la recherche libre comme un état actif', () => {
    expect(hasActiveDirectoryFilters(DEFAULT_DIRECTORY_SEARCH)).toBe(false);
    expect(hasActiveDirectoryFilters({
      ...DEFAULT_DIRECTORY_SEARCH,
      q: 'sea'
    })).toBe(true);
  });

  it('construit les routes détail client et prospect', () => {
    expect(buildDirectoryRecordPath({
      id: 'prospect-id',
      entity_type: 'Prospect',
      client_kind: null,
      client_number: null,
      account_type: null,
      name: 'Pontac Thierry',
      city: null,
      department: null,
      agency_id: null,
      agency_name: null,
      cir_commercial_id: null,
      cir_commercial_name: null,
      archived_at: null,
      updated_at: '2026-03-06T10:00:00.000Z'
    })).toBe('/clients/prospects/prospect-id');

    expect(buildDirectoryRecordPath({
      id: 'client-id',
      entity_type: 'Client',
      client_kind: 'company',
      client_number: '116277',
      account_type: 'term',
      name: 'SEA',
      city: 'Gradignan',
      department: '33',
      agency_id: null,
      agency_name: null,
      cir_commercial_id: null,
      cir_commercial_name: null,
      archived_at: null,
      updated_at: '2026-03-06T10:00:00.000Z'
    })).toBe('/clients/116277');

    expect(getDirectoryTypeLabel('Prospect particulier')).toBe('Prospect');
  });
});
