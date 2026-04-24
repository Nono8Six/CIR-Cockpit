import { useMemo } from 'react';

import { InteractionDraftPayload } from '@/services/interactions/interactionDraftPayload';
import { Channel } from '@/types';
import { QUICK_SERVICE_COUNT, type UseCockpitDerivedStateParams } from './useCockpitDerivedState.types';

export const useCockpitDerivedState = ({
  channel,
  entityType,
  contactService,
  interactionType,
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
  orderRef,
  reminderAt,
  notes,
  entityId,
  contactId,
  config,
  knownCompanies,
  selectedEntity,
  isClientRelation
}: UseCockpitDerivedStateParams) => {
  const draftPayload = useMemo<InteractionDraftPayload>(() => ({
    values: {
      channel,
      entity_type: entityType,
      contact_service: contactService,
      interaction_type: interactionType,
      company_name: companyName,
      company_city: companyCity,
      contact_first_name: contactFirstName,
      contact_last_name: contactLastName,
      contact_position: contactPosition,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      subject,
      mega_families: megaFamilies,
      status_id: statusId,
      order_ref: orderRef,
      reminder_at: reminderAt,
      notes,
      entity_id: entityId,
      contact_id: contactId
    }
  }), [channel, companyCity, companyName, contactEmail, contactFirstName, contactId, contactLastName, contactName, contactPhone, contactPosition, contactService, entityId, entityType, interactionType, megaFamilies, notes, orderRef, reminderAt, statusId, subject]);

  const hasDraftContent = useMemo(() => {
    if (selectedEntity || entityId || contactId) return true;
    return Boolean(channel !== Channel.PHONE || entityType.trim() || companyName.trim() || companyCity.trim() || contactFirstName.trim() || contactLastName.trim() || contactPosition.trim() || contactName.trim() || contactPhone.trim() || contactEmail.trim() || subject.trim() || notes.trim() || orderRef.trim() || reminderAt.trim() || megaFamilies.length > 0);
  }, [channel, companyCity, companyName, contactEmail, contactFirstName, contactId, contactLastName, contactName, contactPhone, contactPosition, entityId, entityType, megaFamilies.length, notes, orderRef, reminderAt, selectedEntity, subject]);

  const companySuggestions = useMemo(() => {
    if (isClientRelation || selectedEntity || !companyName || companyName.length < 2) return [];
    const lower = companyName.toLowerCase();
    return knownCompanies.filter(company => company.toLowerCase().includes(lower));
  }, [companyName, isClientRelation, knownCompanies, selectedEntity]);

  const quickServices = useMemo(() => {
    const services = config.services;
    if (services.length <= QUICK_SERVICE_COUNT) return services;
    const base = services.slice(0, QUICK_SERVICE_COUNT);
    if (contactService && !base.includes(contactService) && services.includes(contactService)) {
      return [...base.slice(0, QUICK_SERVICE_COUNT - 1), contactService];
    }
    return base;
  }, [config.services, contactService]);

  const remainingServices = useMemo(() => config.services.filter(service => !quickServices.includes(service)), [config.services, quickServices]);

  return { draftPayload, hasDraftContent, companySuggestions, quickServices, remainingServices };
};
