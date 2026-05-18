import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSupplierCreatePage from '@/components/admin-suppliers/AdminSupplierCreatePage';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDirectoryCompanySearch } from '@/hooks/useDirectoryCompanySearch';
import { useSaveSupplier } from '@/hooks/useSaveSupplier';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock
}));

vi.mock('@/hooks/useAppSession', () => ({
  useAppSessionStateContext: vi.fn()
}));

vi.mock('@/hooks/useDirectoryCompanySearch', () => ({
  useDirectoryCompanySearch: vi.fn()
}));

vi.mock('@/hooks/useSaveSupplier', () => ({
  useSaveSupplier: vi.fn()
}));

vi.mock('@/services/errors/notify', () => ({
  notifySuccess: vi.fn()
}));

const sessionState = {
  profile: { role: 'agency_admin' },
  activeAgencyId: 'agency-1',
  agencyMemberships: [{ agency_id: 'agency-1', agency_name: 'CIR Bordeaux' }]
};

describe('AdminSupplierCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppSessionStateContext).mockReturnValue(sessionState as ReturnType<typeof useAppSessionStateContext>);
    vi.mocked(useDirectoryCompanySearch).mockReturnValue({
      data: { companies: [] },
      isFetching: false,
      isError: false,
      error: null
    } as unknown as ReturnType<typeof useDirectoryCompanySearch>);
    vi.mocked(useSaveSupplier).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({ id: 'supplier-1' })
    } as unknown as ReturnType<typeof useSaveSupplier>);
  });

  it('bloque les utilisateurs tcs', () => {
    vi.mocked(useAppSessionStateContext).mockReturnValue({
      ...sessionState,
      profile: { role: 'tcs' }
    } as ReturnType<typeof useAppSessionStateContext>);

    render(<AdminSupplierCreatePage />);

    expect(screen.getByText(/création fournisseur réservée aux administrateurs/i)).toBeInTheDocument();
  });

  it('préremplit depuis un résultat officiel et sauvegarde un fournisseur permanent', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'supplier-1' });
    vi.mocked(useDirectoryCompanySearch).mockReturnValue({
      data: {
        companies: [{
          name: 'SIEMENS SAS',
          official_name: 'SIEMENS SAS',
          siret: '56201677400020',
          siren: '562016774',
          naf_code: '46.69B',
          address: '40 Avenue des Fruitiers',
          postal_code: '93210',
          city: 'Saint-Denis',
          department: '93',
          region: null,
          date_creation: null,
          date_debut_activite: null,
          employee_range: null,
          employee_range_year: null,
          is_employer: null,
          establishment_diffusion_status: null,
          brands: [],
          is_head_office: true,
          is_former_head_office: false,
          establishment_status: 'open',
          establishment_closed_at: null,
          commercial_name: null,
          company_establishments_count: 1,
          company_open_establishments_count: 1,
          match_quality: 'exact',
          match_explanation: null,
          official_data_source: 'api-recherche-entreprises',
          official_data_synced_at: '2026-05-16T00:00:00.000Z'
        }]
      },
      isFetching: false,
      isError: false,
      error: null
    } as unknown as ReturnType<typeof useDirectoryCompanySearch>);
    vi.mocked(useSaveSupplier).mockReturnValue({
      isPending: false,
      mutateAsync
    } as unknown as ReturnType<typeof useSaveSupplier>);

    render(<AdminSupplierCreatePage />);

    await user.type(screen.getByRole('textbox', { name: /recherche officielle fournisseur admin/i }), 'Siemens');
    await user.click(screen.getByRole('button', { name: /^rechercher$/i }));
    await user.click(screen.getByRole('button', { name: /saint-denis/i }));
    await user.type(screen.getByRole('textbox', { name: /code interne fournisseur/i }), 'sie1');
    await user.type(screen.getByRole('textbox', { name: /numéro fournisseur/i }), '445566');
    await user.type(screen.getByRole('textbox', { name: /email fournisseur admin/i }), 'contact@siemens.example');
    await user.click(screen.getByRole('button', { name: /^continuer$/i }));
    await user.click(screen.getByRole('button', { name: /^créer$/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      entity_type: 'Fournisseur',
      name: 'SIEMENS SAS',
      supplier_code: 'SIE1',
      supplier_number: '445566',
      primary_email: 'contact@siemens.example',
      siret: '56201677400020',
      official_data_source: 'api-recherche-entreprises'
    })));
  });
});
