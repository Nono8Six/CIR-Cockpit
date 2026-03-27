import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DirectoryListInput } from 'shared/schemas/directory.schema';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import ClientDirectoryFilters from '../ClientDirectoryFilters';

vi.mock('@/hooks/useDirectoryCitySuggestions', () => ({
  useDirectoryCitySuggestions: () => ({
    data: {
      cities: [{ value: 'Gradignan', label: 'GRADIGNAN' }]
    },
    isFetching: false,
    error: null
  })
}));

const baseSearch: DirectoryListInput = {
  q: undefined,
  type: 'all',
  agencyIds: [],
  departments: [],
  city: undefined,
  cirCommercialIds: [],
  includeArchived: false,
  page: 1,
  pageSize: 50,
  sorting: [{ id: 'name', desc: false }]
};

const renderFilters = (
  searchOverrides: Partial<DirectoryListInput> = {},
  options: { isFetching?: boolean; density?: 'compact' | 'comfortable' } = {}
) => {
  const onSearchPatch = vi.fn();
  const onSearchDraftChange = vi.fn();
  const onReset = vi.fn();
  const queryClient = createTestQueryClient();
  const search = { ...baseSearch, ...searchOverrides };

  const TestHarness = () => {
    const [searchDraft, setSearchDraft] = useState(search.q ?? '');

    return (
      <ClientDirectoryFilters
        search={search}
        cityDraftSeed={search.city ?? ''}
        searchDraft={searchDraft}
        agencies={[
          { id: 'agency-1', name: 'CIR Bordeaux' },
          { id: 'agency-2', name: 'CIR Paris' }
        ]}
        commercials={[{ id: 'commercial-1', display_name: 'Thierry Pontac' }]}
        departments={['33']}
        canFilterAgency
        isFetching={options.isFetching ?? false}
        density={options.density ?? 'compact'}
        viewOptionColumns={[
          { id: 'name', label: 'Nom', canHide: false, isVisible: true },
          { id: 'city', label: 'Ville', canHide: true, isVisible: true }
        ]}
        onToggleColumn={vi.fn()}
        onDensityChange={vi.fn()}
        onSearchDraftChange={(value) => {
          setSearchDraft(value);
          onSearchDraftChange(value);
        }}
        onSearchPatch={onSearchPatch}
        onReset={onReset}
      />
    );
  };

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TestHarness />
      </TooltipProvider>
    </QueryClientProvider>
  );

  return { onSearchPatch, onSearchDraftChange, onReset };
};

