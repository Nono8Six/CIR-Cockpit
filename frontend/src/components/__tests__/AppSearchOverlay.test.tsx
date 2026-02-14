import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppSearchOverlay from '@/components/AppSearchOverlay';
import type { Entity, EntityContact, Interaction } from '@/types';
import { handleUiError } from '@/services/errors/handleUiError';

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

const buildEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'entity-1',
  account_type: 'term',
  address: null,
  agency_id: 'agency-1',
  archived_at: null,
  city: 'Paris',
  client_number: '001122',
  country: 'FR',
  created_at: '2025-01-01T00:00:00Z',
  created_by: null,
  department: '75',
  entity_type: 'Client',
  name: 'P04_TEST_CLIENT',
  notes: null,
  postal_code: '75001',
  siret: null,
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  searchQuery: '',
  onSearchQueryChange: vi.fn(),
  filteredInteractions: [] as Interaction[],
  filteredClients: [] as Entity[],
  filteredProspects: [] as Entity[],
  filteredContacts: [] as EntityContact[],
  hasSearchResults: false,
  isEntitySearchLoading: false,
  entitySearchError: null,
  onRetrySearch: vi.fn(async () => null),
  entityNameById: new Map<string, string>(),
  onOpenInteraction: vi.fn(),
  onFocusClient: vi.fn(),
  onRequestConvert: vi.fn()
};

describe('AppSearchOverlay', () => {
  it('shows guidance message when query is empty', () => {
    render(<AppSearchOverlay {...baseProps} />);

    expect(screen.getByTestId('app-search-status-live')).toHaveTextContent(/commencez a taper pour rechercher/i);
  });

  it('selects a client with keyboard Enter', async () => {
    const user = userEvent.setup();
    const onFocusClient = vi.fn();
    const onSearchQueryChange = vi.fn();

    render(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="P04_TEST_CLIENT"
        onSearchQueryChange={onSearchQueryChange}
        hasSearchResults
        filteredClients={[buildEntity()]}
        onFocusClient={onFocusClient}
      />
    );

    const input = screen.getByTestId('app-search-input');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onFocusClient).toHaveBeenCalledWith('entity-1', undefined);
  });

  it('reports retry errors through handleUiError', async () => {
    const user = userEvent.setup();
    const onRetrySearch = vi.fn(async () => {
      throw new Error('network');
    });

    render(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="p04"
        entitySearchError={new Error('boom')}
        onRetrySearch={onRetrySearch}
      />
    );

    await user.click(screen.getByRole('button', { name: /reessayer/i }));

    await waitFor(() => {
      expect(handleUiError).toHaveBeenCalled();
    });
  });
});
