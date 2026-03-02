import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInteractionSearch } from '@/hooks/useInteractionSearch';
import type { Entity, EntityContact } from '@/types';

const searchMocks = vi.hoisted(() => ({
  useEntitySearchIndex: vi.fn()
}));

vi.mock('@/hooks/useEntitySearchIndex', () => ({
  useEntitySearchIndex: searchMocks.useEntitySearchIndex
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
  name: overrides?.name ?? 'Acme',
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

describe('useInteractionSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMocks.useEntitySearchIndex.mockReturnValue({
      data: { entities: [], contacts: [] },
      isLoading: false,
      isError: false
    });
  });

  it('returns search results and clears state after selection', async () => {
    const onSelectEntity = vi.fn();
    const onSelectContact = vi.fn();
    const entity = createEntity();
    const contact = createContact();

    const { result } = renderHook(() =>
      useInteractionSearch({
        agencyId: 'agency-1',
        entityType: 'Client',
        entities: [entity],
        contacts: [contact],
        onSelectEntity,
        onSelectContact
      })
    );

    act(() => {
      result.current.setIsOpen(true);
      result.current.setQuery('acme');
    });

    await waitFor(() => {
      expect(result.current.panelState.status).toBe('results');
    });
    expect(result.current.limitedEntities).toHaveLength(1);

    act(() => {
      result.current.handleSelectEntity(entity);
    });

    expect(onSelectEntity).toHaveBeenCalledWith(entity);
    expect(result.current.query).toBe('');
    expect(result.current.isOpen).toBe(false);
  });

  it('exposes error panel state when search index query fails', async () => {
    searchMocks.useEntitySearchIndex.mockImplementation((agencyId, includeArchived) => ({
      data: { entities: [], contacts: [] },
      isLoading: false,
      isError: !includeArchived && Boolean(agencyId)
    }));

    const { result } = renderHook(() =>
      useInteractionSearch({
        agencyId: 'agency-1',
        entityType: 'Client',
        entities: [],
        contacts: [],
        onSelectEntity: vi.fn(),
        onSelectContact: vi.fn()
      })
    );

    act(() => {
      result.current.setQuery('acme');
    });

    await waitFor(() => {
      expect(result.current.panelState.status).toBe('error');
    });
  });

  it('filters recent entities by relation and can include archived index', async () => {
    const liveEntity = createEntity({ id: 'entity-live', name: 'Live Client', entity_type: 'Client' });
    const archivedEntity = createEntity({
      id: 'entity-archived',
      name: 'Archived Client',
      entity_type: 'Client',
      archived_at: '2026-01-10T10:00:00.000Z'
    });

    searchMocks.useEntitySearchIndex.mockImplementation((agencyId, includeArchived) => ({
      data: {
        entities: includeArchived && Boolean(agencyId) ? [archivedEntity] : [liveEntity],
        contacts: []
      },
      isLoading: false,
      isError: false
    }));

    const { result } = renderHook(() =>
      useInteractionSearch({
        agencyId: 'agency-1',
        entityType: 'Client',
        entities: [],
        contacts: [],
        recentEntities: [
          createEntity({ id: 'recent-client', name: 'Recent Client', entity_type: 'Client' }),
          createEntity({ id: 'recent-prospect', name: 'Recent Prospect', entity_type: 'Prospect' })
        ],
        onSelectEntity: vi.fn(),
        onSelectContact: vi.fn()
      })
    );

    expect(result.current.filteredRecents).toHaveLength(1);
    expect(result.current.filteredRecents[0]?.id).toBe('recent-client');

    act(() => {
      result.current.setIncludeArchived(true);
      result.current.setQuery('archived');
    });

    await waitFor(() => {
      expect(result.current.limitedEntities[0]?.id).toBe('entity-archived');
    });
  });
});
