import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClientsPanelState } from '@/hooks/useClientsPanelState';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import type { Client, Entity, EntityContact } from '@/types';

const panelMocks = vi.hoisted(() => ({
  useClients: vi.fn(),
  useProspects: vi.fn(),
  useAgencies: vi.fn(),
  useSaveClient: vi.fn(),
  useSaveProspect: vi.fn(),
  useSetClientArchived: vi.fn(),
  useDeleteClient: vi.fn(),
  useReassignEntity: vi.fn(),
  useEntityContacts: vi.fn(),
  useSaveEntityContact: vi.fn(),
  useDeleteEntityContact: vi.fn()
}));

vi.mock('@/hooks/useClients', () => ({
  useClients: panelMocks.useClients
}));
vi.mock('@/hooks/useProspects', () => ({
  useProspects: panelMocks.useProspects
}));
vi.mock('@/hooks/useAgencies', () => ({
  useAgencies: panelMocks.useAgencies
}));
vi.mock('@/hooks/useSaveClient', () => ({
  useSaveClient: panelMocks.useSaveClient
}));
vi.mock('@/hooks/useSaveProspect', () => ({
  useSaveProspect: panelMocks.useSaveProspect
}));
vi.mock('@/hooks/useSetClientArchived', () => ({
  useSetClientArchived: panelMocks.useSetClientArchived,
  useDeleteClient: panelMocks.useDeleteClient
}));
vi.mock('@/hooks/useReassignEntity', () => ({
  useReassignEntity: panelMocks.useReassignEntity
}));
vi.mock('@/hooks/useEntityContacts', () => ({
  useEntityContacts: panelMocks.useEntityContacts
}));
vi.mock('@/hooks/useSaveEntityContact', () => ({
  useSaveEntityContact: panelMocks.useSaveEntityContact
}));
vi.mock('@/hooks/useDeleteEntityContact', () => ({
  useDeleteEntityContact: panelMocks.useDeleteEntityContact
}));

