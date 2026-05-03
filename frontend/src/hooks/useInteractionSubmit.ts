import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import type { Entity, EntityContact, InteractionDraft, TimelineEvent } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import { generateId } from '@/services/interactions/generateId';
import { getNowIsoString } from '@/utils/date/getNowIsoString';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { saveEntity } from '@/services/entities/saveEntity';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import {
  invalidateClientContactsQuery,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import {
  INTERNAL_COMPANY_NAME,
  isClientRelationValue,
  isIndividualRelationValue,
  isInternalRelationValue,
  isProspectRelationValue,
  isSolicitationRelationValue
} from '@/constants/relations';

type UseInteractionSubmitParams = { activeAgencyId: string | null; selectedEntity: Entity | null; selectedContact: EntityContact | null; onSave: (interaction: InteractionDraft) => Promise<boolean>; handleSelectEntity: (entity: Entity | null) => void; handleSelectContact: (contact: EntityContact | null) => void; queryClient: QueryClient; handleReset: () => void; onSaveSuccess: (interaction: InteractionDraft) => void; setKnownCompanies: React.Dispatch<React.SetStateAction<string[]>> };

export const useInteractionSubmit = ({ activeAgencyId, selectedEntity, selectedContact, onSave, handleSelectEntity, handleSelectContact, queryClient, handleReset, onSaveSuccess, setKnownCompanies }: UseInteractionSubmitParams) => {
  const onSubmit = useCallback(async (values: InteractionFormValues) => {
    const isProspect = isProspectRelationValue(values.entity_type);
    const isClient = isClientRelationValue(values.entity_type);
    const isIndividual = isIndividualRelationValue(values.entity_type);
    const isInternal = isInternalRelationValue(values.entity_type);
    const isSolicitation = isSolicitationRelationValue(values.entity_type);

    let resolvedEntity = selectedEntity; let resolvedContact = selectedContact;
    if (!isClient && !isInternal && !isSolicitation) {
      if (!resolvedEntity) {
        const entityName = isIndividual
          ? `${values.contact_first_name ?? ''} ${values.contact_last_name ?? ''}`.trim()
          : values.company_name ?? '';
        resolvedEntity = await saveEntity({ entity_type: values.entity_type, name: entityName, agency_id: activeAgencyId, city: isProspect ? values.company_city?.trim() || null : null }).match(entity => entity, error => { handleUiError(error, "Impossible de creer l'entite.", { source: 'CockpitForm.saveEntity' }); return null; });
        if (!resolvedEntity) return;
        void invalidateEntitySearchIndexQueries(queryClient, activeAgencyId); handleSelectEntity(resolvedEntity);
      }
      if (!resolvedContact) {
        if (!resolvedEntity?.id) {
          handleUiError(createAppError({ code: 'NOT_FOUND', message: "Entite introuvable pour creer le contact.", source: 'validation' }), "Impossible de creer le contact.", { source: 'CockpitForm.saveEntityContact' });
          return;
        }
        resolvedContact = await saveEntityContact({ entity_id: resolvedEntity.id, first_name: values.contact_first_name?.trim() ?? '', last_name: values.contact_last_name?.trim() ?? '', email: values.contact_email?.trim() || null, phone: values.contact_phone?.trim() || null, position: values.contact_position?.trim() || null }).match(contact => contact, error => { handleUiError(error, "Impossible d'enregistrer le contact.", { source: 'CockpitForm.saveEntityContact' }); return null; });
        if (!resolvedContact) return;
        void invalidateClientContactsQuery(queryClient, resolvedEntity.id, false); void invalidateEntitySearchIndexQueries(queryClient, activeAgencyId); handleSelectContact(resolvedContact);
      }
    }

    const creationDate = getNowIsoString(); const timeline: TimelineEvent[] = [{ id: generateId(), date: creationDate, type: 'creation', content: 'Dossier cree' }]; if (values.notes?.trim()) timeline.push({ id: generateId(), date: creationDate, type: 'note', content: values.notes.trim() });
    const selectedContactLabel = resolvedContact ? `${resolvedContact.first_name ?? ''} ${resolvedContact.last_name}`.trim() : '';
    const resolvedContactName = resolvedContact ? selectedContactLabel : isSolicitation ? (values.company_name ?? '').trim() : `${values.contact_first_name ?? ''} ${values.contact_last_name ?? ''}`.trim();
    const resolvedCompanyName = isInternal ? INTERNAL_COMPANY_NAME : resolvedEntity?.name ?? values.company_name ?? '';

    const newInteraction: InteractionDraft = { id: generateId(), channel: values.channel, entity_type: values.entity_type, contact_service: values.contact_service, interaction_type: values.interaction_type, company_name: resolvedCompanyName, contact_first_name: (resolvedContact?.first_name ?? values.contact_first_name ?? '').trim(), contact_last_name: (resolvedContact?.last_name ?? values.contact_last_name ?? '').trim(), contact_position: (resolvedContact?.position ?? values.contact_position ?? '').trim(), contact_name: resolvedContactName, contact_phone: (resolvedContact?.phone ?? values.contact_phone ?? '').trim() || undefined, contact_email: (resolvedContact?.email ?? values.contact_email ?? '').trim() || undefined, mega_families: values.mega_families ?? [], subject: values.subject, order_ref: values.order_ref ?? '', status_id: values.status_id, reminder_at: values.reminder_at || undefined, notes: values.notes ?? '', timeline, entity_id: resolvedEntity?.id, contact_id: resolvedContact?.id, agency_id: resolvedEntity?.agency_id ?? activeAgencyId ?? undefined };
    if (!await onSave(newInteraction)) return;
    if (resolvedCompanyName && !isInternal && !isSolicitation) setKnownCompanies(previous => previous.includes(resolvedCompanyName) ? previous : [...previous, resolvedCompanyName].sort());
    onSaveSuccess(newInteraction);
    handleReset();
  }, [activeAgencyId, handleReset, handleSelectContact, handleSelectEntity, onSave, onSaveSuccess, queryClient, selectedContact, selectedEntity, setKnownCompanies]);

  return { onSubmit };
};
