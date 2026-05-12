import { screen, waitFor } from '@testing-library/react';
import { okAsync } from 'neverthrow';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryListRow, DirectorySearchState } from 'shared/schemas/directory.schema';

import { renderWithProviders } from '@/__tests__/test-utils';
import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import ClientDirectoryDetailPage from '../ClientDirectoryDetailPage';

const mockNavigate = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockHistoryBack = vi.fn();
const mockUseCanGoBack = vi.fn(() => true);
const detailSearch: DirectorySearchState = {
  q: 'sea',
  type: 'all',
  scope: { mode: 'active_agency' },
  departments: ['33'],
  city: undefined,
  cirCommercialIds: [],
  includeArchived: false,
  page: 1,
  pageSize: 50,
  sorting: [{ id: 'name', desc: false }]
};

vi.mock('@tanstack/react-router', () => ({
  useCanGoBack: () => mockUseCanGoBack(),
  useNavigate: () => mockNavigate
}));

vi.mock('@/hooks/useAppSession', () => ({
  useAppSessionStateContext: vi.fn()
}));

vi.mock('@/hooks/useDirectoryRecord', () => ({
  useDirectoryRecord: vi.fn()
}));

vi.mock('@/hooks/useDirectoryPage', () => ({
  useDirectoryPage: vi.fn()
}));

vi.mock('@/hooks/useDirectoryOptionCommercials', () => ({
  useDirectoryOptionCommercials: vi.fn(() => ({ data: { commercials: [] } }))
}));

vi.mock('@/hooks/useAgencies', () => ({
  useAgencies: vi.fn(() => ({ data: [] }))
}));

vi.mock('@/hooks/useEntityContacts', () => ({
  useEntityContacts: vi.fn(() => ({ data: [] }))
}));

vi.mock('@/hooks/useEntityInteractions', () => ({
  useEntityInteractions: vi.fn(() => ({ data: { interactions: [] } }))
}));

