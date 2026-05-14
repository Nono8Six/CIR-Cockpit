import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';

import type { TierV1DirectoryRow, TierV1SearchInput } from 'shared/schemas/tier-v1.schema';
import InteractionSearchBar from '../InteractionSearchBar';
import { renderWithProviders } from '@/__tests__/test-utils';
import type { Entity, EntityContact } from '@/types';
import { useUnifiedEntitySearch } from '@/hooks/useUnifiedEntitySearch';

type SearchHookReturn = {
  data?: { ok: true; results: TierV1DirectoryRow[] };
  isFetching: boolean;
  isError: boolean;
};

vi.mock('@/hooks/useUnifiedEntitySearch', () => ({
  useUnifiedEntitySearch: vi.fn()
}));

const buildResult = (overrides: Partial<TierV1DirectoryRow> = {}): TierV1DirectoryRow => ({
  id: 'entity-1',
  source: 'entity',
  type: 'client_term',
  label: 'Client Alpha',
  identifier: '000123',
  phone: null,
  email: null,
  city: 'Paris',
  agency_name: 'Agence Paris',
  referent_name: null,
  updated_at: '2025-01-01T00:00:00Z',
  archived_at: null,
  ...overrides
});

const mockUnifiedSearch = (implementation: (input: TierV1SearchInput) => SearchHookReturn) => {
  vi.mocked(useUnifiedEntitySearch).mockImplementation((input) =>
    implementation(input) as ReturnType<typeof useUnifiedEntitySearch>
  );
};

const renderSearch = (
  overrides: Partial<ComponentProps<typeof InteractionSearchBar>> = {}
) => {
  const props = {
    agencyId: 'agency-1',
    entityType: 'Client à terme',
    entities: [] as Entity[],
    contacts: [] as EntityContact[],
    onSelectEntity: vi.fn(),
    onSelectContact: vi.fn(),
    onSelectSearchResult: vi.fn(),
    showTypeBadge: true,
    ...overrides
  };

  renderWithProviders(<InteractionSearchBar {...props} />);
  return props;
};

const normalizeText = (value: string) => value.replace(/\s/g, '').toLowerCase();

const findOptionByText = (label: string) => {
  const normalized = normalizeText(label);
  return screen
    .getAllByRole('option')
    .find((option) => normalizeText(option.textContent ?? '').includes(normalized));
};

describe('InteractionSearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnifiedSearch((): SearchHookReturn => ({
      data: { ok: true, results: [] },
      isFetching: false,
      isError: false
    }));
  });

  it('affiche les resultats backend unifies et selectionne un type coherent', async () => {
    const result = buildResult();
    mockUnifiedSearch((): SearchHookReturn => ({
      data: { ok: true, results: [result] },
      isFetching: false,
      isError: false
    }));
    const user = userEvent.setup();
    const props = renderSearch();

    await user.type(screen.getByPlaceholderText(/rechercher entité/i), 'alpha');

    const option = await waitFor(() => findOptionByText('Client Alpha'));
    expect(option).toBeTruthy();
    expect(option).toHaveTextContent('Client à terme');

    await user.click(option as HTMLElement);

    expect(props.onSelectSearchResult).toHaveBeenCalledWith(result);
  });

  it('demande confirmation avant de basculer sur un resultat cross-type', async () => {
    const crossTypeResult = buildResult({
      id: 'cash-client',
      type: 'client_cash',
      label: 'Client Comptant'
    });
    mockUnifiedSearch((): SearchHookReturn => ({
      data: { ok: true, results: [crossTypeResult] },
      isFetching: false,
      isError: false
    }));
    const user = userEvent.setup();
    const props = renderSearch({ entityType: 'Prospect' });

    await user.type(screen.getByPlaceholderText(/rechercher entité/i), 'comptant');
    await user.click(await waitFor(() => findOptionByText('Client Comptant')) as HTMLElement);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/classé Client comptant/i)).toBeInTheDocument();
    expect(props.onSelectSearchResult).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Basculer vers ce type/i }));

    expect(props.onSelectSearchResult).toHaveBeenCalledWith(crossTypeResult);
  });

  it('alimente la recherche avec le toggle archives et affiche le badge archive', async () => {
    const archivedResult = buildResult({
      id: 'archived',
      label: 'Archive Client',
      archived_at: '2025-01-01T00:00:00Z'
    });
    mockUnifiedSearch((input): SearchHookReturn => ({
      data: { ok: true, results: input.include_archived ? [archivedResult] : [] },
      isFetching: false,
      isError: false
    }));
    const user = userEvent.setup();
    const onOpenGlobalSearch = vi.fn();

    renderSearch({ onOpenGlobalSearch });

    await user.click(screen.getByLabelText('Afficher les entites archivees'));
    await user.type(screen.getByPlaceholderText(/rechercher entité/i), 'archive');

    const archivedOption = await waitFor(() => findOptionByText('Archive Client'));
    expect(archivedOption).toBeTruthy();
    expect(within(archivedOption as HTMLElement).getAllByText('Archive').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /voir tout/i }));
    expect(onOpenGlobalSearch).toHaveBeenCalledTimes(1);
  });
});
