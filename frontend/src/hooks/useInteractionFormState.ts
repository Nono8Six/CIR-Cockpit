import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';

import { STATUS_CATEGORY_LABELS } from '@/constants/statusCategories';
import { ensureInternalRelation, isInternalRelationValue, isProspectRelationValue, isSolicitationRelationValue } from '@/constants/relations';
import { Channel, type StatusCategory } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { useAgencies } from '@/hooks/useAgencies';
import { useEntityContacts } from '@/hooks/useEntityContacts';
import { getDefaultStatusId, type InteractionFormStateInput } from './useInteractionFormState.types';

export const useInteractionFormState = ({ control, config, activeAgencyId, entitySearchIndex, selectedEntity, selectedContact }: InteractionFormStateInput) => {
  const channel = useWatch({ control, name: 'channel' });
  const entityType = useWatch({ control, name: 'entity_type' }) ?? '';
  const contactService = useWatch({ control, name: 'contact_service' }) ?? '';
  const companyName = useWatch({ control, name: 'company_name' }) ?? '';
  const companyCity = useWatch({ control, name: 'company_city' }) ?? '';
  const contactFirstName = useWatch({ control, name: 'contact_first_name' }) ?? '';
  const contactLastName = useWatch({ control, name: 'contact_last_name' }) ?? '';
  const contactPosition = useWatch({ control, name: 'contact_position' }) ?? '';
  const contactName = useWatch({ control, name: 'contact_name' }) ?? '';
  const contactPhone = useWatch({ control, name: 'contact_phone' }) ?? '';
  const contactEmail = useWatch({ control, name: 'contact_email' }) ?? '';
  const subject = useWatch({ control, name: 'subject' }) ?? '';
  const megaFamilies = useWatch({ control, name: 'mega_families' }) ?? [];
  const statusId = useWatch({ control, name: 'status_id' }) ?? '';
  const interactionType = useWatch({ control, name: 'interaction_type' }) ?? '';
  const orderRef = useWatch({ control, name: 'order_ref' }) ?? '';
  const reminderAt = useWatch({ control, name: 'reminder_at' }) ?? '';
  const notes = useWatch({ control, name: 'notes' }) ?? '';
  const entityId = useWatch({ control, name: 'entity_id' }) ?? '';
  const contactId = useWatch({ control, name: 'contact_id' }) ?? '';

  const relationOptions = useMemo(() => ensureInternalRelation(config.entities), [config.entities]);
  const defaultStatusId = useMemo(() => getDefaultStatusId(config.statuses), [config.statuses]);
  const normalizedRelation = entityType.trim().toLowerCase();
  const isClientRelation = normalizedRelation === 'client';
  const isProspectRelation = isProspectRelationValue(entityType);
  const isSupplierRelation = normalizedRelation === 'fournisseur';
  const isInternalRelation = isInternalRelationValue(entityType);
  const isSolicitationRelation = isSolicitationRelationValue(entityType);

  const statusMeta = useMemo(() => config.statuses.find(item => item.id === statusId) ?? config.statuses.find(item => item.label === statusId), [config.statuses, statusId]);
  const statusCategoryLabel = statusMeta ? STATUS_CATEGORY_LABELS[statusMeta.category] : null;
  const statusGroups = useMemo(() => {
    const groups: Record<StatusCategory, typeof config.statuses> = { todo: [], in_progress: [], done: [] };
    config.statuses.forEach(item => groups[item.category].push(item));
    return groups;
  }, [config.statuses]);

  const contactsQuery = useEntityContacts(selectedEntity?.id ?? null, false, Boolean(selectedEntity?.id));
  const contacts = contactsQuery.data ?? [];
  const agenciesQuery = useAgencies(false, Boolean(activeAgencyId));
  const agencies = agenciesQuery.data ?? [];

  const selectedEntityMeta = useMemo(() => {
    if (!selectedEntity) return '';
    const parts = [selectedEntity.client_number ? formatClientNumber(selectedEntity.client_number) : '', selectedEntity.city ?? ''].filter(Boolean);
    return parts.join(' • ');
  }, [selectedEntity]);

  const selectedContactMeta = useMemo(() => {
    if (!selectedContact) return '';
    const parts = [selectedContact.position ?? '', selectedContact.email ?? selectedContact.phone ?? ''].filter(Boolean);
    return parts.join(' • ');
  }, [selectedContact]);

  return {
    channel: channel ?? Channel.PHONE,
    entityType,
    contactService,
    companyName,
    companyCity,
    contactFirstName,
    contactLastName,
    contactPosition,
    contactName,
    contactPhone,
    contactEmail,
    subject,
    megaFamilies,
    statusId,
    interactionType,
    orderRef,
    reminderAt,
    notes,
    entityId,
    contactId,
    relationOptions,
    defaultStatusId,
    normalizedRelation,
    isClientRelation,
    isProspectRelation,
    isSupplierRelation,
    isInternalRelation,
    isSolicitationRelation,
    statusMeta,
    statusCategoryLabel,
    statusGroups,
    hasStatuses: config.statuses.length > 0,
    statusHelpId: 'status-help',
    hasInteractionTypes: config.interactionTypes.length > 0,
    interactionTypeHelpId: 'interaction-type-help',
    entities: entitySearchIndex.entities ?? [],
    contactsQuery,
    contacts,
    agenciesQuery,
    agencies,
    selectedEntityMeta,
    selectedContactMeta,
    contactSelectValue: selectedContact?.id ?? 'none',
    canConvertToClient: Boolean(selectedEntity && isProspectRelationValue(selectedEntity.entity_type))
  };
};
