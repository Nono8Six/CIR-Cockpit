import { useMemo } from 'react';

import { isProspectRelationValue } from '@/constants/relations';
import type { AgencyConfig } from '@/services/config';
import type { Entity, EntityContact, Interaction } from '@/types';

type SearchIndex = {
  entities: Entity[];
  contacts: EntityContact[];
};

type UseAppSearchDataParams = {
  searchQuery: string;
  interactions: Interaction[];
  entitySearchIndex: SearchIndex;
  defaultStatusId: string;
};

export const useAppSearchData = ({ searchQuery, interactions, entitySearchIndex, defaultStatusId }: UseAppSearchDataParams) => {
  const lowerQuery = searchQuery.toLowerCase();
  const rawQuery = searchQuery.replace(/\s/g, '');

  const clientEntities = useMemo(() => entitySearchIndex.entities.filter(entity => entity.entity_type === 'Client'), [entitySearchIndex.entities]);
  const prospectEntities = useMemo(() => entitySearchIndex.entities.filter(entity => isProspectRelationValue(entity.entity_type)), [entitySearchIndex.entities]);
  const entitiesById = useMemo(() => new Map(entitySearchIndex.entities.map(entity => [entity.id, entity])), [entitySearchIndex.entities]);
  const entityNameById = useMemo(() => new Map(entitySearchIndex.entities.map(entity => [entity.id, entity.name])), [entitySearchIndex.entities]);

  const filteredInteractions = useMemo(() => {
    if (!searchQuery) return [];
    return interactions.filter(interaction => (
      interaction.company_name.toLowerCase().includes(lowerQuery)
      || interaction.contact_name.toLowerCase().includes(lowerQuery)
      || interaction.subject.toLowerCase().includes(lowerQuery)
      || (interaction.order_ref && interaction.order_ref.includes(searchQuery))
      || (interaction.contact_phone ?? '').includes(searchQuery)
      || (interaction.contact_email ?? '').toLowerCase().includes(lowerQuery)
    ));
  }, [interactions, lowerQuery, searchQuery]);

  const filterEntities = (list: Entity[]) => {
    if (!searchQuery) return [];
    return list.filter(entity => (
      entity.name.toLowerCase().includes(lowerQuery)
      || (entity.client_number ?? '').includes(rawQuery)
      || (entity.city ?? '').toLowerCase().includes(lowerQuery)
      || (entity.siret ?? '').includes(rawQuery)
    ));
  };

  const filteredClients = useMemo(() => filterEntities(clientEntities), [clientEntities, lowerQuery, rawQuery, searchQuery]);
  const filteredProspects = useMemo(() => filterEntities(prospectEntities), [lowerQuery, prospectEntities, rawQuery, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return [];
    return entitySearchIndex.contacts.filter(contact => {
      const entity = entitiesById.get(contact.entity_id);
      if (!entity || entity.entity_type !== 'Client') return false;
      return (
        `${contact.first_name ?? ''} ${contact.last_name}`.toLowerCase().includes(lowerQuery)
        || (contact.email ?? '').toLowerCase().includes(lowerQuery)
        || (contact.phone ?? '').toLowerCase().includes(lowerQuery)
        || (contact.position ?? '').toLowerCase().includes(lowerQuery)
      );
    });
  }, [entitiesById, entitySearchIndex.contacts, lowerQuery, searchQuery]);

  const recentEntities = useMemo(() => {
    if (interactions.length === 0 || entitySearchIndex.entities.length === 0) return [];
    const byId = new Map(entitySearchIndex.entities.map(entity => [entity.id, entity]));
    const seen = new Set<string>();
    const sorted = [...interactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const result: Entity[] = [];

    for (const interaction of sorted) {
      if (!interaction.entity_id || seen.has(interaction.entity_id)) continue;
      const entity = byId.get(interaction.entity_id);
      if (!entity) continue;
      seen.add(interaction.entity_id);
      result.push(entity);
      if (result.length >= 6) break;
    }
    return result;
  }, [entitySearchIndex.entities, interactions]);

  const hasSearchResults = filteredInteractions.length + filteredClients.length + filteredProspects.length + filteredContacts.length > 0;
  const pendingCount = useMemo(() => {
    if (!defaultStatusId) return 0;
    return interactions.filter(interaction => interaction.status_id === defaultStatusId).length;
  }, [defaultStatusId, interactions]);

  return {
    filteredInteractions,
    filteredClients,
    filteredProspects,
    filteredContacts,
    hasSearchResults,
    entityNameById,
    recentEntities,
    pendingCount
  };
};

export const getDefaultStatusId = (statuses: AgencyConfig['statuses']) =>
  statuses.find(status => status.is_default)?.id ?? statuses[0]?.id ?? '';
