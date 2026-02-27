import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import InteractionSearchBar from './InteractionSearchBar';
import { renderWithProviders } from '@/__tests__/test-utils';
import { Entity, EntityContact } from '@/types';
import { useEntitySearchIndex } from '@/hooks/useEntitySearchIndex';

type SearchHookReturn = {
  data?: { entities: Entity[]; contacts: EntityContact[] };
  isLoading: boolean;
  isError: boolean;
};

vi.mock('@/hooks/useEntitySearchIndex', () => ({
  useEntitySearchIndex: vi.fn()
}));

const buildEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'entity-1',
  account_type: 'term',
  address: '1 rue test',
  agency_id: 'agency-1',
  archived_at: null,
  city: 'Paris',
  client_number: '000123',
  country: 'FR',
  created_at: '2025-01-01T00:00:00Z',
  created_by: null,
  department: '75',
  entity_type: 'Client',
  name: 'Client Alpha',
  notes: null,
  postal_code: '75001',
  siret: null,
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

const buildContact = (overrides: Partial<EntityContact> = {}): EntityContact => ({
  id: 'contact-1',
  entity_id: 'entity-1',
  archived_at: null,
  created_at: '2025-01-01T00:00:00Z',
  email: null,
  first_name: 'Alice',
  last_name: 'Martin',
  notes: null,
  phone: null,
  position: null,
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

const mockSearchHook = (implementation: (includeArchived: boolean) => SearchHookReturn) => {
  const hookMock = vi.mocked(useEntitySearchIndex);
  hookMock.mockImplementation((_agencyId: string | null, includeArchived: boolean) => ({
    ...implementation(includeArchived),
    error: null
  }) as ReturnType<typeof useEntitySearchIndex>);
};

const normalizeText = (value: string) => value.replace(/\s/g, '').toLowerCase();

const findOptionByText = (label: string) => {
  const normalized = normalizeText(label);
  return screen
    .getAllByRole('option')
    .find((option) => normalizeText(option.textContent ?? '').includes(normalized));
};

describe('InteractionSearchBar', () => {
  it('limits results to 3 entities and 2 contacts (max 5 total) and filters by relation', async () => {
    mockSearchHook(() => ({ data: { entities: [], contacts: [] }, isLoading: false, isError: false }));
    const user = userEvent.setup();

    const entities = [
      buildEntity({ id: 'c1', name: 'Alpha', client_number: '000001', city: 'Paris', entity_type: 'Client' }),
      buildEntity({ id: 'c2', name: 'Beta', client_number: '000002', city: 'Lyon', entity_type: 'Client' }),
      buildEntity({ id: 'c3', name: 'Gamma', client_number: '000003', city: 'Lille', entity_type: 'Client' }),
      buildEntity({ id: 'c4', name: 'Delta', client_number: '000004', city: 'Bordeaux', entity_type: 'Client' }),
      buildEntity({ id: 'p1', name: 'Prospect A', client_number: null, city: 'Nantes', entity_type: 'Prospect' })
    ];
    const contacts = [
      buildContact({ id: 'ct1', first_name: 'Aaron', last_name: 'A', entity_id: 'c1' }),
      buildContact({ id: 'ct2', first_name: 'Aline', last_name: 'A', entity_id: 'c1' }),
      buildContact({ id: 'ct3', first_name: 'Ava', last_name: 'A', entity_id: 'c1' }),
      buildContact({ id: 'ct4', first_name: 'Ada', last_name: 'Prospect', entity_id: 'p1' })
    ];

    renderWithProviders(
      <InteractionSearchBar
        agencyId="agency-1"
        entityType="Client"
        entities={entities}
        contacts={contacts}
        onSelectEntity={vi.fn()}
        onSelectContact={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/rechercher entite/i);
    await user.type(input, 'a');

    expect(findOptionByText('Alpha')).toBeTruthy();
    expect(findOptionByText('Beta')).toBeTruthy();
    expect(findOptionByText('Gamma')).toBeTruthy();
    expect(findOptionByText('Delta')).toBeFalsy();
    expect(findOptionByText('Prospect A')).toBeFalsy();

    expect(findOptionByText('Aaron A')).toBeTruthy();
    expect(findOptionByText('Aline A')).toBeTruthy();
    expect(findOptionByText('Ava A')).toBeFalsy();
    expect(findOptionByText('Ada Prospect')).toBeFalsy();
  });

  it('loads archived results on toggle and shows the archive badge', async () => {
    const archivedEntity = buildEntity({
      id: 'archived',
      name: 'Archive Client',
      archived_at: '2025-01-01T00:00:00Z'
    });

    mockSearchHook((includeArchived) => {
      if (includeArchived) {
        return { data: { entities: [archivedEntity], contacts: [] }, isLoading: false, isError: false };
      }
      return { data: { entities: [], contacts: [] }, isLoading: false, isError: false };
    });

    const user = userEvent.setup();
    const onOpenGlobalSearch = vi.fn();

    renderWithProviders(
      <InteractionSearchBar
        agencyId="agency-1"
        entities={[]}
        contacts={[]}
        onSelectEntity={vi.fn()}
        onSelectContact={vi.fn()}
        onOpenGlobalSearch={onOpenGlobalSearch}
      />
    );

    await user.click(screen.getByLabelText('Afficher les entites archivees'));
    await user.type(screen.getByPlaceholderText(/rechercher entite/i), 'archive');

    const archivedOption = findOptionByText('Archive Client');
    expect(archivedOption).toBeTruthy();
    const archiveLabels = within(archivedOption as HTMLElement).getAllByText('Archive');
    expect(archiveLabels.some((label) => label.className.includes('bg-warning/15'))).toBe(true);

    await user.click(screen.getByRole('button', { name: /voir tout/i }));
    expect(onOpenGlobalSearch).toHaveBeenCalledTimes(1);
  });
});
