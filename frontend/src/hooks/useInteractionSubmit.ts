import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { UseFormSetError } from 'react-hook-form';

import type { AgencyConfig } from '@/services/config';
import type { Entity, EntityContact, InteractionDraft, TimelineEvent } from '@/types';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
import { generateId } from '@/services/interactions/generateId';
import { getNowIsoString } from '@/utils/date/getNowIsoString';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { saveEntity } from '@/services/entities/saveEntity';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import { clientContactsKey, entitySearchIndexKey } from '@/services/query/queryKeys';
import { INTERNAL_COMPANY_NAME, isInternalRelationValue, isProspectRelationValue, isSolicitationRelationValue } from '@/constants/relations';

type UseInteractionSubmitParams = { activeAgencyId: string | null; config: AgencyConfig; selectedEntity: Entity | null; selectedContact: EntityContact | null; onSave: (interaction: InteractionDraft) => Promise<boolean>; handleSelectEntity: (entity: Entity | null) => void; handleSelectContact: (contact: EntityContact | null) => void; queryClient: QueryClient; setError: UseFormSetError<InteractionFormValues>; handleReset: () => void; setKnownCompanies: React.Dispatch<React.SetStateAction<string[]>> };

export const useInteractionSubmit = ({ activeAgencyId, config, selectedEntity, selectedContact, onSave, handleSelectEntity, handleSelectContact, queryClient, setError, handleReset, setKnownCompanies }: UseInteractionSubmitParams) => {
  const onSubmit = useCallback(async (values: InteractionFormValues) => {
    const relation = values.entity_type.trim().toLowerCase(); const isSupplier = relation === 'fournisseur'; const isProspect = isProspectRelationValue(values.entity_type); const isInternal = isInternalRelationValue(values.entity_type); const isSolicitation = isSolicitationRelationValue(values.entity_type);
    const requireField = (condition: boolean, field: keyof InteractionFormValues, message: string) => { if (!condition) return false; setError(field, { type: 'manual', message }); return true; };

    if (relation === 'client') { if (requireField(!selectedEntity, 'entity_id', 'Client requis.') || requireField(!selectedContact, 'contact_id', 'Contact requis.')) return; }
    else if (isInternal) { if (requireField(!values.contact_first_name?.trim(), 'contact_first_name', 'Prenom requis.') || requireField(!values.contact_last_name?.trim(), 'contact_last_name', 'Nom requis.')) return; }
    else if (isSolicitation) { if (requireField(!values.company_name?.trim(), 'company_name', 'Societe requise.') || requireField(!values.contact_phone?.trim(), 'contact_phone', 'Numero requis.')) return; }
    else {
      if (requireField(!values.company_name?.trim(), 'company_name', 'Societe requise.') || requireField(isProspect && !values.company_city?.trim(), 'company_city', 'Ville requise.') || requireField(!values.contact_first_name?.trim(), 'contact_first_name', 'Prenom requis.') || requireField(!values.contact_last_name?.trim(), 'contact_last_name', 'Nom requis.') || requireField(isSupplier && !values.contact_position?.trim(), 'contact_position', 'Fonction requise.') || requireField(!values.contact_phone?.trim() && !values.contact_email?.trim(), 'contact_phone', 'Telephone ou email requis.')) return;
    }

    let resolvedEntity = selectedEntity; let resolvedContact = selectedContact;
    if (relation !== 'client' && !isInternal && !isSolicitation) {
      if (!resolvedEntity) {
        resolvedEntity = await saveEntity({ entity_type: values.entity_type, name: values.company_name ?? '', agency_id: activeAgencyId, city: isProspect ? values.company_city?.trim() || null : null }).match(entity => entity, error => { handleUiError(error, "Impossible de creer l'entite.", { source: 'CockpitForm.saveEntity' }); return null; });
        if (!resolvedEntity) return;
        void queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(activeAgencyId, false) }); void queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(activeAgencyId, true) }); handleSelectEntity(resolvedEntity);
      }
      if (!resolvedContact) {
        if (!resolvedEntity?.id) {
          handleUiError(createAppError({ code: 'NOT_FOUND', message: "Entite introuvable pour creer le contact.", source: 'validation' }), "Impossible de creer le contact.", { source: 'CockpitForm.saveEntityContact' });
          return;
        }
        resolvedContact = await saveEntityContact({ entity_id: resolvedEntity.id, first_name: values.contact_first_name?.trim() ?? '', last_name: values.contact_last_name?.trim() ?? '', email: values.contact_email?.trim() || null, phone: values.contact_phone?.trim() || null, position: values.contact_position?.trim() || null }).match(contact => contact, error => { handleUiError(error, "Impossible d'enregistrer le contact.", { source: 'CockpitForm.saveEntityContact' }); return null; });
        if (!resolvedContact) return;
        void queryClient.invalidateQueries({ queryKey: clientContactsKey(resolvedEntity.id, false) }); void queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(activeAgencyId, false) }); handleSelectContact(resolvedContact);
      }
    }

    const creationDate = getNowIsoString(); const timeline: TimelineEvent[] = [{ id: generateId(), date: creationDate, type: 'creation', content: 'Dossier cree' }]; if (values.notes?.trim()) timeline.push({ id: generateId(), date: creationDate, type: 'note', content: values.notes.trim() });
    const statusLabel = config.statuses.find(item => item.id === values.status_id)?.label ?? config.statuses.find(item => item.label === values.status_id)?.label ?? '';
    const selectedContactLabel = resolvedContact ? `${resolvedContact.first_name ?? ''} ${resolvedContact.last_name}`.trim() : '';
    const resolvedContactName = resolvedContact ? selectedContactLabel : isSolicitation ? (values.company_name ?? '').trim() : `${values.contact_first_name ?? ''} ${values.contact_last_name ?? ''}`.trim();
    const resolvedCompanyName = isInternal ? INTERNAL_COMPANY_NAME : resolvedEntity?.name ?? values.company_name ?? '';

    const newInteraction: InteractionDraft = { id: generateId(), created_at: creationDate, channel: values.channel, entity_type: values.entity_type, contact_service: values.contact_service, interaction_type: values.interaction_type, company_name: resolvedCompanyName, contact_name: resolvedContactName, contact_phone: (resolvedContact?.phone ?? values.contact_phone ?? '').trim() || undefined, contact_email: (resolvedContact?.email ?? values.contact_email ?? '').trim() || undefined, mega_families: values.mega_families ?? [], subject: values.subject, order_ref: values.order_ref ?? '', status_id: values.status_id, status: statusLabel, reminder_at: values.reminder_at || undefined, notes: values.notes ?? '', timeline, entity_id: resolvedEntity?.id, contact_id: resolvedContact?.id, agency_id: resolvedEntity?.agency_id ?? activeAgencyId ?? undefined };
    if (!await onSave(newInteraction)) return;
    if (resolvedCompanyName && !isInternal && !isSolicitation) setKnownCompanies(previous => previous.includes(resolvedCompanyName) ? previous : [...previous, resolvedCompanyName].sort());
    handleReset();
  }, [activeAgencyId, config.statuses, handleReset, handleSelectContact, handleSelectEntity, onSave, queryClient, selectedContact, selectedEntity, setError, setKnownCompanies]);

  return { onSubmit };
};
