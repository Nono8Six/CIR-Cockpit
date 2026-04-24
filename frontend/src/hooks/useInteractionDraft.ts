import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormReset } from 'react-hook-form';

import type { AgencyConfig } from '@/services/config';
import { isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { normalizeError } from '@/services/errors/normalizeError';
import { reportError } from '@/services/errors/reportError';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import { deleteInteractionDraft } from '@/services/interactions/deleteInteractionDraft';
import { getInteractionDraft } from '@/services/interactions/getInteractionDraft';
import type { InteractionDraftPayload } from '@/services/interactions/interactionDraftPayload';
import { saveInteractionDraft } from '@/services/interactions/saveInteractionDraft';
import type { Entity, EntityContact } from '@/types';

import {
  buildInteractionDraftResetValues,
  normalizeInteractionDraftValues,
} from './interaction-draft/normalizeInteractionDraftValues';

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

type DraftContext = {
  activeAgencyId: string | null;
  userId: string | null;
  defaultValues: InteractionFormValues;
  relationOptions: string[];
  config: AgencyConfig;
  defaultStatusId: string;
  reset: UseFormReset<InteractionFormValues>;
  setSelectedEntity: (entity: Entity | null) => void;
  setSelectedContact: (contact: EntityContact | null) => void;
  entities: Entity[];
  contacts: EntityContact[];
  entitySearchLoading: boolean;
  contactsLoading: boolean;
  entityId: string;
  contactId: string;
  selectedEntity: Entity | null;
  selectedContact: EntityContact | null;
  draftPayload: InteractionDraftPayload;
  hasDraftContent: boolean;
};

export const useInteractionDraft = ({
  activeAgencyId,
  userId,
  defaultValues,
  relationOptions,
  config,
  defaultStatusId,
  reset,
  setSelectedEntity,
  setSelectedContact,
  entities,
  contacts,
  entitySearchLoading,
  contactsLoading,
  entityId,
  contactId,
  selectedEntity,
  selectedContact,
  draftPayload,
  hasDraftContent,
}: DraftContext) => {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pendingDraftEntityId, setPendingDraftEntityId] = useState<string | null>(null);
  const [pendingDraftContactId, setPendingDraftContactId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const draftReadyRef = useRef(false);
  const draftApplyRef = useRef(false);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftNotifiedRef = useRef(false);
  const lastDraftRef = useRef<string | null>(null);

  const handleDraftError = useCallback(
    (error: unknown, fallbackMessage: string, context?: Record<string, unknown>) => {
      if (!draftNotifiedRef.current) {
        handleUiError(error, fallbackMessage, context);
        draftNotifiedRef.current = true;
        return;
      }

      reportError(normalizeError(error, fallbackMessage), context);
    },
    [],
  );

  const buildResetValues = useCallback(
    () => buildInteractionDraftResetValues({ defaultValues, relationOptions, config, defaultStatusId }),
    [config, defaultStatusId, defaultValues, relationOptions],
  );

  const applyDraft = useCallback(
    (payload: InteractionDraftPayload): InteractionDraftPayload => {
      const values = normalizeInteractionDraftValues(payload?.values ?? {}, {
        defaultValues,
        relationOptions,
        config,
        defaultStatusId,
      });
      draftApplyRef.current = true;
      setSelectedEntity(null);
      setSelectedContact(null);
      setPendingDraftEntityId(values.entity_id || null);
      setPendingDraftContactId(values.contact_id || null);
      reset(values);
      requestAnimationFrame(() => {
        draftApplyRef.current = false;
      });
      return { values };
    },
    [
      config,
      defaultStatusId,
      defaultValues,
      relationOptions,
      reset,
      setSelectedContact,
      setSelectedEntity,
    ],
  );

  const clearDraft = useCallback(
    async (source: 'submit' | 'reset' | 'empty') => {
      if (!activeAgencyId || !userId || !draftId) {
        setDraftId(null);
        lastDraftRef.current = null;
        return;
      }

      try {
        await deleteInteractionDraft({ userId, agencyId: activeAgencyId });
        setDraftId(null);
        lastDraftRef.current = null;
        setDraftStatus('idle');
        setLastSavedAt(null);
      } catch (error) {
        handleDraftError(error, 'Impossible de supprimer le brouillon.', {
          source: 'CockpitForm.clearDraft',
          action: source,
        });
      }
    },
    [activeAgencyId, draftId, handleDraftError, userId],
  );

  const handleReset = useCallback(() => {
    reset(buildResetValues());
    setSelectedEntity(null);
    setSelectedContact(null);
    void clearDraft('reset');
  }, [buildResetValues, clearDraft, reset, setSelectedContact, setSelectedEntity]);

  useEffect(() => {
    if (!activeAgencyId || !userId) {
      draftReadyRef.current = false;
      setDraftId(null);
      lastDraftRef.current = null;
      return;
    }

    let mounted = true;
    draftReadyRef.current = false;

    (async () => {
      try {
        const draft = await getInteractionDraft({ userId, agencyId: activeAgencyId });
        if (!mounted) return;

        if (draft) {
          setDraftId(draft.id);
          lastDraftRef.current = JSON.stringify(applyDraft(draft.payload));
        } else {
          setDraftId(null);
          lastDraftRef.current = null;
        }
      } catch (error) {
        if (isAppError(error) && error.code === 'DRAFT_NOT_FOUND') {
          setDraftId(null);
          lastDraftRef.current = null;

          try {
            await deleteInteractionDraft({ userId, agencyId: activeAgencyId });
          } catch (deleteError) {
            reportError(normalizeError(deleteError, 'Impossible de nettoyer le brouillon.'), {
              source: 'CockpitForm.deleteInvalidDraft',
            });
          }

          return;
        }

        handleDraftError(error, 'Impossible de restaurer le brouillon.', {
          source: 'CockpitForm.getDraft',
        });
      } finally {
        if (mounted) draftReadyRef.current = true;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeAgencyId, applyDraft, handleDraftError, userId]);

  useEffect(() => {
    if (!pendingDraftEntityId || entities.length === 0) return;
    const match = entities.find((entity) => entity.id === pendingDraftEntityId);
    if (match) {
      setSelectedEntity(match);
      setPendingDraftEntityId(null);
    } else if (!entitySearchLoading) {
      setPendingDraftEntityId(null);
    }
  }, [entities, entitySearchLoading, pendingDraftEntityId, setSelectedEntity]);

  useEffect(() => {
    if (!pendingDraftContactId || contacts.length === 0) return;
    const match = contacts.find((contact) => contact.id === pendingDraftContactId);
    if (match) {
      setSelectedContact(match);
      setPendingDraftContactId(null);
    } else if (!contactsLoading) {
      setPendingDraftContactId(null);
    }
  }, [contacts, contactsLoading, pendingDraftContactId, setSelectedContact]);

  useEffect(() => {
    if (!entityId) {
      if (selectedEntity) setSelectedEntity(null);
      return;
    }

    if (selectedEntity?.id === entityId) return;
    const match = entities.find((entity) => entity.id === entityId);

    if (match) {
      setSelectedEntity(match);
    } else if (!entitySearchLoading) {
      setSelectedEntity(null);
    }
  }, [entities, entityId, entitySearchLoading, selectedEntity, setSelectedEntity]);

  useEffect(() => {
    if (!contactId) {
      if (selectedContact) setSelectedContact(null);
      return;
    }

    if (selectedContact?.id === contactId) return;
    const match = contacts.find((contact) => contact.id === contactId);

    if (match) {
      setSelectedContact(match);
    } else if (!contactsLoading) {
      setSelectedContact(null);
    }
  }, [contactId, contacts, contactsLoading, selectedContact, setSelectedContact]);

  useEffect(() => {
    if (!activeAgencyId || !userId || !draftReadyRef.current || draftApplyRef.current) return;

    if (!hasDraftContent) {
      if (draftId) void clearDraft('empty');
      lastDraftRef.current = null;
      setDraftStatus('idle');
      setLastSavedAt(null);
      return;
    }

    const serialized = JSON.stringify(draftPayload);
    if (serialized === lastDraftRef.current) return;
    lastDraftRef.current = serialized;
    setDraftStatus('saving');

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = setTimeout(() => {
      void Promise.resolve().then(async () => {
        try {
          const saved = await saveInteractionDraft({
            userId,
            agencyId: activeAgencyId,
            payload: draftPayload,
          });
          startTransition(() => {
            setDraftId((previous) => (previous === saved.id ? previous : saved.id));
            setDraftStatus('saved');
            setLastSavedAt(new Date());
          });
        } catch (error) {
          setDraftStatus('error');
          handleDraftError(error, 'Sauvegarde automatique indisponible.', {
            source: 'CockpitForm.saveDraft',
          });
        }
      });
    }, 800);
  }, [activeAgencyId, clearDraft, draftId, draftPayload, handleDraftError, hasDraftContent, userId]);

  useEffect(
    () => () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    },
    [],
  );

  return { handleReset, draftStatus, lastSavedAt };
};
