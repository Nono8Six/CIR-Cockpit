import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CockpitSupplierLookup from '@/components/cockpit/guided/CockpitSupplierLookup';
import { useUnifiedEntitySearch } from '../../../../hooks/directory/core/useUnifiedEntitySearch';
import type { Entity } from '@/types';

vi.mock('@/hooks/directory/core/useUnifiedEntitySearch', () => ({
  useUnifiedEntitySearch: vi.fn()
}));

const renderLookup = (overrides = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const props = {
    activeAgencyId: 'agency-1',
    selectedEntity: null,
    companyName: '',
    onSelectUnifiedSearchResult: vi.fn(),
    onClearSelectedEntity: vi.fn(),
    setValue: vi.fn(),
    onComplete: vi.fn(),
    ...overrides
  };

  render(
    <QueryClientProvider client={queryClient}>
      <CockpitSupplierLookup {...props} />
    </QueryClientProvider>
  );

  return props;
};

describe('CockpitSupplierLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUnifiedEntitySearch).mockReturnValue({
      data: { results: [] },
      isFetching: false
    } as unknown as ReturnType<typeof useUnifiedEntitySearch>);
  });

  it('permet un fournisseur ponctuel sans créer de fiche fournisseur', async () => {
    const user = userEvent.setup();
    const props = renderLookup();

    await user.type(screen.getByRole('textbox', { name: /nom du fournisseur ponctuel/i }), 'Siemens ponctuel');
    await user.click(screen.getByRole('button', { name: /utiliser pour cette saisie/i }));

    expect(props.onClearSelectedEntity).toHaveBeenCalled();
    expect(props.setValue).toHaveBeenCalledWith('entity_id', '', expect.any(Object));
    expect(props.setValue).toHaveBeenCalledWith('contact_id', '', expect.any(Object));
    expect(props.setValue).toHaveBeenCalledWith('company_name', 'Siemens ponctuel', expect.any(Object));
    expect(props.onComplete).toHaveBeenCalled();
  });

  it('selectionne un fournisseur enregistre avec entity_id via la recherche unifiee', async () => {
    const user = userEvent.setup();
    const onSelectUnifiedSearchResult = vi.fn();
    vi.mocked(useUnifiedEntitySearch).mockReturnValue({
      data: {
        results: [{
          id: 'supplier-1',
          source: 'entity',
          type: 'supplier',
          label: 'SIEMENS SAS',
          match_kind: 'entity',
          match_label: 'SIEMENS SAS',
          city: 'Saint-Denis',
          phone: '01 02 03 04 05',
          email: null
        }]
      },
      isFetching: false
    } as unknown as ReturnType<typeof useUnifiedEntitySearch>);
    const props = renderLookup({ onSelectUnifiedSearchResult });

    await user.type(screen.getByRole('textbox', { name: /rechercher un fournisseur enregistré/i }), 'Siemens');
    await user.click(screen.getByRole('button', { name: /siemens sas/i }));

    expect(onSelectUnifiedSearchResult).toHaveBeenCalledWith(expect.objectContaining({ id: 'supplier-1' }));
    expect(props.setValue).toHaveBeenCalledWith('contact_phone', '01 02 03 04 05', expect.any(Object));
  });

  it('affiche le fournisseur selectionne et permet de continuer', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderLookup({
      selectedEntity: {
        id: 'supplier-1',
        name: 'SIEMENS SAS',
        entity_type: 'Fournisseur',
        primary_email: 'contact@example.com',
        agency_id: 'agency-1'
      } as unknown as Entity,
      onComplete
    });

    expect(screen.getByText('SIEMENS SAS')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(onComplete).toHaveBeenCalled();
  });
});
