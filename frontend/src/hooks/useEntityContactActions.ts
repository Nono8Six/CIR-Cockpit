import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { saveEntityContact, type EntityContactPayload } from '@/services/entities/saveEntityContact';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import {
  invalidateClientContactsQuery,
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import { clientContactsKey } from '@/services/query/queryKeys';
import type { EntityContact } from '@/types';
import {
  createOptimisticContactId,
  toOptimisticContact,
  type ContactCacheSnapshot
} from './useEntityContactActions.optimistic';

interface UseEntityContactActionsInput {
  entityId: string | null;
  agencyId: string | null;
  includeArchived?: boolean;
}

export const useEntityContactActions = ({
  entityId,
  agencyId,
  includeArchived = false
}: UseEntityContactActionsInput) => {
  const queryClient = useQueryClient();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [contactDialogContact, setContactDialogContact] = useState<EntityContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<EntityContact | null>(null);
  const contactsQueryKey = entityId ? clientContactsKey(entityId, includeArchived) : null;

  const invalidateContactDependencies = async () => {
    await Promise.all([
      invalidateClientContactsQuery(queryClient, entityId, includeArchived),
      invalidateEntitySearchIndexQueries(queryClient, agencyId, includeArchived),
      invalidateDirectoryQueries(queryClient)
    ]);
  };

  const saveContactMutation = useMutation<EntityContact, unknown, EntityContactPayload, ContactCacheSnapshot>({
    mutationFn: (payload) =>
      saveEntityContact(payload).match(
        (contact) => contact,
        (error) => {
          throw error;
        }
      ),
    onMutate: async (payload) => {
      if (!contactsQueryKey || payload.entity_id !== entityId) {
        return { previousContacts: undefined };
      }

      await queryClient.cancelQueries({ queryKey: contactsQueryKey });
      const previousContacts = queryClient.getQueryData<EntityContact[]>(contactsQueryKey);
      const optimisticId = payload.id ?? createOptimisticContactId();
      const optimisticContact = toOptimisticContact(payload, optimisticId);
      queryClient.setQueryData<EntityContact[]>(contactsQueryKey, (contacts = []) => {
        if (payload.id) {
          return contacts.map((contact) => contact.id === payload.id ? { ...contact, ...optimisticContact } : contact);
        }
        return [...contacts, optimisticContact];
      });
      return { previousContacts, optimisticId };
    },
    onError: (error, _payload, context) => {
      if (contactsQueryKey) {
        queryClient.setQueryData(contactsQueryKey, context?.previousContacts);
      }
      handleUiError(error, "Impossible d'enregistrer le contact.", {
        source: 'useEntityContactActions.saveContact'
      });
    },
    onSuccess: (contact, payload, context) => {
      if (contactsQueryKey) {
        queryClient.setQueryData<EntityContact[]>(contactsQueryKey, (contacts = []) =>
          contacts.map((cached) =>
            cached.id === (payload.id ?? context?.optimisticId) ? contact : cached
          )
        );
      }
      notifySuccess(payload.id ? 'Contact mis à jour.' : 'Contact ajouté.');
    },
    onSettled: () => invalidateContactDependencies()
  });

  const deleteContactMutation = useMutation<void, unknown, string, ContactCacheSnapshot>({
    mutationFn: (contactId) =>
      deleteEntityContact(contactId).match(
        () => undefined,
        (error) => {
          throw error;
        }
      ),
    onMutate: async (contactId) => {
      if (!contactsQueryKey) {
        return { previousContacts: undefined };
      }

      await queryClient.cancelQueries({ queryKey: contactsQueryKey });
      const previousContacts = queryClient.getQueryData<EntityContact[]>(contactsQueryKey);
      queryClient.setQueryData<EntityContact[]>(contactsQueryKey, (contacts = []) =>
        contacts.filter((contact) => contact.id !== contactId)
      );
      return { previousContacts };
    },
    onError: (error, _contactId, context) => {
      if (contactsQueryKey) {
        queryClient.setQueryData(contactsQueryKey, context?.previousContacts);
      }
      handleUiError(error, 'Impossible de supprimer le contact.', {
        source: 'useEntityContactActions.deleteContact'
      });
    },
    onSuccess: () => {
      notifySuccess('Contact supprimé.');
    },
    onSettled: () => invalidateContactDependencies()
  });

  const requestAddContact = () => {
    setContactDialogContact(null);
    setIsContactDialogOpen(true);
  };

  const requestEditContact = (contact: EntityContact) => {
    setContactDialogContact(contact);
    setIsContactDialogOpen(true);
  };

  const handleContactDialogOpenChange = (open: boolean) => {
    setIsContactDialogOpen(open);
    if (!open) {
      setContactDialogContact(null);
    }
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
      await deleteContactMutation.mutateAsync(contactToDelete.id);
    } catch {
      return;
    } finally {
      setContactToDelete(null);
    }
  };

  return {
    contactDialogContact,
    contactToDelete,
    isContactDialogOpen,
    isDeletingContact: deleteContactMutation.isPending,
    isSavingContact: saveContactMutation.isPending,
    confirmDeleteContact,
    handleContactDialogOpenChange,
    requestAddContact,
    requestDeleteContact: setContactToDelete,
    requestEditContact,
    saveContact: async (payload: EntityContactPayload): Promise<void> => {
      await saveContactMutation.mutateAsync(payload);
    }
  };
};