vi.mock('@/services/errors/notify', () => ({
  notifySuccess: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

const createEntity = (overrides?: Partial<Entity>): Entity => ({
  id: overrides?.id ?? 'entity-1',
  account_type: overrides?.account_type ?? null,
  address: overrides?.address ?? null,
  agency_id: overrides?.agency_id ?? 'agency-1',
  archived_at: overrides?.archived_at ?? null,
  city: overrides?.city ?? 'Paris',
  client_number: overrides?.client_number ?? 'C-001',
  country: overrides?.country ?? 'France',
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  created_by: overrides?.created_by ?? null,
  department: overrides?.department ?? null,
  entity_type: overrides?.entity_type ?? 'Client',
  name: overrides?.name ?? 'Acme',
  notes: overrides?.notes ?? null,
  postal_code: overrides?.postal_code ?? null,
  siret: overrides?.siret ?? null,
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z'
});

const createContact = (overrides?: Partial<EntityContact>): EntityContact => ({
  id: overrides?.id ?? 'contact-1',
  archived_at: overrides?.archived_at ?? null,
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  email: overrides?.email ?? 'alice@example.com',
  entity_id: overrides?.entity_id ?? 'entity-1',
  first_name: overrides?.first_name ?? 'Alice',
  last_name: overrides?.last_name ?? 'Martin',
  notes: overrides?.notes ?? null,
  phone: overrides?.phone ?? '0102030405',
  position: overrides?.position ?? null,
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z'
});

const createClient = (overrides?: Partial<Client>): Client =>
  createEntity({
    ...overrides,
    entity_type: 'Client'
  });

describe('useClientsPanelState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    panelMocks.useAgencies.mockReturnValue({ data: [{ id: 'agency-1', name: 'Agence A' }] });
    panelMocks.useClients.mockReturnValue({
      data: [createClient({ id: 'client-1', name: 'Acme' })],
      refetch: vi.fn()
    });
    panelMocks.useProspects.mockReturnValue({
      data: [createEntity({ id: 'prospect-1', entity_type: 'Prospect', name: 'Prospect One' })],
      refetch: vi.fn()
    });
    panelMocks.useEntityContacts.mockReturnValue({
      data: [createContact()],
      isLoading: false
    });
    panelMocks.useSaveClient.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    panelMocks.useSaveProspect.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    panelMocks.useSetClientArchived.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    panelMocks.useDeleteClient.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    panelMocks.useReassignEntity.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        entity: createEntity(),
        propagated_interactions_count: 2
      }),
      isPending: false
    });
    panelMocks.useSaveEntityContact.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    panelMocks.useDeleteEntityContact.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
  });

  it('handles client/prospect actions and emits success notifications', async () => {
    const { result } = renderHook(() =>
      useClientsPanelState({
        activeAgencyId: 'agency-1',
        userRole: 'super_admin',
        focusedClientId: null,
        onFocusHandled: vi.fn()
      })
    );

    act(() => {
      result.current.setSearchTerm('acme');
    });
    expect(result.current.filteredClients).toHaveLength(1);

    await act(async () => {
      await result.current.handleSaveClient({
        account_type: 'term',
        name: 'Acme'
        ,
        agency_id: 'agency-1',
        address: '',
        postal_code: '',
        department: '',
        city: ''
      });
      await result.current.handleSaveProspect({
        name: 'Prospect One',
        entity_type: 'Prospect',
        agency_id: 'agency-1'
      });
      await result.current.handleReassignEntity('client-1', 'agency-2');
    });

    expect(notifySuccess).toHaveBeenCalledWith('Client cree.');
    expect(notifySuccess).toHaveBeenCalledWith('Prospect cree.');
    expect(notifySuccess).toHaveBeenCalledWith(
      'Entite reattribuee. 2 interaction(s) mise(s) a jour.'
    );
  });

  it('reports a validation error when tcs has no active agency', () => {
    const appError = createAppError({
      code: 'VALIDATION_ERROR',
      message: 'Impossible de creer un client sans agence active.',
      source: 'validation'
    });
    vi.mocked(handleUiError).mockReturnValue(appError);

    const { result } = renderHook(() =>
      useClientsPanelState({
        activeAgencyId: null,
        userRole: 'tcs',
        focusedClientId: null,
        onFocusHandled: vi.fn()
      })
    );

    act(() => {
      result.current.handleCreateClient();
    });

    expect(handleUiError).toHaveBeenCalledTimes(1);
    expect(result.current.clientDialogOpen).toBe(false);
  });

  it('applies focused client and acknowledges focus handling callback', async () => {
    const onFocusHandled = vi.fn();

    const { result } = renderHook(() =>
      useClientsPanelState({
        activeAgencyId: 'agency-1',
        userRole: 'agency_admin',
        focusedClientId: 'client-1',
        onFocusHandled
      })
    );

    await waitFor(() => {
      expect(result.current.selectedClientId).toBe('client-1');
    });
    expect(result.current.viewMode).toBe('clients');
    expect(onFocusHandled).toHaveBeenCalledTimes(1);
  });

  it('handles archive and contact workflows for selected entities', async () => {
    const archiveMutation = vi.fn().mockResolvedValue(undefined);
    const deleteClientMutation = vi.fn().mockResolvedValue(undefined);
    const saveContactMutation = vi.fn().mockResolvedValue(undefined);
    const deleteContactMutation = vi.fn().mockResolvedValue(undefined);

    panelMocks.useSetClientArchived.mockReturnValue({ mutateAsync: archiveMutation });
    panelMocks.useDeleteClient.mockReturnValue({ mutateAsync: deleteClientMutation });
    panelMocks.useSaveEntityContact.mockReturnValue({ mutateAsync: saveContactMutation });
    panelMocks.useDeleteEntityContact.mockReturnValue({ mutateAsync: deleteContactMutation });

    const contact = createContact();
    panelMocks.useEntityContacts.mockReturnValue({
      data: [contact],
      isLoading: false
    });

    const { result } = renderHook(() =>
      useClientsPanelState({
        activeAgencyId: 'agency-1',
        userRole: 'super_admin',
        focusedClientId: null,
        onFocusHandled: vi.fn()
      })
    );

    act(() => {
      result.current.handleToggleArchive(true);
    });
    await act(async () => {
      await result.current.executeToggleArchive();
    });
    act(() => {
      result.current.handleDeleteClient();
    });
    await act(async () => {
      await result.current.executeDeleteClient();
    });

    act(() => {
      result.current.handleAddContact();
      result.current.handleEditContact(contact);
    });
    await act(async () => {
      await result.current.handleSaveContact({
        entity_id: 'entity-1',
        first_name: 'Alice',
        last_name: 'Martin'
      });
    });

    act(() => {
      result.current.handleDeleteContact(contact);
    });
    await act(async () => {
      await result.current.executeDeleteContact();
    });

    expect(archiveMutation).toHaveBeenCalledTimes(1);
    expect(deleteClientMutation).toHaveBeenCalledTimes(1);
    expect(deleteClientMutation).toHaveBeenCalledWith({
      clientId: 'client-1',
      deleteRelatedInteractions: true
    });
    expect(saveContactMutation).toHaveBeenCalledTimes(1);
    expect(deleteContactMutation).toHaveBeenCalledWith(contact.id);
    expect(notifySuccess).toHaveBeenCalledWith('Client archive.');
    expect(notifySuccess).toHaveBeenCalledWith('Client supprime definitivement.');
    expect(notifySuccess).toHaveBeenCalledWith('Contact mis a jour.');
    expect(notifySuccess).toHaveBeenCalledWith('Contact supprime.');
  });

  it('allows super_admin to delete a selected prospect', async () => {
    const deleteClientMutation = vi.fn().mockResolvedValue(undefined);
    panelMocks.useDeleteClient.mockReturnValue({ mutateAsync: deleteClientMutation });

    const { result } = renderHook(() =>
      useClientsPanelState({
        activeAgencyId: 'agency-1',
        userRole: 'super_admin',
        focusedClientId: null,
        onFocusHandled: vi.fn()
      })
    );

    act(() => {
      result.current.setViewMode('prospects');
      result.current.handleDeleteProspect();
    });

    await act(async () => {
      await result.current.executeDeleteProspect();
    });

    expect(deleteClientMutation).toHaveBeenCalledTimes(1);
    expect(deleteClientMutation).toHaveBeenCalledWith({
      clientId: 'prospect-1',
      deleteRelatedInteractions: true
    });
    expect(notifySuccess).toHaveBeenCalledWith('Prospect supprime definitivement.');
  });
});