describe('ClientDirectoryFilters', () => {
  it('affiche les controles principaux et desactive le reset par defaut', () => {
    renderFilters();
    const resetButtons = screen.getAllByRole('button', { name: 'Réinitialiser' });

    expect(screen.getByText('RECHERCHE')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Type de fiche' })).toBeInTheDocument();
    expect(screen.getAllByText('Affichage').length).toBeGreaterThan(0);
    expect(screen.getByText('Type : Tous')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Departement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ville' })).toBeInTheDocument();
    expect(resetButtons).toHaveLength(2);
    resetButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it('met a jour le type via le controle segmente desktop', async () => {
    const user = userEvent.setup();
    const { onSearchPatch } = renderFilters();

    await user.click(screen.getByRole('radio', { name: 'Clients' }));

    expect(onSearchPatch).toHaveBeenCalledWith({
      type: 'client',
      cirCommercialIds: [],
      page: 1
    });
  });

  it('ne declenche pas la recherche sur simple frappe et commit sur Entree', async () => {
    const user = userEvent.setup();
    const { onSearchPatch, onSearchDraftChange } = renderFilters();

    const input = screen.getByRole('textbox', { name: 'Recherche annuaire' });
    await user.type(input, 'sea');

    expect(onSearchDraftChange).toHaveBeenCalledTimes(3);
    expect(onSearchPatch).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');

    expect(onSearchPatch).toHaveBeenCalledWith({
      q: 'sea',
      page: 1
    });
  });

  it('commit la recherche au blur', async () => {
    const user = userEvent.setup();
    const { onSearchPatch, onSearchDraftChange } = renderFilters();

    const input = screen.getByRole('textbox', { name: 'Recherche annuaire' });
    await user.type(input, 'bordeaux');
    await user.tab();

    expect(onSearchDraftChange).toHaveBeenCalled();
    expect(onSearchPatch).toHaveBeenCalledWith({
      q: 'bordeaux',
      page: 1
    });
  });

  it('ne commit pas la ville sur simple frappe', async () => {
    const user = userEvent.setup();
    const { onSearchPatch } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Ville' }));

    const cityInput = await screen.findByRole('textbox', { name: 'Filtre ville' });
    await user.type(cityInput, 'gra');

    expect(cityInput).toHaveValue('gra');
    expect(onSearchPatch).not.toHaveBeenCalledWith({
      city: 'gra',
      page: 1
    });
  });

  it('restaure le draft ville quand le filtre externe est vide', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    const TestHarness = () => {
      const [search, setSearch] = useState<DirectoryListInput>({
        ...baseSearch,
        city: 'Gradignan'
      });
      const [searchDraft, setSearchDraft] = useState('');

      return (
        <>
          <ClientDirectoryFilters
            search={search}
            cityDraftSeed={search.city ?? ''}
            searchDraft={searchDraft}
            agencies={[
              { id: 'agency-1', name: 'CIR Bordeaux' },
              { id: 'agency-2', name: 'CIR Paris' }
            ]}
            commercials={[{ id: 'commercial-1', display_name: 'Thierry Pontac' }]}
            departments={['33']}
            canFilterAgency
            isFetching={false}
            density="compact"
            viewOptionColumns={[
              { id: 'name', label: 'Nom', canHide: false, isVisible: true },
              { id: 'city', label: 'Ville', canHide: true, isVisible: true }
            ]}
            onToggleColumn={vi.fn()}
            onDensityChange={vi.fn()}
            onSearchDraftChange={setSearchDraft}
            onSearchPatch={(patch) => {
              setSearch((previous) => ({ ...previous, ...patch }));
            }}
            onReset={() => {
              setSearch(baseSearch);
              setSearchDraft('');
            }}
          />
          <button type="button" onClick={() => setSearch((previous) => ({ ...previous, city: undefined }))}>
            Vider ville
          </button>
        </>
      );
    };

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TestHarness />
        </TooltipProvider>
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ville: Gradignan' }));

    const cityInput = await screen.findByRole('textbox', { name: 'Filtre ville' });
    expect(cityInput).toHaveValue('Gradignan');

    await user.click(screen.getByRole('button', { name: 'Vider ville' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ville' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Ville' }));

    const clearedCityInput = await screen.findByRole('textbox', { name: 'Filtre ville' });
    expect(clearedCityInput).toHaveValue('');
  });

  it('active la reinitialisation des qu un etat personnalise est present', () => {
    renderFilters({ type: 'client' });

    screen.getAllByRole('button', { name: 'Réinitialiser' }).forEach((button) => {
      expect(button).toBeEnabled();
    });
  });

  it('affiche et efface un filtre agence actif depuis la pill desktop', async () => {
    const user = userEvent.setup();
    const { onSearchPatch } = renderFilters({ agencyIds: ['agency-1'] });

    expect(screen.getByRole('button', { name: 'Agence: CIR Bordeaux' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Effacer filtre Agence' }));

    expect(onSearchPatch).toHaveBeenCalledWith({
      agencyIds: [],
      page: 1
    });
  });

  it('expose un indicateur de synchronisation nomme pendant un rafraichissement', () => {
    renderFilters({}, { isFetching: true });

    expect(screen.getAllByRole('button', { name: 'Synchronisation en cours' }).length).toBeGreaterThan(0);
  });

  it('ouvre le sheet mobile et applique le filtre archives', async () => {
    const user = userEvent.setup();
    const { onSearchPatch } = renderFilters();
    const filterButtons = screen.getAllByRole('button', { name: /filtres/i });
    const mobileFilterButton = filterButtons[filterButtons.length - 1];
    expect(mobileFilterButton).toBeDefined();
    if (!mobileFilterButton) {
      return;
    }

    await user.click(mobileFilterButton);

    const dialog = await screen.findByRole('dialog', { name: 'Filtres' });
    await user.click(within(dialog).getByRole('button', { name: 'Inclure les archives' }));

    expect(onSearchPatch).toHaveBeenCalledWith({
      includeArchived: true,
      page: 1
    });
  });
});
