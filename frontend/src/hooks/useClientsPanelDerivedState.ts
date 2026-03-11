import { useDeferredValue, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { Client, Entity } from '@/types';

type ClientsPanelViewMode = 'clients' | 'prospects';

type UseClientsPanelDerivedStateParams = {
  clients: Client[];
  prospects: Entity[];
  searchTerm: string;
  focusedClientId: string | null;
  onFocusHandled: () => void;
  selectedClientId: string | null;
  selectedProspectId: string | null;
  setViewMode: Dispatch<SetStateAction<ClientsPanelViewMode>>;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  setSelectedClientId: Dispatch<SetStateAction<string | null>>;
};

const normalizeSearchTerm = (value: string): { term: string; compact: string } => {
  const term = value.trim().toLowerCase();
  return {
    term,
    compact: term.replace(/\s/g, '')
  };
};

const filterClients = (clients: Client[], search: { term: string; compact: string }): Client[] => {
  if (!search.term) {
    return clients;
  }

  return clients.filter((client) =>
    client.name.toLowerCase().includes(search.term)
    || (client.client_number ?? '').includes(search.compact)
    || (client.city?.toLowerCase().includes(search.term) ?? false)
  );
};

const filterProspects = (prospects: Entity[], search: { term: string; compact: string }): Entity[] => {
  if (!search.term) {
    return prospects;
  }

  return prospects.filter((prospect) =>
    prospect.name.toLowerCase().includes(search.term)
    || (prospect.client_number ?? '').includes(search.compact)
    || (prospect.city ?? '').toLowerCase().includes(search.term)
    || (prospect.siret ?? '').includes(search.compact)
    || (prospect.postal_code ?? '').includes(search.compact)
  );
};

export const toConvertClientEntity = (selectedProspect: Entity | null): ConvertClientEntity | null => {
  if (!selectedProspect) {
    return null;
  }

  return {
    id: selectedProspect.id,
    name: selectedProspect.name,
    client_number: selectedProspect.client_number,
    account_type: selectedProspect.account_type
  };
};

export const useClientsPanelDerivedState = ({
  clients,
  prospects,
  searchTerm,
  focusedClientId,
  onFocusHandled,
  selectedClientId,
  selectedProspectId,
  setViewMode,
  setSearchTerm,
  setSelectedClientId
}: UseClientsPanelDerivedStateParams) => {
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = useMemo(
    () => normalizeSearchTerm(deferredSearchTerm),
    [deferredSearchTerm]
  );

  const filteredClients = useMemo(
    () => filterClients(clients, normalizedSearch),
    [clients, normalizedSearch]
  );
  const filteredProspects = useMemo(
    () => filterProspects(prospects, normalizedSearch),
    [normalizedSearch, prospects]
  );

  useEffect(() => {
    if (!focusedClientId) {
      return;
    }

    setViewMode('clients');
    setSearchTerm('');
    setSelectedClientId(focusedClientId);
    onFocusHandled();
  }, [focusedClientId, onFocusHandled, setSearchTerm, setSelectedClientId, setViewMode]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId]
  );
  const selectedProspect = useMemo(
    () => prospects.find((prospect) => prospect.id === selectedProspectId) ?? prospects[0] ?? null,
    [prospects, selectedProspectId]
  );

  return {
    filteredClients,
    filteredProspects,
    selectedClient,
    selectedProspect
  };
};
