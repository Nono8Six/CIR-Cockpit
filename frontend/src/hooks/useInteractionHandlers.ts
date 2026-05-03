import { useCallback, type ChangeEvent } from 'react';

import { buildReminderDateTime } from '@/utils/date/buildReminderDateTime';
import { formatFrenchPhone } from '@/utils/formatFrenchPhone';
import { relationValuesMatch } from '@/constants/relations';
import { handleUiError } from '@/services/errors/handleUiError';
import { invalidateClientsQueries, invalidateEntitySearchIndexQueries } from '@/services/query/queryInvalidation';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import type { EntityContactPayload } from '@/services/entities/saveEntityContact';
import type { Entity, EntityContact, Interaction } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import type { InteractionHandlersInput } from './useInteractionHandlers.types';

type StringField = Exclude<keyof InteractionFormValues, 'mega_families'>;

export const useInteractionHandlers = ({ setValue, clearErrors, normalizedRelation, contacts, megaFamilies, contactFirstName, contactLastName, activeAgencyId, queryClient, setSelectedEntity, setSelectedContact, saveClientMutation, saveProspectMutation, saveContactMutation, onConvertComplete }: InteractionHandlersInput) => {
  const setStringField = useCallback((field: StringField, value: string) => setValue(field, value, { shouldValidate: true, shouldDirty: true }), [setValue]);
  const setFamiliesField = useCallback((value: string[]) => setValue('mega_families', value, { shouldValidate: true, shouldDirty: true }), [setValue]);
  const setContactIdentity = useCallback((firstName: string, lastName: string) => {
    setStringField('contact_first_name', firstName);
    setStringField('contact_last_name', lastName);
    setStringField('contact_name', `${firstName} ${lastName}`.trim());
  }, [setStringField]);

  const resetContactFields = useCallback(() => {
    setStringField('contact_first_name', ''); setStringField('contact_last_name', ''); setStringField('contact_position', ''); setStringField('contact_name', ''); setStringField('contact_phone', ''); setStringField('contact_email', '');
  }, [setStringField]);

  const handlePhoneChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setStringField('contact_phone', formatFrenchPhone(event.target.value)), [setStringField]);
  const handleContactFirstNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setContactIdentity(event.target.value, contactLastName);
  }, [contactLastName, setContactIdentity]);
  const handleContactLastNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setContactIdentity(contactFirstName, event.target.value);
  }, [contactFirstName, setContactIdentity]);

  const handleSelectEntity = useCallback((entity: Entity | null) => {
    setSelectedEntity(entity); setSelectedContact(null); setStringField('entity_id', entity?.id ?? ''); setStringField('contact_id', ''); setStringField('company_name', entity?.name ?? ''); setStringField('company_city', entity?.city ?? ''); resetContactFields();
    if (entity && !relationValuesMatch(entity.entity_type, normalizedRelation)) setStringField('entity_type', entity.entity_type);
    if (entity) clearErrors('entity_id');
  }, [clearErrors, normalizedRelation, resetContactFields, setSelectedContact, setSelectedEntity, setStringField]);

  const handleSelectContact = useCallback((contact: EntityContact | null) => {
    setSelectedContact(contact); setStringField('contact_id', contact?.id ?? '');
    if (!contact) return resetContactFields();
    setContactIdentity(contact.first_name ?? '', contact.last_name ?? '');
    setStringField('contact_position', contact.position ?? ''); setStringField('contact_phone', contact.phone ?? ''); setStringField('contact_email', contact.email ?? '');
  }, [resetContactFields, setContactIdentity, setSelectedContact, setStringField]);

  const handleContactSelect = useCallback((value: string) => handleSelectContact(value === 'none' ? null : (contacts.find(contact => contact.id === value) ?? null)), [contacts, handleSelectContact]);
  const handleSelectEntityFromSearch = useCallback((entity: Entity) => handleSelectEntity(entity), [handleSelectEntity]);
  const handleSelectContactFromSearch = useCallback((contact: EntityContact, entity: Entity | null) => { if (entity) handleSelectEntity(entity); handleSelectContact(contact); }, [handleSelectContact, handleSelectEntity]);
  const handleSaveClient = useCallback(async (payload: ClientPayload) => handleSelectEntity(await saveClientMutation.mutateAsync(payload)), [handleSelectEntity, saveClientMutation]);
  const handleSaveProspect = useCallback(async (payload: EntityPayload) => handleSelectEntity(await saveProspectMutation.mutateAsync(payload)), [handleSelectEntity, saveProspectMutation]);
  const handleSaveContact = useCallback(async (payload: EntityContactPayload) => handleSelectContact(await saveContactMutation.mutateAsync(payload)), [handleSelectContact, saveContactMutation]);

  const handleConvertClient = useCallback(async (payload: ClientPayload) => {
    let updated: Entity | null = null;
    try {
      updated = await saveClientMutation.mutateAsync(payload);
    } catch (error) {
      handleUiError(error, 'Impossible de convertir en client.', { source: 'CockpitForm.convertEntityToClient' });
      return;
    }
    void invalidateClientsQueries(queryClient, activeAgencyId);
    void invalidateEntitySearchIndexQueries(queryClient, activeAgencyId);
    handleSelectEntity(updated); onConvertComplete();
  }, [activeAgencyId, handleSelectEntity, onConvertComplete, queryClient, saveClientMutation]);

  const toggleFamily = useCallback((family: string) => setFamiliesField((megaFamilies ?? []).includes(family) ? megaFamilies.filter(item => item !== family) : [...megaFamilies, family]), [megaFamilies, setFamiliesField]);
  const setReminder = useCallback((type: '1h' | 'tomorrow' | '3days' | 'nextWeek') => setStringField('reminder_at', buildReminderDateTime(type)), [setStringField]);

  const handleSelectRecent = useCallback((interaction: Interaction, entity: Entity | null) => {
    setValue('channel', interaction.channel, { shouldDirty: true, shouldValidate: true });
    handleSelectEntity(entity);
  }, [handleSelectEntity, setValue]);

  return { handlePhoneChange, handleContactFirstNameChange, handleContactLastNameChange, handleSelectEntity, handleSelectContact, handleContactSelect, handleSelectEntityFromSearch, handleSelectContactFromSearch, handleSaveClient, handleSaveProspect, handleSaveContact, handleConvertClient, handleSelectRecent, toggleFamily, setReminder };
};
