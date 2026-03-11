import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';

vi.mock('@/services/api/invokeTrpc', () => ({
  invokeTrpc: vi.fn()
}));

vi.mock('@/services/api/trpcClient', () => ({
  callTrpcQuery: vi.fn()
}));

const mockInvokeTrpc = vi.mocked(invokeTrpc);
const mockCallTrpcQuery = vi.mocked(callTrpcQuery);

const makeCompany = (overrides: Record<string, unknown> = {}) => ({
  name: 'KB EQUIPEMENT',
  official_name: 'KB EQUIPEMENT',
  siren: '800929689',
  siret: '80092968900018',
  naf_code: '46.69B',
  address: 'Adresse test',
  postal_code: '33700',
  city: 'Merignac',
  department: '33',
  is_head_office: true,
  match_quality: 'exact' as const,
  match_explanation: 'Correspondance exacte',
  official_data_source: 'api-recherche-entreprises' as const,
  official_data_synced_at: '2026-03-10T00:00:00.000Z',
  ...overrides
});

describe('getDirectoryCompanySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  it('delegates the request to the tRPC directory.company-search route', async () => {
    mockInvokeTrpc.mockImplementation(async (runner, parser) => parser(await runner()));
    mockCallTrpcQuery.mockResolvedValue({
      request_id: 'req-1',
      ok: true,
      companies: [makeCompany()]
    });

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'KB EQUIP',
      department: '33'
    });

    expect(mockInvokeTrpc).toHaveBeenCalledTimes(1);
    expect(mockCallTrpcQuery).toHaveBeenCalledWith('directory.company-search', {
      query: 'KB EQUIP',
      department: '33'
    });
    expect(response.companies[0]).toMatchObject({
      name: 'KB EQUIPEMENT',
      department: '33',
      match_quality: 'exact'
    });
  });

  it('validates the server payload before returning it', async () => {
    mockInvokeTrpc.mockImplementation(async (runner, parser) => parser(await runner()));
    mockCallTrpcQuery.mockResolvedValue({
      request_id: 'req-2',
      ok: true,
      companies: [{ wrong: true }]
    });

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');

    await expect(getDirectoryCompanySearch({ query: 'sea' })).rejects.toMatchObject({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.'
    });
  });

  it('surfaces invokeTrpc errors unchanged', async () => {
    const edgeError = createAppError({
      code: 'EDGE_FUNCTION_ERROR',
      message: "Impossible de rechercher l'entreprise.",
      source: 'edge'
    });
    mockInvokeTrpc.mockRejectedValue(edgeError);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');

    await expect(getDirectoryCompanySearch({ query: 'sea' })).rejects.toBe(edgeError);
  });

  it('falls back to the public company search when the tRPC route is missing', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{
          siren: '800929689',
          nom_complet: 'KB EQUIPEMENT',
          nom_raison_sociale: 'KB EQUIPEMENT',
          siege: {
            siret: '80092968900018',
            adresse: '4 avenue de la Somme',
            code_postal: '33700',
            libelle_commune: 'Merignac',
            departement: '33',
            est_siege: true,
            activite_principale: '46.69B'
          },
          matching_etablissements: []
        }]
      })
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'KB EQUIP',
      department: '33'
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(response.companies[0]).toMatchObject({
      name: 'KB EQUIPEMENT',
      department: '33',
      siret: '80092968900018'
    });
  });

  it('retries with a short leading token when a department is provided', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const query = new URL(String(requestUrl)).searchParams.get('q');

      if (query === 'kb') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '800929689',
              nom_complet: 'KB EQUIPEMENT',
              nom_raison_sociale: 'KB EQUIPEMENT',
              siege: {
                siret: '80092968900018',
                adresse: '4 avenue de la Somme',
                code_postal: '33620',
                libelle_commune: 'Cavignac',
                departement: '33',
                est_siege: true,
                activite_principale: '46.69B'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'KB EQUIP',
      department: '33'
    });

    expect(fetchMock.mock.calls.map(([requestUrl]) => new URL(String(requestUrl)).searchParams.get('q'))).toEqual([
      'kb equip',
      'kbequip',
      'kb'
    ]);
    expect(response.companies[0]).toMatchObject({
      name: 'KB EQUIPEMENT',
      city: 'Cavignac',
      match_quality: 'expanded'
    });
  });

  it('reranks widened prefix matches ahead of reversed token matches', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const url = new URL(String(requestUrl));
      const query = url.searchParams.get('q');
      const page = Number(url.searchParams.get('page'));

      if (query === 'aquitaine electri') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '324499052',
              nom_complet: 'SOC CONSTR ELECTRI AQUITAINE',
              nom_raison_sociale: 'SOC CONSTR ELECTRI AQUITAINE',
              siege: {
                siret: '32449905200010',
                adresse: '2 rue test',
                code_postal: '33310',
                libelle_commune: 'Lormont',
                departement: '33',
                est_siege: true,
                activite_principale: '43.21A'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'aquitaine' && page === 6) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '444541890',
              nom_complet: 'AQUITAINE ELECTRIQUE',
              nom_raison_sociale: 'AQUITAINE ELECTRIQUE',
              siege: {
                siret: '44454189000016',
                adresse: 'Le Bourg',
                code_postal: '33190',
                libelle_commune: 'Loupiac-de-la-Reole',
                departement: '33',
                est_siege: true,
                activite_principale: '43.21A'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'aquitaine electri',
      department: '33'
    });

    expect(response.companies.map((company) => company.name)).toEqual([
      'AQUITAINE ELECTRIQUE',
      'SOC CONSTR ELECTRI AQUITAINE'
    ]);
    expect(response.companies[0]).toMatchObject({
      match_quality: 'expanded',
      match_explanation: 'Resultat retrouve via recherche elargie'
    });
  });

  it('widens broad secondary tokens and reranks distinctive trailing prefixes ahead of aquitaine false positives', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const url = new URL(String(requestUrl));
      const query = url.searchParams.get('q');
      const page = Number(url.searchParams.get('page'));

      if (query === 'aquitaine industriel prizz') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      if (query === 'aquitaine industriel' && page === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '448883074',
              nom_complet: 'AQUITAINE PRIMEURS INDUSTRIELLES',
              nom_raison_sociale: 'AQUITAINE PRIMEURS INDUSTRIELLES',
              siege: {
                siret: '44888307400048',
                adresse: '23 route de Bordeaux',
                code_postal: '33980',
                libelle_commune: 'Audenge',
                departement: '33',
                est_siege: true,
                activite_principale: '46.31Z'
              },
              matching_etablissements: [{
                siret: '44888307400055',
                adresse: '4 avenue test',
                code_postal: '33610',
                libelle_commune: 'Cestas',
                departement: '33',
                est_siege: false,
                activite_principale: '46.31Z'
              }]
            }, {
              siren: '803175116',
              nom_complet: 'AQUITAINE EQUIPEMENT INDUSTRIEL (A.E.I.)',
              nom_raison_sociale: 'AQUITAINE EQUIPEMENT INDUSTRIEL',
              siege: {
                siret: '80317511600019',
                adresse: '12 rue des Artisans',
                code_postal: '33450',
                libelle_commune: 'Saint-Loubes',
                departement: '33',
                est_siege: true,
                activite_principale: '46.69B'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'aquitaine industriel') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      if (query === 'aquitaine' && page === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '393932306',
              nom_complet: 'SYNLAB NOUVELLE AQUITAINE',
              nom_raison_sociale: 'SYNLAB NOUVELLE AQUITAINE',
              siege: {
                siret: '39393230600168',
                adresse: '2 avenue test',
                code_postal: '33700',
                libelle_commune: 'Merignac',
                departement: '33',
                est_siege: true,
                activite_principale: '86.90A'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'aquitaine') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      if (query === 'industriel' && page === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '529040693',
              nom_complet: 'ELECTRICITE INDUSTRIELLE AQUITAINE',
              nom_raison_sociale: 'ELECTRICITE INDUSTRIELLE AQUITAINE',
              siege: {
                siret: '52904069300028',
                adresse: '8 avenue test',
                code_postal: '33610',
                libelle_commune: 'Cestas',
                departement: '33',
                est_siege: true,
                activite_principale: '43.21A'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'industriel' && page === 3) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '811548056',
              nom_complet: 'AUTOMATISME INDUSTRIEL PRIZZON',
              nom_raison_sociale: 'AUTOMATISME INDUSTRIEL PRIZZON',
              siege: {
                siret: '81154805600050',
                adresse: '10 avenue de la Foret',
                code_postal: '33320',
                libelle_commune: 'Eysines',
                departement: '33',
                est_siege: true,
                activite_principale: '28.99B'
              },
              matching_etablissements: [{
                siret: '81154805600019',
                adresse: '235 avenue des Eyquems',
                code_postal: '33700',
                libelle_commune: 'Merignac',
                departement: '33',
                est_siege: false,
                activite_principale: '71.12B'
              }]
            }]
          })
        };
      }

      if (query === 'industriel') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      if (query === 'prizz') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'aquitaine industriel prizz',
      department: '33'
    });

    expect(fetchMock.mock.calls.map(([requestUrl]) => {
      const url = new URL(String(requestUrl));
      return `${url.searchParams.get('q')}#${url.searchParams.get('page')}`;
    })).toContain('industriel#3');
    expect(response.companies[0]).toMatchObject({
      name: 'AUTOMATISME INDUSTRIEL PRIZZON',
      siren: '811548056',
      city: 'Merignac',
      match_quality: 'expanded'
    });
  });

  it('keeps the best collected results when widening hits a rate limit', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const query = new URL(String(requestUrl)).searchParams.get('q');

      if (query === 'aquitaine electri') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '324499052',
              nom_complet: 'SOC CONSTR ELECTRI AQUITAINE',
              nom_raison_sociale: 'SOC CONSTR ELECTRI AQUITAINE',
              siege: {
                siret: '32449905200010',
                adresse: '2 rue test',
                code_postal: '33310',
                libelle_commune: 'Lormont',
                departement: '33',
                est_siege: true,
                activite_principale: '43.21A'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      return {
        ok: false,
        status: 429,
        json: async () => ({})
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'aquitaine electri',
      department: '33'
    });

    expect(response.companies).toHaveLength(1);
    expect(response.companies[0]).toMatchObject({
      name: 'SOC CONSTR ELECTRI AQUITAINE'
    });
  });

  it('finds moteurs leroy somer from a short trailing token query', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const query = new URL(String(requestUrl)).searchParams.get('q');

      if (query === 'leroy s') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '338567258',
              nom_complet: 'MOTEURS LEROY SOMER',
              nom_raison_sociale: 'MOTEURS LEROY SOMER',
              siege: {
                siret: '33856725800134',
                adresse: 'Boulevard Marcellin Leroy',
                code_postal: '16000',
                libelle_commune: 'Angouleme',
                departement: '16',
                est_siege: true,
                activite_principale: '27.11Z'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'leroy') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '789977584',
              nom_complet: 'LEROY SOMER',
              nom_raison_sociale: 'LEROY SOMER',
              siege: {
                siret: '78997758400014',
                adresse: '52 rue de la republique',
                code_postal: '16000',
                libelle_commune: 'Angouleme',
                departement: '16',
                est_siege: true,
                activite_principale: '27.11Z'
              },
              matching_etablissements: []
            }, {
              siren: '338567258',
              nom_complet: 'MOTEURS LEROY SOMER',
              nom_raison_sociale: 'MOTEURS LEROY SOMER',
              siege: {
                siret: '33856725800076',
                adresse: '1 rue test',
                code_postal: '16400',
                libelle_commune: 'La Couronne',
                departement: '16',
                est_siege: false,
                activite_principale: '27.11Z'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'leroy s',
      department: '16'
    });

    expect(response.companies[0]).toMatchObject({
      name: 'MOTEURS LEROY SOMER',
      department: '16'
    });
  });

  it('queries collapsed company names when the official API indexes them without spaces', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const query = new URL(String(requestUrl)).searchParams.get('q');

      if (query === 'ariane group') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '912490232',
              nom_complet: 'ARIANE GROUP OMNISPORTS RASSEMBLEMENT ASSOCIATIF',
              nom_raison_sociale: 'ARIANE GROUP OMNISPORTS RASSEMBLEMENT ASSOCIATIF',
              siege: {
                siret: '91249023200015',
                adresse: '17 avenue Ariane',
                code_postal: '33185',
                libelle_commune: 'Le Haillan',
                departement: '33',
                est_siege: true,
                activite_principale: '93.12Z'
              },
              matching_etablissements: []
            }, {
              siren: '782001275',
              nom_complet: 'COMITE SOCIAL ET ECONOMIQUE ATLANTIQUE ARIANE GROUP',
              nom_raison_sociale: 'COMITE SOCIAL ET ECONOMIQUE ATLANTIQUE ARIANE GROUP',
              siege: {
                siret: '78200127500010',
                adresse: 'Rue du General Niox',
                code_postal: '33160',
                libelle_commune: 'Saint-Medard-en-Jalles',
                departement: '33',
                est_siege: true,
                activite_principale: '94.99Z'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'arianegroup') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '519032247',
              nom_complet: 'ARIANEGROUP SAS',
              nom_raison_sociale: 'ARIANEGROUP SAS',
              siege: {
                siret: '51903224700040',
                adresse: '51 route de Verneuil',
                code_postal: '78130',
                libelle_commune: 'Les Mureaux',
                departement: '78',
                est_siege: true,
                activite_principale: '30.30Z'
              },
              matching_etablissements: [{
                siret: '51903224700099',
                adresse: 'Les Cinq Chemins',
                code_postal: '33185',
                libelle_commune: 'Le Haillan',
                departement: '33',
                est_siege: false,
                activite_principale: '30.30Z'
              }, {
                siret: '51903224700032',
                adresse: 'Rue du General Niox',
                code_postal: '33160',
                libelle_commune: 'Saint-Medard-en-Jalles',
                departement: '33',
                est_siege: false,
                activite_principale: '30.30Z'
              }]
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'ariane group',
      department: '33'
    });

    expect(fetchMock.mock.calls.map(([requestUrl]) => new URL(String(requestUrl)).searchParams.get('q'))).toEqual([
      'ariane group',
      'arianegroup'
    ]);
    expect(response.companies[0]).toMatchObject({
      name: 'ARIANEGROUP SAS',
      siret: '51903224700099',
      city: 'Le Haillan',
      match_quality: 'close',
      match_explanation: 'Correspondance par nom concatene'
    });
  });

  it('completes short trailing prefixes before retrying collapsed company names', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const query = new URL(String(requestUrl)).searchParams.get('q');

      if (query === 'ariane g' || query === 'arianeg') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      if (query === 'ariane') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '912490232',
              nom_complet: 'ARIANE GROUP OMNISPORTS RASSEMBLEMENT ASSOCIATIF',
              nom_raison_sociale: 'ARIANE GROUP OMNISPORTS RASSEMBLEMENT ASSOCIATIF',
              siege: {
                siret: '91249023200015',
                adresse: '17 avenue Ariane',
                code_postal: '33185',
                libelle_commune: 'Le Haillan',
                departement: '33',
                est_siege: true,
                activite_principale: '93.12Z'
              },
              matching_etablissements: []
            }, {
              siren: '782001275',
              nom_complet: 'COMITE SOCIAL ET ECONOMIQUE ATLANTIQUE ARIANE GROUP',
              nom_raison_sociale: 'COMITE SOCIAL ET ECONOMIQUE ATLANTIQUE ARIANE GROUP',
              siege: {
                siret: '78200127500010',
                adresse: 'Rue du General Niox',
                code_postal: '33160',
                libelle_commune: 'Saint-Medard-en-Jalles',
                departement: '33',
                est_siege: true,
                activite_principale: '94.99Z'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'arianegroup') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '519032247',
              nom_complet: 'ARIANEGROUP SAS',
              nom_raison_sociale: 'ARIANEGROUP SAS',
              siege: {
                siret: '51903224700040',
                adresse: '51 route de Verneuil',
                code_postal: '78130',
                libelle_commune: 'Les Mureaux',
                departement: '78',
                est_siege: true,
                activite_principale: '30.30Z'
              },
              matching_etablissements: [{
                siret: '51903224700099',
                adresse: 'Les Cinq Chemins',
                code_postal: '33185',
                libelle_commune: 'Le Haillan',
                departement: '33',
                est_siege: false,
                activite_principale: '30.30Z'
              }]
            }]
          })
        };
      }

      if (query === 'ariane group') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '912490232',
              nom_complet: 'ARIANE GROUP OMNISPORTS RASSEMBLEMENT ASSOCIATIF',
              nom_raison_sociale: 'ARIANE GROUP OMNISPORTS RASSEMBLEMENT ASSOCIATIF',
              siege: {
                siret: '91249023200015',
                adresse: '17 avenue Ariane',
                code_postal: '33185',
                libelle_commune: 'Le Haillan',
                departement: '33',
                est_siege: true,
                activite_principale: '93.12Z'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'ariane g',
      department: '33'
    });

    expect(fetchMock.mock.calls.map(([requestUrl]) => new URL(String(requestUrl)).searchParams.get('q'))).toEqual([
      'ariane g',
      'arianeg',
      'ariane',
      'ariane',
      'ariane',
      'arianegroup'
    ]);
    expect(response.companies[0]).toMatchObject({
      name: 'ARIANEGROUP SAS',
      siret: '51903224700099',
      city: 'Le Haillan',
      match_quality: 'expanded',
      match_explanation: 'Resultat retrouve via recherche contextuelle'
    });
  });

  it('finds spaced sigles and applies the city filter to establishments', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const url = new URL(String(requestUrl));
      const query = url.searchParams.get('q');
      const page = Number(url.searchParams.get('page'));

      if (query === 'ceria' && page === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '334580420',
              nom_complet: 'CTRE ETUDE REALISAT INFORMATIQ AQUITAINE (CERIA)',
              nom_raison_sociale: 'CTRE ETUDE REALISAT INFORMATIQ AQUITAINE',
              siege: {
                siret: '33458042000019',
                adresse: '74 rue Gambetta',
                code_postal: '33000',
                libelle_commune: 'Bordeaux',
                departement: '33',
                est_siege: true,
                activite_principale: '72.3Z'
              },
              matching_etablissements: []
            }, {
              siren: '394519144',
              nom_complet: "CONSEIL, ETUDE, REALISATION POUR L'INNOVATION EN AQUITAINE (CERIA)",
              nom_raison_sociale: "CONSEIL, ETUDE, REALISATION POUR L'INNOVATION EN AQUITAINE",
              siege: {
                siret: '39451914400023',
                adresse: '44 quai de Bacalan',
                code_postal: '33000',
                libelle_commune: 'Bordeaux',
                departement: '33',
                est_siege: false,
                activite_principale: '70.22Z'
              },
              matching_etablissements: []
            }]
          })
        };
      }

      if (query === 'c e r i a' && page === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '487440950',
              nom_complet: 'CONCEPTION D EQUIPEMENTS ET REALISATIONS INDUSTRIELLES D AQUITAINE (C E R I A)',
              nom_raison_sociale: 'CONCEPTION D EQUIPEMENTS ET REALISATIONS INDUSTRIELLES D AQUITAINE',
              siege: {
                siret: '48744095000011',
                adresse: '354 rue de Fourchette',
                code_postal: '40370',
                libelle_commune: 'Rion-des-Landes',
                departement: '40',
                est_siege: true,
                activite_principale: '33.20C'
              },
              matching_etablissements: [{
                siret: '48744095000029',
                adresse: 'Avenue Louis de Broglie',
                code_postal: '33600',
                libelle_commune: 'Pessac',
                departement: '33',
                est_siege: false,
                activite_principale: '33.20C'
              }]
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'CERIA',
      department: '33',
      city: 'Pessac'
    });

    expect(fetchMock.mock.calls.some(([requestUrl]) => new URL(String(requestUrl)).searchParams.get('ville') === 'Pessac')).toBe(true);
    expect(response.companies).toHaveLength(1);
    expect(response.companies[0]).toMatchObject({
      name: 'CONCEPTION D EQUIPEMENTS ET REALISATIONS INDUSTRIELLES D AQUITAINE (C E R I A)',
      siret: '48744095000029',
      city: 'Pessac',
      match_quality: 'close',
      match_explanation: 'Correspondance par sigle'
    });
  });

  it('widens short sigle queries with contextual tokens from exact matches', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const url = new URL(String(requestUrl));
      const query = url.searchParams.get('q');
      const page = Number(url.searchParams.get('page'));

      if (query === 'ase' && page === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '458203767',
              nom_complet: 'ENTREPRISE TRAVAUX PUBLICS ET ROUTIERS (ETPR)',
              nom_raison_sociale: 'ENTREPRISE TRAVAUX PUBLICS ET ROUTIERS',
              siege: {
                siret: '45820376700048',
                adresse: '3 avenue de la Grange Noire',
                code_postal: '33700',
                libelle_commune: 'Merignac',
                departement: '33',
                est_siege: true,
                activite_principale: '42.11Z'
              },
              matching_etablissements: []
            }, {
              siren: '788773737',
              nom_complet: 'AQUITAINE SPECIALISTES ETANCHEITE (ASE)',
              nom_raison_sociale: 'AQUITAINE SPECIALISTES ETANCHEITE',
              siege: {
                siret: '78877373700018',
                adresse: '9 rue des Palus',
                code_postal: '33450',
                libelle_commune: 'Saint-Loubes',
                departement: '33',
                est_siege: true,
                activite_principale: '43.91A'
              },
              matching_etablissements: []
            }, {
              siren: '815353933',
              nom_complet: 'ACTI SOLUS ELEC (AQUITAINE SOLUTIONS ENERGIES) (ASE)',
              nom_raison_sociale: 'ACTI SOLUS ELEC',
              siege: {
                siret: '81535393300022',
                adresse: '96 rue Judaïque',
                code_postal: '33000',
                libelle_commune: 'Bordeaux',
                departement: '33',
                est_siege: true,
                activite_principale: '43.21A'
              },
              matching_etablissements: [{
                siret: '81535393300048',
                adresse: '11 avenue de Berlincan',
                code_postal: '33610',
                libelle_commune: 'Cestas',
                departement: '33',
                est_siege: false,
                activite_principale: '43.21A'
              }]
            }]
          })
        };
      }

      if (query === 'ase' && page === 2) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      if (query === 'ase aquitaine' && page === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '472202639',
              nom_complet: 'AQUITAINE SERVICE ELECTRIQUE (ASE, SEREM)',
              nom_raison_sociale: 'AQUITAINE SERVICE ELECTRIQUE',
              siege: {
                siret: '47220263900036',
                adresse: '17 avenue Neil Armstrong',
                code_postal: '33700',
                libelle_commune: 'Merignac',
                departement: '33',
                est_siege: true,
                activite_principale: '43.21A'
              },
              matching_etablissements: [{
                siret: '47220263900051',
                adresse: '17 avenue Neil Armstrong',
                code_postal: '33700',
                libelle_commune: 'Merignac',
                departement: '33',
                est_siege: false,
                activite_principale: '43.21A'
              }]
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'ASE',
      department: '33',
      city: 'Merignac'
    });

    expect(fetchMock.mock.calls.map(([requestUrl]) => new URL(String(requestUrl)).searchParams.get('q'))).toEqual([
      'ase',
      'ase',
      'ase aquitaine'
    ]);
    expect(response.companies[0]).toMatchObject({
      name: 'AQUITAINE SERVICE ELECTRIQUE (ASE, SEREM)',
      siret: '47220263900051',
      city: 'Merignac',
      match_quality: 'expanded',
      match_explanation: 'Resultat retrouve via recherche contextuelle'
    });
  });

  it('keeps acronym matches visible for short single-token queries', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const url = new URL(String(requestUrl));
      const query = url.searchParams.get('q');

      if (query === 'ceria') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [1, 2, 3, 4, 5].map((index) => ({
              siren: `35122028${index}`,
              nom_complet: `CERIA ${index}`,
              nom_raison_sociale: `CERIA ${index}`,
              siege: {
                siret: `35122028${index}0001${index}`,
                adresse: `${index} rue test`,
                code_postal: `6800${index}`,
                libelle_commune: `Ville ${index}`,
                departement: '68',
                est_siege: true,
                activite_principale: '33.20C'
              },
              matching_etablissements: []
            }))
          })
        };
      }

      if (query === 'c e r i a') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{
              siren: '487440950',
              nom_complet: 'CONCEPTION D EQUIPEMENTS ET REALISATIONS INDUSTRIELLES D AQUITAINE (C E R I A)',
              nom_raison_sociale: 'CONCEPTION D EQUIPEMENTS ET REALISATIONS INDUSTRIELLES D AQUITAINE',
              siege: {
                siret: '48744095000011',
                adresse: '354 rue de Fourchette',
                code_postal: '40370',
                libelle_commune: 'Rion-des-Landes',
                departement: '40',
                est_siege: true,
                activite_principale: '33.20C'
              },
              matching_etablissements: [{
                siret: '48744095000029',
                adresse: 'Avenue Louis de Broglie',
                code_postal: '33600',
                libelle_commune: 'Pessac',
                departement: '33',
                est_siege: false,
                activite_principale: '33.20C'
              }]
            }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'CERIA'
    });

    expect(fetchMock.mock.calls.map(([requestUrl]) => new URL(String(requestUrl)).searchParams.get('q'))).toEqual([
      'ceria',
      'c e r i a'
    ]);
    expect(response.companies.some((company) => company.siren === '487440950')).toBe(true);
  });

  it('paginates company search by company groups instead of raw establishments', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const query = new URL(String(requestUrl)).searchParams.get('q');
      if (query !== 'eiffage') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [{
            siren: '709802094',
            nom_complet: 'EIFFAGE',
            nom_raison_sociale: 'EIFFAGE',
            siege: {
              siret: '70980209401148',
              adresse: '3 place de l Europe',
              code_postal: '78140',
              libelle_commune: 'Velizy-Villacoublay',
              departement: '78',
              est_siege: true,
              activite_principale: '70.10Z'
            },
            matching_etablissements: Array.from({ length: 10 }, (_, index) => ({
              siret: `70980209402${index.toString().padStart(3, '0')}`,
              adresse: `${index + 1} rue test`,
              code_postal: '75000',
              libelle_commune: `Paris ${index + 1}`,
              departement: '75',
              est_siege: index === 0,
              activite_principale: '70.10Z'
            }))
          }, {
            siren: '352745749',
            nom_complet: 'EIFFAGE GENIE CIVIL',
            nom_raison_sociale: 'EIFFAGE GENIE CIVIL',
            siege: {
              siret: '35274574900759',
              adresse: '3 place de l Europe',
              code_postal: '78140',
              libelle_commune: 'Velizy-Villacoublay',
              departement: '78',
              est_siege: true,
              activite_principale: '42.13A'
            },
            matching_etablissements: []
          }, {
            siren: '402096267',
            nom_complet: 'EIFFAGE ROUTE NORD EST',
            nom_raison_sociale: 'EIFFAGE ROUTE NORD EST',
            siege: {
              siret: '40209626700651',
              adresse: '9 rue des Docks Remois',
              code_postal: '51100',
              libelle_commune: 'Reims',
              departement: '51',
              est_siege: true,
              activite_principale: '42.11Z'
            },
            matching_etablissements: []
          }]
        })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'eiffage'
    });

    expect(new Set(response.companies.map((company) => company.siren)).size).toBe(3);
  });

  it('ignores incomplete establishments from the public API instead of failing the whole search', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    const fetchMock = vi.fn(async (requestUrl: string | URL) => {
      const query = new URL(String(requestUrl)).searchParams.get('q');
      if (query !== 'eiffage') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [{
            siren: '709802094',
            nom_complet: 'EIFFAGE',
            nom_raison_sociale: 'EIFFAGE',
            siege: {
              adresse: '3 place de l Europe',
              code_postal: '78140',
              libelle_commune: 'Velizy-Villacoublay',
              departement: '78',
              est_siege: true,
              activite_principale: '70.10Z'
            },
            matching_etablissements: []
          }, {
            siren: '352745749',
            nom_complet: 'EIFFAGE GENIE CIVIL',
            nom_raison_sociale: 'EIFFAGE GENIE CIVIL',
            siege: {
              siret: '35274574900759',
              adresse: '3 place de l Europe',
              code_postal: '78140',
              libelle_commune: 'Velizy-Villacoublay',
              departement: '78',
              est_siege: true,
              activite_principale: '42.13A'
            },
            matching_etablissements: []
          }]
        })
      };
    });

    mockInvokeTrpc.mockRejectedValue(missingRouteError);
    vi.stubGlobal('fetch', fetchMock);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'eiffage'
    });

    expect(response.companies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          siren: '709802094',
          siret: null
        }),
        expect.objectContaining({
          siren: '352745749',
          siret: '35274574900759'
        })
      ])
    );
  });
});
