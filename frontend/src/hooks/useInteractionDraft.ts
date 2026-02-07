import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormReset } from 'react-hook-form';

import type { AgencyConfig } from '@/services/config';
import type { Entity, EntityContact } from '@/types';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
import type { InteractionDraftPayload } from '@/services/interactions/interactionDraftPayload';
import { deleteInteractionDraft } from '@/services/interactions/deleteInteractionDraft';
import { getInteractionDraft } from '@/services/interactions/getInteractionDraft';
import { saveInteractionDraft } from '@/services/interactions/saveInteractionDraft';
import { handleUiError } from '@/services/errors/handleUiError';
import { normalizeError } from '@/services/errors/normalizeError';
import { reportError } from '@/services/errors/reportError';
import { INTERNAL_COMPANY_NAME, isInternalRelationValue } from '@/constants/relations';

type DraftContext = { activeAgencyId: string | null; userId: string | null; defaultValues: InteractionFormValues; relationOptions: string[]; config: AgencyConfig; defaultStatusId: string; reset: UseFormReset<InteractionFormValues>; setSelectedEntity: (entity: Entity | null) => void; setSelectedContact: (contact: EntityContact | null) => void; entities: Entity[]; contacts: EntityContact[]; entitySearchLoading: boolean; contactsLoading: boolean; entityId: string; contactId: string; selectedEntity: Entity | null; selectedContact: EntityContact | null; draftPayload: InteractionDraftPayload; hasDraftContent: boolean };

