import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { Client, ClientContact, Entity, UserRole } from '@/types';
import { useClients } from './useClients';
import { useProspects } from './useProspects';
import { useAgencies } from './useAgencies';
import { useSaveClient } from './useSaveClient';
import { useSaveProspect } from './useSaveProspect';
import { useSetClientArchived } from './useSetClientArchived';
import { useEntityContacts } from './useEntityContacts';
import { useSaveEntityContact } from './useSaveEntityContact';
import { useDeleteEntityContact } from './useDeleteEntityContact';
import { notifySuccess } from '@/services/errors/notify';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';

type UseClientsPanelStateParams = {
  activeAgencyId: string | null;
  userRole: UserRole;
  focusedClientId: string | null;
  onFocusHandled: () => void;
};

const normalizeSearchTerm = (value: string): { term: string; compact: string } => {
  const term = value.trim().toLowerCase();
  return {
    term,
    compact: term.replace(/\s/g, '')
  };
};

export const useClientsPanelState = ({
  activeAgencyId,
  userRole,
  focusedClientId,
  onFocusHandled
}: UseClientsPanelStateParams) => {
  const [viewMode, setViewMode] = useState<'clients' | 'prospects'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [prospectDialogOpen, setProspectDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [contactToEdit, setContactToEdit] = useState<ClientContact | null>(null);
  const [prospectToEdit, setProspectToEdit] = useState<Entity | null>(null);
  const [agencyFilterId, setAgencyFilterId] = useState<string | null>(activeAgencyId);
  const [confirmArchive, setConfirmArchive] = useState<{ nextArchived: boolean } | null>(null);
  const [confirmDeleteContact, setConfirmDeleteContact] = useState<ClientContact | null>(null);

  const agenciesQuery = useAgencies(false, userRole !== 'tcs' || Boolean(activeAgencyId));
  const agencies = agenciesQuery.data ?? [];

  useEffect(() => {
    if (userRole !== 'super_admin') {
      setAgencyFilterId(activeAgencyId);
    }
  }, [activeAgencyId, userRole]);

  const effectiveAgencyId = userRole === 'super_admin' ? agencyFilterId : activeAgencyId;
  const isOrphansFilter = agencyFilterId === '__orphans__';
  const clientsQuery = useClients(
    {
      agencyId: isOrphansFilter ? null : effectiveAgencyId,
      includeArchived: showArchived,
      orphansOnly: isOrphansFilter
    },
    true
  );
  const prospectsQuery = useProspects(
    {
      agencyId: isOrphansFilter ? null : effectiveAgencyId,
      includeArchived: showArchived,
      orphansOnly: isOrphansFilter
    },
    true
  );

  const clients = clientsQuery.data ?? [];
  const prospects = prospectsQuery.data ?? [];
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = useMemo(
    () => normalizeSearchTerm(deferredSearchTerm),
    [deferredSearchTerm]
  );

  const filteredClients = useMemo(() => {
    if (!normalizedSearch.term) {
      return clients;
    }

    return clients.filter((client) =>
      client.name.toLowerCase().includes(normalizedSearch.term)
      || (client.client_number ?? '').includes(normalizedSearch.compact)
      || (client.city?.toLowerCase().includes(normalizedSearch.term) ?? false)
    );
  }, [clients, normalizedSearch.compact, normalizedSearch.term]);

  const filteredProspects = useMemo(() => {
    if (!normalizedSearch.term) {
      return prospects;
    }

    return prospects.filter((prospect) =>
      prospect.name.toLowerCase().includes(normalizedSearch.term)
      || (prospect.client_number ?? '').includes(normalizedSearch.compact)
      || (prospect.city ?? '').toLowerCase().includes(normalizedSearch.term)
      || (prospect.siret ?? '').includes(normalizedSearch.compact)
      || (prospect.postal_code ?? '').includes(normalizedSearch.compact)
    );
  }, [normalizedSearch.compact, normalizedSearch.term, prospects]);

  useEffect(() => {
    if (!focusedClientId) {
      return;
    }

    setViewMode('clients');
    setSearchTerm('');
    setSelectedClientId(focusedClientId);
    onFocusHandled();
  }, [focusedClientId, onFocusHandled]);

  useEffect(() => {
    if (viewMode !== 'clients') {
      return;
    }

    if (selectedClientId && !clients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(null);
      return;
    }

    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId, viewMode]);

  useEffect(() => {
    if (viewMode !== 'prospects') {
      return;
    }

    if (selectedProspectId && !prospects.some((prospect) => prospect.id === selectedProspectId)) {
      setSelectedProspectId(null);
      return;
    }

    if (!selectedProspectId && prospects.length > 0) {
      setSelectedProspectId(prospects[0].id);
    }
  }, [prospects, selectedProspectId, viewMode]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedProspect = prospects.find((prospect) => prospect.id === selectedProspectId) ?? null;
  const activeEntity = viewMode === 'clients' ? selectedClient : selectedProspect;
  const contactsQuery = useEntityContacts(activeEntity?.id ?? null, false, Boolean(activeEntity));
  const contacts = contactsQuery.data ?? [];
  const saveClientMutation = useSaveClient(effectiveAgencyId ?? null, showArchived);
  const saveProspectMutation = useSaveProspect(effectiveAgencyId ?? null, showArchived, isOrphansFilter);
  const archiveClientMutation = useSetClientArchived(effectiveAgencyId ?? null);
  const saveContactMutation = useSaveEntityContact(activeEntity?.id ?? null, false, effectiveAgencyId);
  const deleteContactMutation = useDeleteEntityContact(activeEntity?.id ?? null, false);

  useEffect(() => {
    setContactDialogOpen(false);
    setContactToEdit(null);
    setClientDialogOpen(false);
    setProspectDialogOpen(false);
  }, [viewMode]);

  const handleCreateClient = useCallback(() => {
    if (userRole === 'tcs' && !activeAgencyId) {
      handleUiError(
        createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Impossible de creer un client sans agence active.',
          source: 'client'
        }),
        'Impossible de creer un client sans agence active.',
        { source: 'ClientsPanel.createClient' }
      );
      return;
    }

    setClientToEdit(null);
    setClientDialogOpen(true);
  }, [activeAgencyId, userRole]);

  const handleEditClient = useCallback(() => {
    if (!selectedClient) {
      return;
    }

    setClientToEdit(selectedClient);
    setClientDialogOpen(true);
  }, [selectedClient]);

  const handleEditProspect = useCallback(() => {
    if (!selectedProspect) {
      return;
    }

    setProspectToEdit(selectedProspect);
    setProspectDialogOpen(true);
  }, [selectedProspect]);

  const handleSaveClient = useCallback(
    async (payload: Parameters<typeof saveClientMutation.mutateAsync>[0]) => {
      try {
        await saveClientMutation.mutateAsync(payload);
        notifySuccess(clientToEdit ? 'Client mis a jour.' : 'Client cree.');
      } catch {
        return;
      }
    },
    [clientToEdit, saveClientMutation]
  );

  const handleSaveProspect = useCallback(
    async (payload: Parameters<typeof saveProspectMutation.mutateAsync>[0]) => {
      try {
        await saveProspectMutation.mutateAsync(payload);
        notifySuccess(prospectToEdit ? 'Prospect mis a jour.' : 'Prospect cree.');
      } catch {
        return;
      }
    },
    [prospectToEdit, saveProspectMutation]
  );

  const handleToggleArchive = useCallback(
    (nextArchived: boolean) => {
      if (!selectedClient) {
        return;
      }

      setConfirmArchive({ nextArchived });
    },
    [selectedClient]
  );

  const executeToggleArchive = useCallback(async () => {
    if (!selectedClient || !confirmArchive) {
      return;
    }

    try {
      await archiveClientMutation.mutateAsync({
        clientId: selectedClient.id,
        archived: confirmArchive.nextArchived
      });
      notifySuccess(confirmArchive.nextArchived ? 'Client archive.' : 'Client restaure.');
    } catch {
      return;
    }
  }, [archiveClientMutation, confirmArchive, selectedClient]);

  const handleAddContact = useCallback(() => {
    if (!activeEntity) {
      return;
    }

    setContactToEdit(null);
    setContactDialogOpen(true);
  }, [activeEntity]);

  const handleEditContact = useCallback((contact: ClientContact) => {
    setContactToEdit(contact);
    setContactDialogOpen(true);
  }, []);

  const handleSaveContact = useCallback(
    async (payload: Parameters<typeof saveContactMutation.mutateAsync>[0]) => {
      try {
        await saveContactMutation.mutateAsync(payload);
        notifySuccess(contactToEdit ? 'Contact mis a jour.' : 'Contact ajoute.');
      } catch {
        return;
      }
    },
    [contactToEdit, saveContactMutation]
  );

  const handleDeleteContact = useCallback((contact: ClientContact) => {
    setConfirmDeleteContact(contact);
  }, []);

  const executeDeleteContact = useCallback(async () => {
    if (!confirmDeleteContact) {
      return;
    }

    try {
      await deleteContactMutation.mutateAsync(confirmDeleteContact.id);
      notifySuccess('Contact supprime.');
    } catch {
      return;
    }
  }, [confirmDeleteContact, deleteContactMutation]);

  const getConvertEntityFromSelectedProspect = useCallback((): ConvertClientEntity | null => {
    if (!selectedProspect) {
      return null;
    }

    return {
      id: selectedProspect.id,
      name: selectedProspect.name,
      client_number: selectedProspect.client_number,
      account_type: selectedProspect.account_type
    };
  }, [selectedProspect]);

  return {
    viewMode,
    searchTerm,
    showArchived,
    selectedClientId,
    selectedProspectId,
    clientDialogOpen,
    prospectDialogOpen,
    contactDialogOpen,
    clientToEdit,
    contactToEdit,
    prospectToEdit,
    agencyFilterId,
    confirmArchive,
    confirmDeleteContact,
    agencies,
    clientsQuery,
    prospectsQuery,
    contactsQuery,
    filteredClients,
    filteredProspects,
    selectedClient,
    selectedProspect,
    activeEntity,
    contacts,
    setViewMode,
    setSearchTerm,
    setShowArchived,
    setSelectedClientId,
    setSelectedProspectId,
    setClientDialogOpen,
    setProspectDialogOpen,
    setContactDialogOpen,
    setAgencyFilterId,
    setConfirmArchive,
    setConfirmDeleteContact,
    handleCreateClient,
    handleEditClient,
    handleEditProspect,
    handleSaveClient,
    handleSaveProspect,
    handleToggleArchive,
    executeToggleArchive,
    handleAddContact,
    handleEditContact,
    handleSaveContact,
    handleDeleteContact,
    executeDeleteContact,
    getConvertEntityFromSelectedProspect
  };
};
