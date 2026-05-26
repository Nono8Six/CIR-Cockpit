import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSupplierCreatePage from '@/components/admin-suppliers/AdminSupplierCreatePage';
import { useAppSessionStateContext } from '../../../hooks/session/useAppSession';
import { useDirectoryCompanySearch } from '../../../hooks/directory/company/useDirectoryCompanySearch';
import { useSaveSupplier } from '../../../hooks/entities/suppliers/useSaveSupplier';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock
}));

vi.mock('@/hooks/session/useAppSession', () => ({
  useAppSessionStateContext: vi.fn()
}));

vi.mock('@/hooks/directory/company/useDirectoryCompanySearch', () => ({
  useDirectoryCompanySearch: vi.fn()
}));

vi.mock('@/hooks/entities/suppliers/useSaveSupplier', () => ({
  useSaveSupplier: vi.fn()
}));

vi.mock('@/services/errors/notifySuccess', () => ({ notifySuccess: vi.fn() }));

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
          naf_code: '43.21A',
          address: '40 Avenue des Fruitiers',
          postal_code: '93210',
          city: 'Saint-Denis',
          department: '93',
          region: '75',
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
        }, {
          name: 'SIEMENS SAS',
          official_name: 'SIEMENS SAS',
          siret: '56201677400038',
          siren: '562016774',
          naf_code: '43.21A',
          address: '12 Rue Secondaire',
          postal_code: '69000',
          city: 'Lyon',
          department: '69',
          region: '84',
          date_creation: null,
          date_debut_activite: null,
          employee_range: null,
          employee_range_year: null,
          is_employer: null,
          establishment_diffusion_status: null,
          brands: [],
          is_head_office: false,
          is_former_head_office: false,
          establishment_status: 'open',
          establishment_closed_at: null,
          commercial_name: null,
          company_establishments_count: 2,
          company_open_establishments_count: 2,
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
    expect(screen.getAllByRole('button', { name: /SIEMENS SAS SIREN 562016774/i })).toHaveLength(1);
    expect(screen.queryByRole('textbox', { name: /code interne fournisseur/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /SIEMENS SAS SIREN 562016774/i }));
    const establishmentButtons = screen.getAllByRole('button', { name: /NAF 43\.21A/i });
    expect(establishmentButtons[0]).toHaveTextContent(/siège/i);
    expect(establishmentButtons[0]).toHaveTextContent(/Travaux d'installation électrique/i);

    await user.click(screen.getByRole('button', { name: /saint-denis/i }));
    expect(screen.queryByRole('textbox', { name: /code interne fournisseur/i })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /prévisualisation fournisseur/i })).toHaveTextContent('56201677400020');
    expect(screen.getByRole('complementary', { name: /prévisualisation fournisseur/i })).toHaveTextContent('Nouvelle-Aquitaine');
    expect(screen.getByRole('complementary', { name: /prévisualisation fournisseur/i })).toHaveTextContent("43.21A - Travaux d'installation électrique dans tous locaux");

    await user.click(screen.getByRole('button', { name: /utiliser cet établissement/i }));
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
