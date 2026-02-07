import { useEffect } from 'react';

import { INTERNAL_COMPANY_NAME } from '@/constants/relations';
import type { InteractionFormEffectsParams } from './useInteractionFormEffects.types';

export const useInteractionFormEffects = ({ register, setValue, clearErrors, config, relationOptions, defaultStatusId, entityType, statusId, contactService, interactionType, normalizedRelation, selectedEntity, setSelectedEntity, setSelectedContact, entityId, contactFirstName, contactLastName, contactName, isInternalRelation, isSolicitationRelation, onCloseContactDialog }: InteractionFormEffectsParams) => {
  useEffect(() => {
    register('channel'); register('entity_type'); register('contact_service'); register('interaction_type'); register('mega_families'); register('entity_id'); register('contact_id'); register('contact_email'); register('contact_name'); register('contact_first_name'); register('contact_last_name'); register('contact_position'); register('company_city');
  }, [register]);
  useEffect(() => {
    if (relationOptions.length > 0 && !entityType) setValue('entity_type', relationOptions[0], { shouldValidate: true });
    if (config.statuses.length > 0 && !statusId) setValue('status_id', defaultStatusId, { shouldValidate: true });
    if (config.services.length > 0 && !contactService) setValue('contact_service', config.services[0], { shouldValidate: true });
    if (config.interactionTypes.length > 0 && !interactionType) setValue('interaction_type', config.interactionTypes[0], { shouldValidate: true });
  }, [config.interactionTypes, config.services, config.statuses, contactService, defaultStatusId, entityType, interactionType, relationOptions, setValue, statusId]);
  useEffect(() => {
    if (!selectedEntity) { if (!entityId) return; setValue('entity_id', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_id', '', { shouldValidate: true, shouldDirty: true }); setSelectedContact(null); return; }
    if (!normalizedRelation) return;
    if (selectedEntity.entity_type.trim().toLowerCase() !== normalizedRelation) { setSelectedEntity(null); setSelectedContact(null); setValue('entity_id', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_id', '', { shouldValidate: true, shouldDirty: true }); clearErrors('entity_id'); }
  }, [clearErrors, entityId, normalizedRelation, selectedEntity, setSelectedContact, setSelectedEntity, setValue]);
  useEffect(() => { if (!selectedEntity) onCloseContactDialog(); }, [onCloseContactDialog, selectedEntity]);
  useEffect(() => { const label = `${contactFirstName} ${contactLastName}`.trim(); if (label !== contactName) setValue('contact_name', label, { shouldDirty: true, shouldValidate: true }); }, [contactFirstName, contactLastName, contactName, setValue]);
  useEffect(() => {
    if (!isInternalRelation) return;
    setSelectedEntity(null); setSelectedContact(null); setValue('entity_id', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_id', '', { shouldValidate: true, shouldDirty: true }); setValue('company_name', INTERNAL_COMPANY_NAME, { shouldValidate: true, shouldDirty: true }); setValue('company_city', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_first_name', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_last_name', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_position', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_phone', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_email', '', { shouldValidate: true, shouldDirty: true });
    clearErrors(['entity_id', 'contact_id', 'company_name', 'company_city', 'contact_first_name', 'contact_last_name', 'contact_position', 'contact_phone', 'contact_email']);
  }, [clearErrors, isInternalRelation, setSelectedContact, setSelectedEntity, setValue]);
  useEffect(() => {
    if (!isSolicitationRelation) return;
    setSelectedEntity(null); setSelectedContact(null); setValue('entity_id', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_id', '', { shouldValidate: true, shouldDirty: true }); setValue('company_city', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_first_name', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_last_name', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_position', '', { shouldValidate: true, shouldDirty: true }); setValue('contact_email', '', { shouldValidate: true, shouldDirty: true });
    clearErrors(['entity_id', 'contact_id', 'company_city', 'contact_first_name', 'contact_last_name', 'contact_position', 'contact_email']);
  }, [clearErrors, isSolicitationRelation, setSelectedContact, setSelectedEntity, setValue]);
};
