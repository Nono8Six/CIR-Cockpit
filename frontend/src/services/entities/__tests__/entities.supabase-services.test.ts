import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { getEntityContacts } from '@/services/entities/getEntityContacts';
import { getEntitySearchIndex } from '@/services/entities/getEntitySearchIndex';
import { getProspects } from '@/services/entities/getProspects';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../supabase/requireSupabaseClient');
vi.mock('../../errors/mapPostgrestError');

type QueryResponse = {
  data: unknown;
  error: unknown;
  status: number;
};

type QueryMock = Promise<QueryResponse> & {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
};

const mockRequireSupabase = vi.mocked(requireSupabaseClient);
const mockMapPostgrestError = vi.mocked(mapPostgrestError);
const asSupabaseClient = (client: object): ReturnType<typeof requireSupabaseClient> =>
  client as unknown as ReturnType<typeof requireSupabaseClient>;

const createQuery = (response: QueryResponse): QueryMock => {
  const query = Promise.resolve(response) as QueryMock;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.is = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.or = vi.fn(() => query);
  return query;
};

describe('entities supabase services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads entity contacts and applies archived filter by default', async () => {
    const rows = [{ id: 'contact-1' }];
    const contactsQuery = createQuery({ data: rows, error: null, status: 200 });
    const select = vi.fn(() => contactsQuery);
    const from = vi.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    const result = await getEntityContacts('entity-1');

    expect(from).toHaveBeenCalledWith('entity_contacts');
    expect(select).toHaveBeenCalledWith('*');
    expect(contactsQuery.eq).toHaveBeenCalledWith('entity_id', 'entity-1');
    expect(contactsQuery.order).toHaveBeenCalledWith('last_name', { ascending: true });
    expect(contactsQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(result).toEqual(rows);
  });

  it('skips archived filter when includeArchived is true for contacts', async () => {
    const contactsQuery = createQuery({ data: [], error: null, status: 200 });
    const from = vi.fn(() => ({ select: vi.fn(() => contactsQuery) }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    await getEntityContacts('entity-2', true);

    expect(contactsQuery.is).not.toHaveBeenCalled();
  });

  it('maps entity contacts postgrest errors', async () => {
    const mappedError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur DB.',
      source: 'db'
    });
    mockMapPostgrestError.mockReturnValue(mappedError);

    const contactsQuery = createQuery({
      data: null,
      error: { message: 'boom' },
      status: 503
    });
    const from = vi.fn(() => ({ select: vi.fn(() => contactsQuery) }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    await expect(getEntityContacts('entity-3')).rejects.toBe(mappedError);
    expect(mockMapPostgrestError).toHaveBeenCalledWith(
      { message: 'boom' },
      {
        operation: 'read',
        resource: 'les contacts',
        status: 503
      }
    );
  });

  it('returns empty search index when agency id is missing', async () => {
    const result = await getEntitySearchIndex(null);
    expect(result).toEqual({ entities: [], contacts: [] });
    expect(mockRequireSupabase).not.toHaveBeenCalled();
  });

  it('loads entity search index with archived filtering', async () => {
    const entityRows = [{ id: 'entity-1' }];
    const contactRows = [{ id: 'contact-1' }];
    const entitiesQuery = createQuery({ data: entityRows, error: null, status: 200 });
    const contactsQuery = createQuery({ data: contactRows, error: null, status: 200 });

    const from = vi.fn((table: string) => {
      if (table === 'entities') {
        return { select: vi.fn(() => entitiesQuery) };
      }
      return { select: vi.fn(() => contactsQuery) };
    });
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    const result = await getEntitySearchIndex('agency-1');

    expect(entitiesQuery.eq).toHaveBeenCalledWith('agency_id', 'agency-1');
    expect(entitiesQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(contactsQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(result).toEqual({ entities: entityRows, contacts: contactRows });
  });

  it('maps entities search index errors first, then contacts errors', async () => {
    const mappedEntitiesError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur entities.',
      source: 'db'
    });
    const mappedContactsError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur contacts.',
      source: 'db'
    });

    const entitiesQueryWithError = createQuery({
      data: null,
      error: { source: 'entities' },
      status: 500
    });
    const contactsQueryOk = createQuery({ data: [], error: null, status: 200 });

    mockMapPostgrestError.mockReturnValueOnce(mappedEntitiesError);
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        from: vi.fn((table: string) =>
          table === 'entities'
            ? { select: vi.fn(() => entitiesQueryWithError) }
            : { select: vi.fn(() => contactsQueryOk) }
        )
      })
    );

    await expect(getEntitySearchIndex('agency-err')).rejects.toBe(mappedEntitiesError);

    const entitiesQueryOk = createQuery({ data: [], error: null, status: 200 });
    const contactsQueryWithError = createQuery({
      data: null,
      error: { source: 'contacts' },
      status: 500
    });

    mockMapPostgrestError.mockReset();
    mockMapPostgrestError.mockReturnValueOnce(mappedContactsError);
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        from: vi.fn((table: string) =>
          table === 'entities'
            ? { select: vi.fn(() => entitiesQueryOk) }
            : { select: vi.fn(() => contactsQueryWithError) }
        )
      })
    );

    await expect(getEntitySearchIndex('agency-err-2')).rejects.toBe(mappedContactsError);
  });

  it('loads prospects with expected filters and maps errors', async () => {
    const rows = [{ id: 'prospect-1' }];
    const prospectsQuery = createQuery({ data: rows, error: null, status: 200 });
    const from = vi.fn(() => ({ select: vi.fn(() => prospectsQuery) }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    const result = await getProspects({ agencyId: 'agency-1' });

    expect(from).toHaveBeenCalledWith('entities');
    expect(prospectsQuery.or).toHaveBeenCalledWith('entity_type.ilike.%prospect%,entity_type.ilike.%particulier%');
    expect(prospectsQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(prospectsQuery.eq).toHaveBeenCalledWith('agency_id', 'agency-1');
    expect(result).toEqual(rows);

    const orphanQuery = createQuery({ data: [], error: null, status: 200 });
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({ from: vi.fn(() => ({ select: vi.fn(() => orphanQuery) })) })
    );
    await getProspects({ includeArchived: true, orphansOnly: true });
    expect(orphanQuery.is).toHaveBeenCalledWith('agency_id', null);

    const mappedError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur prospects.',
      source: 'db'
    });
    mockMapPostgrestError.mockReturnValue(mappedError);
    const errorQuery = createQuery({ data: null, error: { msg: 'bad' }, status: 502 });
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({ from: vi.fn(() => ({ select: vi.fn(() => errorQuery) })) })
    );
    await expect(getProspects()).rejects.toBe(mappedError);
  });
});