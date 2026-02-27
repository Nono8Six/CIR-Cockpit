import type { ChangeEvent } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { UseFormClearErrors, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import type { Entity, EntityContact } from '@/types';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityContactPayload } from '@/services/entities/saveEntityContact';

type MutationLike<TPayload, TResult> = { mutateAsync: (payload: TPayload) => Promise<TResult> };

export type InteractionHandlersInput = {
  setValue: UseFormSetValue<InteractionFormValues>;
  clearErrors: UseFormClearErrors<InteractionFormValues>;
  normalizedRelation: string;
  contacts: EntityContact[];
  megaFamilies: string[];
  contactFirstName: string;
  contactLastName: string;
  activeAgencyId: string | null;
  queryClient: QueryClient;
  setSelectedEntity: (entity: Entity | null) => void;
  setSelectedContact: (contact: EntityContact | null) => void;
  saveClientMutation: MutationLike<ClientPayload, Entity>;
  saveContactMutation: MutationLike<EntityContactPayload, EntityContact>;
  onConvertComplete: () => void;
};

export type ContactInputHandler = (event: ChangeEvent<HTMLInputElement>) => void;