vi.mock('@/hooks/useSaveClient', () => ({
  useSaveClient: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

vi.mock('@/hooks/useSaveProspect', () => ({
  useSaveProspect: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

vi.mock('@/hooks/useSetClientArchived', () => ({
  useDeleteClient: vi.fn(() => ({ mutateAsync: mockDeleteMutateAsync }))
}));

vi.mock('@/services/entities/saveEntityContact', () => ({
  saveEntityContact: vi.fn()
}));

vi.mock('@/services/entities/deleteEntityContact', () => ({
  deleteEntityContact: vi.fn()
}));

vi.mock('@/components/ClientFormDialog', () => ({
  default: () => null
}));

vi.mock('@/components/ProspectFormDialog', () => ({
  default: () => null
}));

vi.mock('@/components/ConvertClientDialog', () => ({
  default: () => null
}));

vi.mock('@/services/entities/convertEntityToClient', () => ({
  convertEntityToClient: vi.fn()
}));

vi.mock('@/services/errors/notify', () => ({
  notifySuccess: vi.fn()
}));

const { useAppSessionStateContext } = await import('@/hooks/useAppSession');
const { useDirectoryRecord } = await import('@/hooks/useDirectoryRecord');
const { useDirectoryPage } = await import('@/hooks/useDirectoryPage');
const { useEntityContacts } = await import('@/hooks/useEntityContacts');
const { notifySuccess } = await import('@/services/errors/notify');

const mockedSessionState = vi.mocked(useAppSessionStateContext);
const mockedDirectoryRecord = vi.mocked(useDirectoryRecord);
const mockedDirectoryPage = vi.mocked(useDirectoryPage);
const mockedEntityContacts = vi.mocked(useEntityContacts);
const mockedNotifySuccess = vi.mocked(notifySuccess);
const mockedSaveEntityContact = vi.mocked(saveEntityContact);
const mockedDeleteEntityContact = vi.mocked(deleteEntityContact);

const baseRecord = {
  id: 'entity-1',
  entity_type: 'Client',
  client_number: '98568547',
  account_type: 'cash' as const,
  name: 'Test comptant',
  address: '1 Rue bobard',
  postal_code: '33700',
  department: '33',
  city: 'Mérignac',
  country: 'France',
  siret: null,
  notes: null,
  agency_id: 'agency-1',
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z'
};

const prospectRecord = {
  ...baseRecord,
  id: 'prospect-1',
  entity_type: 'Prospect',
  client_number: null,
  account_type: null
};

const previousRow: DirectoryListRow = {
  id: '8494b111-3e90-4714-9d2f-27a6d684bbff',
  entity_type: 'Prospect',
  client_kind: 'company',
  client_number: null,
  account_type: null,
  name: 'PONTAC Thierry',
  city: 'Gradignan',
  postal_code: '33170',
  department: '33',
  siret: null,
  siren: null,
  official_name: null,
  agency_id: 'agency-1',
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-02-03T00:00:00.000Z'
};

const currentRow: DirectoryListRow = {
  id: '30391709-cf97-493d-8644-6c2a1984ad1f',
  entity_type: 'Client',
  client_kind: 'company',
  client_number: '98568547',
  account_type: 'cash',
  name: 'Test comptant',
  city: 'Merignac',
  postal_code: '33700',
  department: '33',
  siret: null,
  siren: null,
  official_name: null,
  agency_id: 'agency-1',
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-02-03T00:00:00.000Z'
};

const nextRow: DirectoryListRow = {
  id: 'c1ef12d9-aa29-4e9f-b1c1-cd6e41d9633b',
  entity_type: 'Client',
  client_kind: 'company',
  client_number: '116277',
  account_type: 'term',
  name: 'SEA',
  city: 'Gradignan',
  postal_code: '33170',
  department: '33',
  siret: null,
  siren: null,
  official_name: null,
  agency_id: 'agency-1',
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-02-03T00:00:00.000Z'
};

const contact = {
  id: 'contact-1',
  entity_id: 'entity-1',
  first_name: 'Kévin',
  last_name: 'Chauchet',
  email: 'kevin.chauchet@sea-sarl.fr',
  phone: '05 56 00 00 00',
  position: 'Responsable technique',
  notes: null,
  archived_at: null,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z'
};

describe('ClientDirectoryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCanGoBack.mockReturnValue(true);
    vi.spyOn(window.history, 'back').mockImplementation(mockHistoryBack);
    mockDeleteMutateAsync.mockResolvedValue(baseRecord);
    mockedSaveEntityContact.mockReturnValue(okAsync(contact));
    mockedDeleteEntityContact.mockReturnValue(okAsync(undefined));
    mockedEntityContacts.mockReturnValue({ data: [] } as never);
    mockedSessionState.mockReturnValue({
      session: { user: { id: 'user-1', email: 'admin@example.com' } },
      authReady: true,
      profile: {
        id: 'user-1',
        email: 'admin@example.com',
        display_name: 'Admin',
        first_name: 'Admin',
        last_name: 'User',
        role: 'super_admin',
        must_change_password: false,
        password_changed_at: '2026-02-01T00:00:00.000Z'
      },
      profileLoading: false,
      profileError: null,
      agencyContext: null,
      activeAgencyId: 'agency-1',
      agencyMemberships: [],
      isContextLoading: false,
      contextError: null,
      canLoadData: true,
      mustChangePassword: false,
      isAuthenticated: true
    } as never);
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: baseRecord }
    } as never);
    mockedDirectoryPage.mockReturnValue({
      data: {
        rows: [previousRow, currentRow, nextRow],
        total: 3,
        page: 1,
        page_size: 50
      }
    } as never);
  });

  it('renders a canonical detail view without a back button and exposes delete for super_admin', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    expect(screen.queryByRole('button', { name: /retour aux résultats/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supprimer définitivement/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /supprimer définitivement/i }));
    expect(screen.getByText(/supprimer aussi toutes les interactions/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
        clientId: 'entity-1',
        deleteRelatedInteractions: true
      });
    });

    await waitFor(() => {
      expect(mockHistoryBack).toHaveBeenCalledTimes(1);
    });
  });

  it('hides the destructive action for non super admins', () => {
    mockedSessionState.mockReturnValue({
      session: { user: { id: 'user-2', email: 'agency@example.com' } },
      authReady: true,
      profile: {
        id: 'user-2',
        email: 'agency@example.com',
        display_name: 'Agency',
        first_name: 'Agency',
        last_name: 'Admin',
        role: 'agency_admin',
        must_change_password: false,
        password_changed_at: '2026-02-01T00:00:00.000Z'
      },
      profileLoading: false,
      profileError: null,
      agencyContext: null,
      activeAgencyId: 'agency-1',
      agencyMemberships: [],
      isContextLoading: false,
      contextError: null,
      canLoadData: true,
      mustChangePassword: false,
      isAuthenticated: true
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    expect(screen.queryByRole('button', { name: /supprimer définitivement/i })).not.toBeInTheDocument();
  });

  it('renders accessible loading skeleton with aria-busy', () => {
    mockedDirectoryRecord.mockReturnValue({
      isLoading: true,
      data: undefined
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    const section = document.querySelector('section[aria-busy="true"]');
    expect(section).toBeTruthy();
    expect(screen.getByText('Chargement de la fiche…')).toBeTruthy();
  });

  it('opens the compact contact dialog and creates a contact from the client record', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/prenom/i), 'Lina');
    await user.type(screen.getByLabelText(/^nom$/i), 'Martin');
    await user.type(screen.getByLabelText(/email/i), 'lina.martin@example.test');
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));

    await waitFor(() => {
      expect(mockedSaveEntityContact).toHaveBeenCalledWith({
        id: undefined,
        entity_id: 'entity-1',
        first_name: 'Lina',
        last_name: 'Martin',
        email: 'lina.martin@example.test',
        phone: null,
        position: null,
        notes: null
      });
    });
    expect(mockedNotifySuccess).toHaveBeenCalledWith('Contact ajouté.');
  });

  it('prefills the contact dialog and saves an edited contact payload', async () => {
    const user = userEvent.setup();
    mockedEntityContacts.mockReturnValue({ data: [contact], isLoading: false } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    await user.click(screen.getByRole('button', { name: /modifier kévin chauchet/i }));
    expect(screen.getByDisplayValue('Kévin')).toBeInTheDocument();

    const positionInput = screen.getByLabelText(/poste/i);
    await user.clear(positionInput);
    await user.type(positionInput, 'Directeur technique');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await waitFor(() => {
      expect(mockedSaveEntityContact).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'contact-1',
          entity_id: 'entity-1',
          position: 'Directeur technique'
        })
      );
    });
    expect(mockedNotifySuccess).toHaveBeenCalledWith('Contact mis à jour.');
  });

  it('confirms contact deletion before calling the delete mutation', async () => {
    const user = userEvent.setup();
    mockedEntityContacts.mockReturnValue({ data: [contact], isLoading: false } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    await user.click(screen.getByRole('button', { name: /supprimer kévin chauchet/i }));
    expect(screen.getByText(/le contact kévin chauchet sera supprimé/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(mockedDeleteEntityContact).toHaveBeenCalledWith('contact-1');
    });
    expect(mockedNotifySuccess).toHaveBeenCalledWith('Contact supprimé.');
  });

  it('keeps compact empty and loading contact states on the record detail', () => {
    mockedEntityContacts.mockReturnValueOnce({ data: [], isLoading: false } as never);

    const { rerender } = renderWithProviders(
      <ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />
    );

    expect(screen.getByText('Aucun contact pour ce client.')).toBeInTheDocument();

    mockedEntityContacts.mockReturnValueOnce({ data: [], isLoading: true } as never);
    rerender(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    expect(screen.getByText('Chargement des contacts…')).toBeInTheDocument();
  });

  it('navigates to the integrated convert route from a prospect detail page', async () => {
    const user = userEvent.setup();
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: prospectRecord }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'prospect', id: 'prospect-1' }} search={detailSearch} />);

    await user.click(screen.getByRole('button', { name: /convertir en client/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/prospects/$prospectId/convert',
      params: { prospectId: 'prospect-1' },
      search: expect.any(Function)
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(detailSearch);
  });

  it('falls back to the filtered directory route when delete succeeds without in-app history', async () => {
    const user = userEvent.setup();
    mockUseCanGoBack.mockReturnValue(false);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    await user.click(screen.getByRole('button', { name: /supprimer d.finitivement/i }));
    await user.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/clients',
        search: expect.any(Function),
        replace: true
      });
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(detailSearch);
    expect(mockHistoryBack).not.toHaveBeenCalled();
  });

  it('shows previous and next controls when the current record belongs to the filtered page', () => {
    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    expect(screen.getByRole('button', { name: 'Fiche précédente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Fiche suivante' })).toBeEnabled();
  });

  it('navigates to the previous canonical record with preserved search state and replace history', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    await user.click(screen.getByRole('button', { name: 'Fiche précédente' }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/prospects/$prospectId',
      params: { prospectId: previousRow.id },
      search: expect.any(Function),
      replace: true
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(detailSearch);
  });

  it('navigates to the next canonical record with preserved search state and replace history', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    await user.click(screen.getByRole('button', { name: 'Fiche suivante' }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/$clientNumber',
      params: { clientNumber: nextRow.client_number },
      search: expect.any(Function),
      replace: true
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(detailSearch);
  });

  it('disables previous on the first row and next on the last row', () => {
    const { rerender } = renderWithProviders(
      <ClientDirectoryDetailPage routeRef={{ kind: 'prospect', id: previousRow.id }} search={detailSearch} />
    );

    expect(screen.getByRole('button', { name: 'Fiche précédente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fiche suivante' })).toBeEnabled();

    rerender(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: nextRow.client_number! }} search={detailSearch} />);

    expect(screen.getByRole('button', { name: 'Fiche précédente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Fiche suivante' })).toBeDisabled();
  });

  it('hides previous and next controls when the current record is outside the filtered page', () => {
    mockedDirectoryPage.mockReturnValue({
      data: {
        rows: [previousRow],
        total: 1,
        page: 1,
        page_size: 50
      }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} search={detailSearch} />);

    expect(screen.queryByRole('button', { name: 'Fiche précédente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fiche suivante' })).not.toBeInTheDocument();
  });
});