export const useInteractionDraft = ({ activeAgencyId, userId, defaultValues, relationOptions, config, defaultStatusId, reset, setSelectedEntity, setSelectedContact, entities, contacts, entitySearchLoading, contactsLoading, entityId, contactId, selectedEntity, selectedContact, draftPayload, hasDraftContent }: DraftContext) => {
  const [draftId, setDraftId] = useState<string | null>(null); const [pendingDraftEntityId, setPendingDraftEntityId] = useState<string | null>(null); const [pendingDraftContactId, setPendingDraftContactId] = useState<string | null>(null);
  const draftReadyRef = useRef(false); const draftApplyRef = useRef(false); const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); const draftNotifiedRef = useRef(false); const lastDraftRef = useRef<string | null>(null);

  const handleDraftError = useCallback((error: unknown, fallbackMessage: string, context?: Record<string, unknown>) => { if (!draftNotifiedRef.current) { handleUiError(error, fallbackMessage, context); draftNotifiedRef.current = true; return; } reportError(normalizeError(error, fallbackMessage), context); }, []);
  const buildResetValues = useCallback(() => ({ ...defaultValues, entity_type: relationOptions[0] ?? '', contact_service: config.services[0] ?? '', interaction_type: config.interactionTypes[0] ?? '', status_id: defaultStatusId }), [config.interactionTypes, config.services, defaultStatusId, defaultValues, relationOptions]);

  const normalizeDraftValues = useCallback((values: Partial<InteractionFormValues>): InteractionFormValues => {
    const defaults = buildResetValues(); const normalized: InteractionFormValues = { ...defaults, ...values, company_name: values.company_name ?? '', company_city: values.company_city ?? '', contact_first_name: values.contact_first_name ?? '', contact_last_name: values.contact_last_name ?? '', contact_position: values.contact_position ?? '', contact_name: values.contact_name ?? '', contact_phone: values.contact_phone ?? '', contact_email: values.contact_email ?? '', interaction_type: values.interaction_type ?? defaults.interaction_type ?? '', subject: values.subject ?? '', order_ref: values.order_ref ?? '', reminder_at: values.reminder_at ?? '', notes: values.notes ?? '', mega_families: values.mega_families ?? defaults.mega_families ?? [], entity_id: values.entity_id ?? '', contact_id: values.contact_id ?? '' };
    if (!normalized.entity_id) normalized.contact_id = '';
    if (isInternalRelationValue(normalized.entity_type)) { normalized.company_name = INTERNAL_COMPANY_NAME; normalized.company_city = ''; normalized.entity_id = ''; normalized.contact_id = ''; }
    if (!config.statuses.find(item => item.id === normalized.status_id || item.label === normalized.status_id)) normalized.status_id = defaults.status_id;
    if (relationOptions.length > 0 && !relationOptions.includes(normalized.entity_type)) normalized.entity_type = defaults.entity_type;
    if (config.services.length > 0 && !config.services.includes(normalized.contact_service)) normalized.contact_service = defaults.contact_service;
    if (config.families.length > 0) normalized.mega_families = (normalized.mega_families ?? []).filter(family => config.families.includes(family));
    if (config.interactionTypes.length > 0 && !config.interactionTypes.includes(normalized.interaction_type)) normalized.interaction_type = defaults.interaction_type;
    return normalized;
  }, [buildResetValues, config.families, config.interactionTypes, config.services, config.statuses, relationOptions]);

  const applyDraft = useCallback((payload: InteractionDraftPayload): InteractionDraftPayload => { const values = normalizeDraftValues(payload?.values ?? {}); draftApplyRef.current = true; setSelectedEntity(null); setSelectedContact(null); setPendingDraftEntityId(values.entity_id || null); setPendingDraftContactId(values.contact_id || null); reset(values); requestAnimationFrame(() => { draftApplyRef.current = false; }); return { values }; }, [normalizeDraftValues, reset, setSelectedContact, setSelectedEntity]);
  const clearDraft = useCallback(async (source: 'submit' | 'reset' | 'empty') => { if (!activeAgencyId || !userId || !draftId) { setDraftId(null); lastDraftRef.current = null; return; } try { await deleteInteractionDraft({ userId, agencyId: activeAgencyId }); setDraftId(null); lastDraftRef.current = null; } catch (error) { handleDraftError(error, 'Impossible de supprimer le brouillon.', { source: 'CockpitForm.clearDraft', action: source }); } }, [activeAgencyId, draftId, handleDraftError, userId]);
  const handleReset = useCallback(() => { reset(buildResetValues()); setSelectedEntity(null); setSelectedContact(null); void clearDraft('reset'); }, [buildResetValues, clearDraft, reset, setSelectedContact, setSelectedEntity]);

  useEffect(() => { if (!activeAgencyId || !userId) { draftReadyRef.current = false; setDraftId(null); lastDraftRef.current = null; return; } let mounted = true; draftReadyRef.current = false; (async () => { try { const draft = await getInteractionDraft({ userId, agencyId: activeAgencyId }); if (!mounted) return; if (draft) { setDraftId(draft.id); lastDraftRef.current = JSON.stringify(applyDraft(draft.payload)); } else { setDraftId(null); lastDraftRef.current = null; } } catch (error) { handleDraftError(error, 'Impossible de restaurer le brouillon.', { source: 'CockpitForm.getDraft' }); } finally { if (mounted) draftReadyRef.current = true; } })(); return () => { mounted = false; }; }, [activeAgencyId, applyDraft, handleDraftError, userId]);
  useEffect(() => { if (!pendingDraftEntityId || entities.length === 0) return; const match = entities.find(entity => entity.id === pendingDraftEntityId); if (match) { setSelectedEntity(match); setPendingDraftEntityId(null); } else if (!entitySearchLoading) setPendingDraftEntityId(null); }, [entities, entitySearchLoading, pendingDraftEntityId, setSelectedEntity]);
  useEffect(() => { if (!pendingDraftContactId || contacts.length === 0) return; const match = contacts.find(contact => contact.id === pendingDraftContactId); if (match) { setSelectedContact(match); setPendingDraftContactId(null); } else if (!contactsLoading) setPendingDraftContactId(null); }, [contacts, contactsLoading, pendingDraftContactId, setSelectedContact]);
  useEffect(() => { if (!entityId) { if (selectedEntity) setSelectedEntity(null); return; } if (selectedEntity?.id === entityId) return; const match = entities.find(entity => entity.id === entityId); if (match) setSelectedEntity(match); else if (!entitySearchLoading) setSelectedEntity(null); }, [entities, entityId, entitySearchLoading, selectedEntity, setSelectedEntity]);
  useEffect(() => { if (!contactId) { if (selectedContact) setSelectedContact(null); return; } if (selectedContact?.id === contactId) return; const match = contacts.find(contact => contact.id === contactId); if (match) setSelectedContact(match); else if (!contactsLoading) setSelectedContact(null); }, [contactId, contacts, contactsLoading, selectedContact, setSelectedContact]);

  useEffect(() => {
    if (!activeAgencyId || !userId || !draftReadyRef.current || draftApplyRef.current) return;
    if (!hasDraftContent) { if (draftId) void clearDraft('empty'); lastDraftRef.current = null; return; }
    const serialized = JSON.stringify(draftPayload); if (serialized === lastDraftRef.current) return; lastDraftRef.current = serialized;
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(() => {
      void Promise.resolve().then(async () => {
        try {
          const saved = await saveInteractionDraft({ userId, agencyId: activeAgencyId, payload: draftPayload });
          startTransition(() => setDraftId(previous => (previous === saved.id ? previous : saved.id)));
        } catch (error) {
          handleDraftError(error, 'Sauvegarde automatique indisponible.', { source: 'CockpitForm.saveDraft' });
        }
      });
    }, 800);
  }, [activeAgencyId, clearDraft, draftId, draftPayload, handleDraftError, hasDraftContent, userId]);

  useEffect(() => () => { if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current); }, []);
  return { handleReset };
};
