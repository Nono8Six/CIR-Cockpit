import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppSearchOverlay from '@/components/AppSearchOverlay';
import { buildAppCommands } from '@/app/appCommands';
import { buildShellNavigation } from '@/app/appConstants';
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

const commandSpies = () => ({
  onNavigateTab: vi.fn(),
  onCreateEntity: vi.fn(),
  onCreateSupplier: vi.fn()
});

const buildCommands = (spies: ReturnType<typeof commandSpies>) =>
  buildAppCommands({
    sections: buildShellNavigation(true, 0),
    canAccessAdmin: true,
    ...spies
  });

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  searchQuery: '',
  onSearchQueryChange: vi.fn(),
  commands: buildCommands(commandSpies()),
  recentEntities: [] as Entity[],
  includeArchived: false,
  onIncludeArchivedChange: vi.fn(),
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
  onRequestConvert: vi.fn(),
  onCreateEntity: vi.fn()
};

describe('AppSearchOverlay', () => {
  it('shows guidance message when query is empty', () => {
    render(<AppSearchOverlay {...baseProps} />);

    expect(screen.getByTestId('app-search-status-live')).toHaveTextContent(/commencez à taper pour rechercher/i);
  });

  it('treats a scope prefix without text as idle guidance', () => {
    render(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="@"
      />
    );

    expect(screen.getByTestId('app-search-status-live')).toHaveTextContent(/commencez à taper pour rechercher/i);
  });

  const NAVIGATION_SECTIONS: Array<[string, string]> = [
    ['clients', 'Clients'],
    ['suppliers', 'Fournisseurs'],
    ['cockpit', 'Saisie'],
    ['dashboard', 'Pilotage'],
    ['referentials', 'Référentiels CIR'],
    ['admin', 'Admin'],
    ['settings', 'Paramètres']
  ];

  it('ouvre sur les recents et les creations, jamais sur un doublon du menu', () => {
    render(
      <AppSearchOverlay
        {...baseProps}
        recentEntities={[buildEntity()]}
      />
    );

    // Les recents sont des rangees de liste, donc atteignables aux fleches,
    // et non des pastilles que seule la souris peut viser.
    const recentRow = screen.getByTestId('app-search-recent-entity-1');
    expect(recentRow).toHaveAttribute('role', 'option');
    expect(recentRow).toHaveTextContent('P04_TEST_CLIENT');
    expect(screen.getByTestId('app-search-command-creation-entity')).toBeInTheDocument();

    for (const [tab] of NAVIGATION_SECTIONS) {
      expect(screen.queryByTestId(`app-search-command-navigation-${tab}`)).not.toBeInTheDocument();
    }
  });

  it('expose les 7 sections derriere le prefixe >', () => {
    render(<AppSearchOverlay {...baseProps} searchQuery=">" />);

    for (const [tab, label] of NAVIGATION_SECTIONS) {
      expect(screen.getByTestId(`app-search-command-navigation-${tab}`)).toHaveTextContent(label);
    }
  });

  it('atteint une section au clavier sans souris', async () => {
    const user = userEvent.setup();
    const spies = commandSpies();

    render(
      <AppSearchOverlay
        {...baseProps}
        commands={buildCommands(spies)}
        searchQuery="pilotage"
      />
    );

    const input = screen.getByTestId('app-search-input');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(spies.onNavigateTab).toHaveBeenCalledWith('dashboard');
  });

  it('reserve la liste aux commandes derriere le prefixe >', () => {
    render(
      <AppSearchOverlay
        {...baseProps}
        searchQuery=">créer"
        hasSearchResults
        filteredClients={[buildEntity()]}
      />
    );

    expect(screen.getByTestId('app-search-command-creation-entity')).toBeInTheDocument();
    expect(screen.queryByTestId('app-search-client-entity-1')).not.toBeInTheDocument();
  });

  it('selects a client with keyboard Enter', async () => {
    const user = userEvent.setup();
    const onFocusClient = vi.fn();
    const onSearchQueryChange = vi.fn();

    render(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="&P04_TEST_CLIENT"
        onSearchQueryChange={onSearchQueryChange}
        hasSearchResults
        filteredClients={[buildEntity()]}
        onFocusClient={onFocusClient}
      />
    );

    const input = screen.getByTestId('app-search-input');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onFocusClient).toHaveBeenCalledWith('entity-1', undefined, '001122');
  });

  it('propose une sortie quand la recherche ne donne rien', async () => {
    const user = userEvent.setup();
    const onCreateEntity = vi.fn();
    const onIncludeArchivedChange = vi.fn();
    const onSearchQueryChange = vi.fn();

    render(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="@zzzz"
        onSearchQueryChange={onSearchQueryChange}
        onCreateEntity={onCreateEntity}
        onIncludeArchivedChange={onIncludeArchivedChange}
      />
    );

    expect(screen.getByTestId('app-search-empty')).toHaveTextContent(/aucun résultat pour/i);

    await user.click(screen.getByTestId('app-search-empty-archived'));
    expect(onIncludeArchivedChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByTestId('app-search-empty-clear-scope'));
    expect(onSearchQueryChange).toHaveBeenCalledWith('zzzz');

    await user.click(screen.getByTestId('app-search-empty-create'));
    expect(onCreateEntity).toHaveBeenCalled();
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

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    await waitFor(() => {
      expect(handleUiError).toHaveBeenCalled();
    });
  });

  it('explique les prefixes au moment de la decouverte, puis se tait', () => {
    const { rerender } = render(<AppSearchOverlay {...baseProps} />);

    const legend = screen.getByTestId('app-search-prefix-legend');
    expect(legend).toHaveTextContent('@ contacts');
    expect(legend).toHaveTextContent('# interactions');
    expect(legend).toHaveTextContent('& clients');
    expect(legend).toHaveTextContent('> commandes');
    expect(legend).not.toHaveTextContent('!');

    rerender(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="Alice"
        hasSearchResults
        filteredClients={[buildEntity()]}
      />
    );

    // Une fois la frappe commencee, la legende cede la place a l'action utile.
    expect(screen.getByTestId('app-search-prefix-legend')).toHaveTextContent('↵ ouvrir');
    expect(screen.getByTestId('app-search-prefix-legend')).not.toHaveTextContent('contacts');
  });

  it('promeut le prefixe en jeton retirable au lieu de le laisser dans le champ', async () => {
    const user = userEvent.setup();
    const onSearchQueryChange = vi.fn();

    const { rerender } = render(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="@Alice"
        onSearchQueryChange={onSearchQueryChange}
      />
    );

    // Le champ n'affiche jamais le prefixe brut : il est promu en jeton.
    expect(screen.getByTestId('app-search-input')).toHaveValue('Alice');
    expect(screen.getByTestId('app-search-scope-token')).toHaveTextContent('Contacts');

    await user.click(screen.getByRole('button', { name: /retirer le filtre contacts/i }));
    expect(onSearchQueryChange).toHaveBeenLastCalledWith('Alice');

    // La frappe reste rattachee au perimetre actif.
    await user.type(screen.getByTestId('app-search-input'), 'x');
    expect(onSearchQueryChange).toHaveBeenLastCalledWith('@Alicex');

    rerender(
      <AppSearchOverlay
        {...baseProps}
        searchQuery="@"
        onSearchQueryChange={onSearchQueryChange}
      />
    );

    // Retour arriere sur un champ vide : le jeton saute, pas un caractere.
    await user.click(screen.getByTestId('app-search-input'));
    await user.keyboard('{Backspace}');
    expect(onSearchQueryChange).toHaveBeenLastCalledWith('');
  });
});
