import { screen, waitFor } from '@testing-library/react';
import { okAsync } from 'neverthrow';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryRecord } from '../../../../../shared/schemas/system/directory.schema';
import { Channel, type Interaction } from '@/types';

import { renderWithProviders } from '@/__tests__/test-utils';
import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import ClientDirectoryDetailPage from '../ClientDirectoryDetailPage';

let latestShouldBlockNavigation: (() => boolean) | null = null;
let lastNavigationWasBlocked = false;
const mockNavigate = vi.fn(() => {
  lastNavigationWasBlocked = latestShouldBlockNavigation?.() ?? false;
});
const mockSaveClientMutateAsync = vi.fn();
const mockSaveSupplierMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockDeleteSupplierMutateAsync = vi.fn();
const mockHistoryBack = vi.fn();
const mockUseCanGoBack = vi.fn(() => true);
const mockSetSelectedInteraction = vi.fn();
const mockSetInteractionToDelete = vi.fn();
const mockHandleConfirmDeleteInteraction = vi.fn();
const mockHandleInteractionUpdate = vi.fn();
const mockNextPage = vi.fn();
const mockPreviousPage = vi.fn();
const mockRetry = vi.fn();
const mockScopeChange = vi.fn();
const mockSearchTextChange = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useCanGoBack: () => mockUseCanGoBack(),
  useNavigate: () => mockNavigate,
  useBlocker: (options: { shouldBlockFn: () => boolean }) => {
    latestShouldBlockNavigation = options.shouldBlockFn;
    return { status: 'idle' };
  }
}));

vi.mock('@/hooks/session/useAppSession', () => ({
  useAppSessionStateContext: vi.fn()
}));

vi.mock('@/hooks/directory/core/useDirectoryRecord', () => ({
  useDirectoryRecord: vi.fn()
}));

vi.mock('@/hooks/directory/options/useDirectoryOptionCommercials', () => ({
  useDirectoryOptionCommercials: vi.fn(() => ({ data: { commercials: [] } }))
}));

vi.mock('@/hooks/admin/agencies/core/useAgencies', () => ({
  useAgencies: vi.fn(() => ({ data: [{ id: 'agency-1', name: 'CIR Bordeaux' }] }))
}));

vi.mock('@/hooks/admin/agencies/core/useAgencyConfig', () => ({
  useAgencyConfig: vi.fn(() => ({
    data: {
      statuses: [],
      historicalStatuses: [],
      services: [],
      families: [],
      interactionTypes: [],
      resolutions: []
    }
  }))
}));

vi.mock('@/hooks/entities/contacts/useEntityContacts', () => ({
  useEntityContacts: vi.fn(() => ({ data: [] }))
}));

vi.mock('../useClientDirectoryRecordInteractions', () => ({
  useClientDirectoryRecordInteractions: vi.fn()
}));

vi.mock('@/hooks/entities/clients/useSaveClient', () => ({
  useSaveClient: vi.fn(() => ({ isPending: false, mutateAsync: mockSaveClientMutateAsync }))
}));

