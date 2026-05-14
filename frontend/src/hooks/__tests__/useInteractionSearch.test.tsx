import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TierV1DirectoryRow, TierV1SearchInput } from 'shared/schemas/tier-v1.schema';
import { useInteractionSearch } from '@/hooks/useInteractionSearch';
import { useUnifiedEntitySearch } from '@/hooks/useUnifiedEntitySearch';
import type { Entity, EntityContact } from '@/types';

type SearchHookReturn = {
  data?: { ok: true; results: TierV1DirectoryRow[] };
  isFetching: boolean;
  isError: boolean;
};

vi.mock('@/hooks/useUnifiedEntitySearch', () => ({
  useUnifiedEntitySearch: vi.fn()
}));

const createEntity = (overrides?: Partial<Entity>): Entity => ({
  id: overrides?.id ?? 'entity-1',
  account_type: overrides?.account_type ?? null,
  address: overrides?.address ?? null,
  agency_id: overrides?.agency_id ?? 'agency-1',
  archived_at: overrides?.archived_at ?? null,
  city: overrides?.city ?? 'Paris',
  client_number: overrides?.client_number ?? 'C-001',
  country: overrides?.country ?? 'France',
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  created_by: overrides?.created_by ?? null,
  department: overrides?.department ?? null,
  entity_type: overrides?.entity_type ?? 'Client',
  name: overrides?.name ?? 'Client recent',
  notes: overrides?.notes ?? null,
  postal_code: overrides?.postal_code ?? null,
  siret: overrides?.siret ?? null,
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z'
});

const createContact = (overrides?: Partial<EntityContact>): EntityContact => ({
  id: overrides?.id ?? 'contact-1',
  archived_at: overrides?.archived_at ?? null,
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  email: overrides?.email ?? 'alice@example.com',
  entity_id: overrides?.entity_id ?? 'entity-1',
  first_name: overrides?.first_name ?? 'Alice',
  last_name: overrides?.last_name ?? 'Martin',
  notes: overrides?.notes ?? null,
  phone: overrides?.phone ?? '0102030405',
  position: overrides?.position ?? null,
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z'
});

const createResult = (overrides?: Partial<TierV1DirectoryRow>): TierV1DirectoryRow => ({
  id: overrides?.id ?? 'entity-1',
  source: overrides?.source ?? 'entity',
  type: overrides?.type ?? 'client_term',
  label: overrides?.label ?? 'Client Alpha',
  identifier: overrides?.identifier ?? 'C-001',
  phone: overrides?.phone ?? null,
  email: overrides?.email ?? null,
  city: overrides?.city ?? 'Paris',
  agency_name: overrides?.agency_name ?? null,
  referent_name: overrides?.referent_name ?? null,
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z',
  archived_at: overrides?.archived_at ?? null
});

const mockUnifiedSearch = (implementation: (input: TierV1SearchInput) => SearchHookReturn) => {
  vi.mocked(useUnifiedEntitySearch).mockImplementation((input) =>
    implementation(input) as ReturnType<typeof useUnifiedEntitySearch>
  );
};

describe('useInteractionSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnifiedSearch(() => ({
      data: { ok: true, results: [] },
      isFetching: false,
      isError: false
    }));
  });

  it('returns unified backend results and clears state after selection', async () => {
    const onSelectSearchResult = vi.fn();
    const resultRow = createResult();
    mockUnifiedSearch(() => ({
      data: { ok: true, results: [resultRow] },
      isFetching: false,
      isError: false
    }));

    const { result } = renderHook(() =>
      useInteractionSearch({
        agencyId: 'agency-1',
        entityType: 'Client à terme',
        entities: [],
        contacts: [],
        onSelectEntity: vi.fn(),
        onSelectContact: vi.fn(),
        onSelectSearchResult
      })
    );

    act(() => {
      result.current.setIsOpen(true);
      result.current.setQuery('alpha');
    });

    await waitFor(() => {
      expect(result.current.panelState.status).toBe('results');
    });
    expect(result.current.limitedResults).toHaveLength(1);

    act(() => {
      result.current.handleSelectSearchResult(resultRow);
    });

    expect(onSelectSearchResult).toHaveBeenCalledWith(resultRow);
    expect(result.current.query).toBe('');
    expect(result.current.isOpen).toBe(false);
  });

  it('opens cross-type confirmation before committing a different relation', () => {
    const onSelectSearchResult = vi.fn();
    const resultRow = createResult({ type: 'client_cash' });

    const { result } = renderHook(() =>
      useInteractionSearch({
        agencyId: 'agency-1',
        entityType: 'Prospect',
        entities: [],
        contacts: [],
        onSelectEntity: vi.fn(),
        onSelectContact: vi.fn(),
        onSelectSearchResult
      })
    );

    act(() => {
      result.current.handleSelectSearchResult(resultRow);
    });

    expect(result.current.pendingResult).toEqual(resultRow);
    expect(onSelectSearchResult).not.toHaveBeenCalled();

    act(() => {
      result.current.handleConfirmPendingResult();
    });

    expect(onSelectSearchResult).toHaveBeenCalledWith(resultRow);
    expect(result.current.pendingResult).toBeNull();
  });

  it('exposes error panel state when unified search query fails', async () => {
    mockUnifiedSearch(() => ({
      data: { ok: true, results: [] },
      isFetching: false,
      isError: true
    }));

    const { result } = renderHook(() =>
      useInteractionSearch({
        agencyId: 'agency-1',
        entityType: 'Client à terme',
        entities: [],
        contacts: [],
        onSelectEntity: vi.fn(),
        onSelectContact: vi.fn(),
        onSelectSearchResult: vi.fn()
      })
    );

    act(() => {
      result.current.setQuery('alpha');
    });

    await waitFor(() => {
      expect(result.current.panelState.status).toBe('error');
    });
  });

  it('filters recent entities by relation and sends archived toggle to backend search', async () => {
    const archivedResult = createResult({
      id: 'entity-archived',
      label: 'Archived Client',
      archived_at: '2026-01-10T10:00:00.000Z'
    });

    mockUnifiedSearch((input) => ({
      data: { ok: true, results: input.include_archived ? [archivedResult] : [] },
      isFetching: false,
      isError: false
    }));

    const { result } = renderHook(() =>
      useInteractionSearch({
        agencyId: 'agency-1',
        entityType: 'Client à terme',
        entities: [],
        contacts: [createContact()],
        recentEntities: [
          createEntity({ id: 'recent-client', name: 'Recent Client', entity_type: 'Client' }),
          createEntity({ id: 'recent-prospect', name: 'Recent Prospect', entity_type: 'Prospect' })
        ],
        onSelectEntity: vi.fn(),
        onSelectContact: vi.fn(),
        onSelectSearchResult: vi.fn()
      })
    );

    expect(result.current.filteredRecents).toHaveLength(1);
    expect(result.current.filteredRecents[0]?.id).toBe('recent-client');

    act(() => {
      result.current.setIncludeArchived(true);
      result.current.setQuery('archived');
    });

    await waitFor(() => {
      expect(result.current.limitedResults[0]?.id).toBe('entity-archived');
    });
  });
});
