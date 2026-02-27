import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import type { Entity, EntityContact } from '@/types';
import { useEntitySearchIndex } from './useEntitySearchIndex';

type InteractionSearchInput = {
  agencyId?: string | null;
  entityType?: string;
  entities: Entity[];
  contacts: EntityContact[];
  isLoading?: boolean;
  recentEntities?: Entity[];
  onSelectEntity: (entity: Entity) => void;
  onSelectContact: (contact: EntityContact, entity: Entity | null) => void;
  onOpenGlobalSearch?: () => void;
};

type InteractionSearchStatus = 'loading' | 'error' | 'idle' | 'empty' | 'results';

const normalizeQuery = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value?: string | null) => (value ?? '').replace(/\s/g, '');

export const useInteractionSearch = ({
  agencyId,
  entityType = '',
  entities,
  contacts,
  isLoading = false,
  recentEntities,
  onSelectEntity,
  onSelectContact,
  onOpenGlobalSearch
}: InteractionSearchInput) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const hasExternalData = entities.length > 0 || contacts.length > 0;
  const shouldFetchBase = !hasExternalData && Boolean(agencyId);
  const baseSearch = useEntitySearchIndex(agencyId ?? null, false, shouldFetchBase);
  const shouldFetchArchived = includeArchived && Boolean(agencyId);
  const archivedSearch = useEntitySearchIndex(agencyId ?? null, true, shouldFetchArchived);
  const baseEntities = hasExternalData ? entities : (baseSearch.data?.entities ?? []);
  const baseContacts = hasExternalData ? contacts : (baseSearch.data?.contacts ?? []);
  const resolvedEntities = includeArchived
    ? (archivedSearch.data?.entities ?? baseEntities)
    : baseEntities;
  const resolvedContacts = includeArchived
    ? (archivedSearch.data?.contacts ?? baseContacts)
    : baseContacts;
  const resolvedLoading = isLoading
    || (includeArchived ? archivedSearch.isLoading : baseSearch.isLoading);
  const showSearchError = includeArchived
    ? archivedSearch.isError && !archivedSearch.isLoading
    : baseSearch.isError && !baseSearch.isLoading;

  const normalizedRelation = entityType.trim().toLowerCase();
  const filteredRecents = useMemo(() => {
    if (!recentEntities?.length) return [];
    if (!normalizedRelation) return recentEntities;
    return recentEntities.filter((entity) => (
      entity.entity_type.trim().toLowerCase() === normalizedRelation
    ));
  }, [normalizedRelation, recentEntities]);

  const { matchedEntities, matchedContacts, entitiesById } = useMemo(() => {
    const normalized = normalizeQuery(deferredQuery);
    if (!normalized) {
      return {
        matchedEntities: [],
        matchedContacts: [],
        entitiesById: new Map<string, Entity>()
      };
    }

    const matchesRelation = (entity: Entity) => {
      if (!normalizedRelation) return true;
      return entity.entity_type.trim().toLowerCase() === normalizedRelation;
    };

    const byId = new Map<string, Entity>();
    for (const entity of resolvedEntities) {
      byId.set(entity.id, entity);
    }

    const matchedEntities = resolvedEntities.filter((entity) => {
      if (!matchesRelation(entity)) return false;
      const name = entity.name.toLowerCase();
      const city = (entity.city ?? '').toLowerCase();
      const number = normalizePhone(entity.client_number);
      const rawQuery = normalized.replace(/\s/g, '');
      return name.includes(normalized) || city.includes(normalized) || number.includes(rawQuery);
    });

    const matchedContacts = resolvedContacts.filter((contact) => {
      const entity = byId.get(contact.entity_id);
      if (!entity || !matchesRelation(entity)) return false;
      const fullName = `${contact.first_name ?? ''} ${contact.last_name}`.trim().toLowerCase();
      const email = (contact.email ?? '').toLowerCase();
      const phone = normalizePhone(contact.phone);
      const rawQuery = normalized.replace(/\s/g, '');
      return fullName.includes(normalized) || email.includes(normalized) || phone.includes(rawQuery);
    });

    return { matchedEntities, matchedContacts, entitiesById: byId };
  }, [deferredQuery, normalizedRelation, resolvedContacts, resolvedEntities]);

  const showResults = query.trim().length > 0;
  const showRecents = !showResults && filteredRecents.length > 0;
  const showList = showResults || isOpen;
  const limitedEntities = matchedEntities.slice(0, 3);
  const remainingSlots = 5 - limitedEntities.length;
  const limitedContacts = matchedContacts.slice(0, Math.min(2, remainingSlots));
  const hasResults = limitedEntities.length > 0 || limitedContacts.length > 0;
  let status: InteractionSearchStatus = 'results';
  if (resolvedLoading) {
    status = 'loading';
  } else if (showSearchError) {
    status = 'error';
  } else if (!showResults && !showRecents) {
    status = 'idle';
  } else if (showResults && !hasResults) {
    status = 'empty';
  }
  const entityHeading = entityType.trim() ? entityType.trim() : 'Entites';

  const handleSelectEntity = useCallback((entity: Entity) => {
    onSelectEntity(entity);
    setQuery('');
    setIsOpen(false);
  }, [onSelectEntity]);

  const handleSelectContact = useCallback((contact: EntityContact) => {
    onSelectContact(contact, entitiesById.get(contact.entity_id) ?? null);
    setQuery('');
    setIsOpen(false);
  }, [entitiesById, onSelectContact]);

  const handleOpenGlobalSearch = useCallback(() => {
    if (!onOpenGlobalSearch) return;
    onOpenGlobalSearch();
    setQuery('');
    setIsOpen(false);
  }, [onOpenGlobalSearch]);

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    includeArchived,
    setIncludeArchived,
    filteredRecents,
    panelState: {
      showRecents,
      showList,
      status
    },
    limitedEntities,
    limitedContacts,
    entityHeading,
    handleSelectEntity,
    handleSelectContact,
    handleOpenGlobalSearch
  };
};