vi.mock('@/hooks/entities/prospects/useSaveProspect', () => ({
  useSaveProspect: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

vi.mock('@/hooks/entities/suppliers/useSaveSupplier', () => ({
  useSaveSupplier: vi.fn(() => ({ isPending: false, mutateAsync: mockSaveSupplierMutateAsync }))
}));

vi.mock('@/hooks/entities/clients/useDeleteClient', () => ({
  useDeleteClient: vi.fn(() => ({ mutateAsync: mockDeleteMutateAsync }))
}));

vi.mock('@/hooks/entities/suppliers/useDeleteSupplier', () => ({
  useDeleteSupplier: vi.fn(() => ({ mutateAsync: mockDeleteSupplierMutateAsync }))
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

vi.mock('../ClientDirectoryInteractionDetailsSheet', () => ({
  default: ({ interaction }: { interaction: Interaction }) => (
    <div data-testid="interaction-details-sheet">{interaction.subject}</div>
  )
}));

vi.mock('@/services/entities/convertEntityToClient', () => ({
  convertEntityToClient: vi.fn()
}));

vi.mock('@/services/errors/notifySuccess', () => ({ notifySuccess: vi.fn() }));

const { useAppSessionStateContext } = await import('@/hooks/session/useAppSession');
const { useDirectoryRecord } = await import('@/hooks/directory/core/useDirectoryRecord');
const { useEntityContacts } = await import('@/hooks/entities/contacts/useEntityContacts');
const { notifySuccess } = await import('@/services/errors/notifySuccess');
const { useClientDirectoryRecordInteractions } = await import('../useClientDirectoryRecordInteractions');

const mockedSessionState = vi.mocked(useAppSessionStateContext);
const mockedDirectoryRecord = vi.mocked(useDirectoryRecord);
const mockedEntityContacts = vi.mocked(useEntityContacts);
const mockedNotifySuccess = vi.mocked(notifySuccess);
const mockedSaveEntityContact = vi.mocked(saveEntityContact);
const mockedDeleteEntityContact = vi.mocked(deleteEntityContact);
const mockedRecordInteractions = vi.mocked(useClientDirectoryRecordInteractions);

const baseRecord: DirectoryRecord = {
  id: 'entity-1',
  entity_type: 'Client',
  client_kind: 'company',
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

const prospectRecord: DirectoryRecord = {
  ...baseRecord,
  id: 'prospect-1',
  entity_type: 'Prospect',
  client_number: null,
  account_type: null
};

const supplierRecord: DirectoryRecord = {
  ...baseRecord,
  id: 'supplier-1',
  entity_type: 'Fournisseur',
  client_kind: null,
  client_number: null,
  supplier_code: 'FEST',
  supplier_number: '445566',
  account_type: null,
  name: 'FESTO',
  address: '8 Rue de la Logistique',
  postal_code: '94360',
  department: '94',
  city: 'Bry-sur-Marne',
  siret: '12345678900022',
  primary_phone: '0545852565',
  primary_email: 'contact@festo.test',
  agency_id: null,
  agency_name: null,
  cir_commercial_id: null,
  cir_commercial_name: null
};

const openInteraction = {
  id: 'interaction-open-1',
  agency_id: 'agency-1',
  entity_id: 'entity-1',
  entity_type: 'Client',
  subject: 'Demande de devis',
  interaction_type: 'Devis',
  channel: Channel.EMAIL,
  status: 'En cours',
  status_id: null,
  status_is_terminal: false,
  company_name: 'Test comptant',
  contact_id: null,
  contact_name: 'Kévin Chauchet',
  contact_email: 'kevin.chauchet@sea-sarl.fr',
  contact_phone: '05 56 00 00 00',
  contact_service: 'Atelier',
  created_by: 'user-1',
  last_action_at: '2026-02-01T00:00:00.000Z',
  mega_families: [],
  notes: null,
  order_ref: null,
  reminder_at: null,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
  updated_by: null,
  timeline: []
} as Interaction;

const contact = {
  id: 'contact-1',
  entity_id: 'entity-1',
  first_name: 'Kévin',
  last_name: 'Chauchet',
  is_primary: true,
  email: 'kevin.chauchet@sea-sarl.fr',
  phone: '05 56 00 00 00',
  position: 'Responsable technique',
  service_label: null,
  notes: null,
  archived_at: null,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z'
};

const createDefaultInteractionsState = (
  overrides: Record<string, unknown> = {}
) => ({
  filters: {
    scope: 'open',
    searchText: '',
    onScopeChange: mockScopeChange,
    onSearchTextChange: mockSearchTextChange
  },
  list: {
    interactions: [openInteraction],
    isLoading: false,
    isRefreshing: false,
    hasError: false,
    currentPage: 1,
    totalPages: 1,
    totalInteractions: 1,
    visibleInteractions: 1,
    onNextPage: mockNextPage,
    onPreviousPage: mockPreviousPage,
    onRetry: mockRetry
  },
  selectedInteraction: null,
  interactionToDelete: null,
  isDeletePending: false,
  setSelectedInteraction: mockSetSelectedInteraction,
  setInteractionToDelete: mockSetInteractionToDelete,
  handleConfirmDeleteInteraction: mockHandleConfirmDeleteInteraction,
  handleInteractionUpdate: mockHandleInteractionUpdate,
  ...overrides
});

describe('ClientDirectoryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestShouldBlockNavigation = null;
    lastNavigationWasBlocked = false;
    mockUseCanGoBack.mockReturnValue(true);
    vi.spyOn(window.history, 'back').mockImplementation(mockHistoryBack);
    mockSaveClientMutateAsync.mockResolvedValue(baseRecord);
    mockSaveSupplierMutateAsync.mockResolvedValue(supplierRecord);
    mockDeleteMutateAsync.mockResolvedValue(baseRecord);
    mockDeleteSupplierMutateAsync.mockResolvedValue(supplierRecord);
    mockedSaveEntityContact.mockReturnValue(okAsync(contact));
    mockedDeleteEntityContact.mockReturnValue(okAsync(undefined));
    mockedEntityContacts.mockReturnValue({ data: [] } as never);
    mockedRecordInteractions.mockReturnValue(createDefaultInteractionsState() as never);
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
  });

  it('renders a canonical detail view without a back button and exposes delete for super_admin', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

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

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    expect(screen.queryByRole('button', { name: /supprimer définitivement/i })).not.toBeInTheDocument();
  });

  it('renders accessible loading skeleton with aria-busy', () => {
    mockedDirectoryRecord.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    const section = document.querySelector('section[aria-busy="true"]');
    expect(section).toBeTruthy();
    expect(screen.getByText('Chargement de la fiche…')).toBeTruthy();
  });

  it('renders a retry state when the client record cannot load', () => {
    const refetch = vi.fn();
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      isError: true,
      refetch,
      data: undefined
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    expect(screen.getByText('Impossible de charger la fiche.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });

  it('opens the compact contact dialog and creates a contact from the client record', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('tab', { name: 'Contacts' }));
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
        service_label: null,
        notes: null
      });
    });
    expect(mockedNotifySuccess).toHaveBeenCalledWith('Contact ajouté.');
  });

  it('prefills the contact dialog and saves an edited contact payload', async () => {
    const user = userEvent.setup();
    mockedEntityContacts.mockReturnValue({ data: [contact], isLoading: false } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('tab', { name: 'Contacts' }));
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

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('tab', { name: 'Contacts' }));
    await user.click(screen.getByRole('button', { name: /supprimer kévin chauchet/i }));
    expect(screen.getByText(/le contact kévin chauchet sera supprimé/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(mockedDeleteEntityContact).toHaveBeenCalledWith('contact-1');
    });
    expect(mockedNotifySuccess).toHaveBeenCalledWith('Contact supprimé.');
  });

  it('keeps compact empty and loading contact states on the record detail', async () => {
    mockedEntityContacts.mockReturnValueOnce({ data: [], isLoading: false } as never);

    const { rerender } = renderWithProviders(
      <ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Contacts' }));
    expect(screen.getByText('Aucun contact pour ce client.')).toBeInTheDocument();

    mockedEntityContacts.mockReturnValueOnce({ data: [], isLoading: true } as never);
    rerender(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Contacts' }));
    expect(screen.getByText('Chargement des contacts…')).toBeInTheDocument();
  });

  it('navigates to the integrated convert route from a prospect detail page', async () => {
    const user = userEvent.setup();
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: prospectRecord }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'prospect', id: 'prospect-1' }} />);

    await user.click(screen.getByRole('button', { name: /convertir en client/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/prospects/$prospectId/convert',
      params: { prospectId: 'prospect-1' }
    });
  });

  it('navigates to the route-backed client edit panel', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('button', { name: /^modifier$/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/$clientNumber/edit',
      params: { clientNumber: '98568547' }
    });
  });

  it('navigates to the route-backed prospect edit panel', async () => {
    const user = userEvent.setup();
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: prospectRecord }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'prospect', id: 'prospect-1' }} />);

    await user.click(screen.getByRole('button', { name: /^modifier$/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/prospects/$prospectId/edit',
      params: { prospectId: 'prospect-1' }
    });
  });

  it('renders the supplier detail view with supplier-specific labels', () => {
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: supplierRecord }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'supplier', id: 'supplier-1' }} />);

    expect(screen.getByText('Fournisseurs')).toBeInTheDocument();
    expect(screen.getByText('Code FEST')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'FESTO' })).toBeInTheDocument();
    expect(screen.getAllByText('Fournisseur').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'Synthèse' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Interactions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historique' })).toBeInTheDocument();
    expect(screen.getByText('Code fournisseur')).toBeInTheDocument();
    expect(screen.getByText('Référentiel global CIR')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /convertir en client/i })).not.toBeInTheDocument();
  });

  it('navigates to the route-backed supplier edit panel', async () => {
    const user = userEvent.setup();
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: supplierRecord }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'supplier', id: 'supplier-1' }} />);

    await user.click(screen.getByRole('button', { name: /^modifier$/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/suppliers/$supplierId/edit',
      params: { supplierId: 'supplier-1' }
    });
  });

  it('deletes a supplier with related interactions and falls back to suppliers list', async () => {
    const user = userEvent.setup();
    mockUseCanGoBack.mockReturnValue(false);
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: supplierRecord }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'supplier', id: 'supplier-1' }} />);

    await user.click(screen.getByRole('button', { name: /supprimer définitivement/i }));
    expect(screen.getByText(/interactions rattachées à ce fournisseur/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(mockDeleteSupplierMutateAsync).toHaveBeenCalledWith({
        supplierId: 'supplier-1',
        deleteRelatedInteractions: true
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/suppliers',
        search: expect.objectContaining({ type: 'supplier' }),
        replace: true
      });
    });
  });

  it('saves supplier edits through the shared edit panel', async () => {
    const user = userEvent.setup();
    mockedDirectoryRecord.mockReturnValue({
      isLoading: false,
      data: { record: supplierRecord }
    } as never);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'supplier', id: 'supplier-1' }} isEditOpen />);

    expect(screen.getByRole('heading', { name: /modifier le fournisseur/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/code fournisseur/i)).toHaveValue('FEST');
    expect(screen.getByLabelText(/téléphone principal/i)).toHaveValue('0545852565');

    await user.clear(screen.getByLabelText(/nom fournisseur/i));
    await user.type(screen.getByLabelText(/nom fournisseur/i), 'FESTO France');
    await user.clear(screen.getByLabelText(/n° fournisseur/i));
    await user.type(screen.getByLabelText(/n° fournisseur/i), '778899');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(mockSaveSupplierMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        id: 'supplier-1',
        entity_type: 'Fournisseur',
        name: 'FESTO France',
        supplier_code: 'FEST',
        supplier_number: '778899',
        primary_phone: '0545852565',
        primary_email: 'contact@festo.test'
      }));
    });
  });

  it('renders the route-backed edit panel and exposes the dirty bar', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} isEditOpen />
    );

    const editDialog = screen.getByRole('dialog');
    expect(editDialog).toBeInTheDocument();
    expect(editDialog.className).toContain('sm:!max-w-[1180px]');
    expect(screen.getByRole('heading', { name: /modifier le client/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/raison sociale/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Client modifié');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /fermer l'édition/i }));

    expect(screen.getByText('Modifications non sauvegardées')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /quitter sans enregistrer/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/$clientNumber',
      params: { clientNumber: '98568547' }
    });
  });

  it('does not block the route-backed close after a successful client save', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} isEditOpen />
    );

    const nameInput = screen.getByLabelText(/raison sociale/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Client synchronisé');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(mockSaveClientMutateAsync).toHaveBeenCalled();
    });

    expect(lastNavigationWasBlocked).toBe(false);
    expect(screen.queryByText('Modifications non sauvegardées')).not.toBeInTheDocument();
  });

  it('falls back to the canonical directory route when delete succeeds without in-app history', async () => {
    const user = userEvent.setup();
    mockUseCanGoBack.mockReturnValue(false);

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('button', { name: /supprimer d.finitivement/i }));
    await user.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/clients',
        search: expect.objectContaining({ type: 'all' }),
        replace: true
      });
    });

    expect(mockHistoryBack).not.toHaveBeenCalled();
  });

  it('renders the filtered interactions workspace inside the interactions tab', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('tab', { name: 'Interactions' }));

    expect(screen.getByRole('heading', { name: 'Interactions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'En cours' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Terminées' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Toutes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrer les interactions')).toBeInTheDocument();
    expect(screen.getByText('Demande de devis')).toBeInTheDocument();
    expect(screen.queryByText('Journal fiche & contacts')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fiche précédente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fiche suivante' })).not.toBeInTheDocument();
  });

  it('renders the audit journal inside the history tab without interactions', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('tab', { name: 'Historique' }));

    expect(screen.getByText('Journal fiche & contacts')).toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrer les interactions')).not.toBeInTheDocument();
  });

  it('opens and queues deletion for an interaction from the client record', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    await user.click(screen.getByRole('tab', { name: 'Interactions' }));
    await user.click(screen.getByRole('button', { name: /ouvrir demande de devis/i }));
    await user.click(screen.getByRole('button', { name: /supprimer demande de devis/i }));

    expect(mockSetSelectedInteraction).toHaveBeenCalledWith(openInteraction);
    expect(mockSetInteractionToDelete).toHaveBeenCalledWith(openInteraction);
  });

  it('renders the interaction details sheet when an interaction is selected', () => {
    mockedRecordInteractions.mockReturnValue(
      createDefaultInteractionsState({ selectedInteraction: openInteraction }) as never
    );

    renderWithProviders(<ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber: '98568547' }} />);

    expect(screen.getByTestId('interaction-details-sheet')).toHaveTextContent('Demande de devis');
  });
});
