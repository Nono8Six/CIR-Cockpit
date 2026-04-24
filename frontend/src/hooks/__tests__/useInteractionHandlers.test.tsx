import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { useInteractionHandlers } from '@/hooks/useInteractionHandlers';
import { Channel, type Entity } from '@/types';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import type { EntityContactPayload } from '@/services/entities/saveEntityContact';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

const DEFAULT_VALUES: InteractionFormValues = {
  channel: Channel.PHONE,
  entity_type: 'Client',
  contact_service: '',
  company_name: '',
  company_city: '',
  contact_first_name: '',
  contact_last_name: '',
  contact_position: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  subject: '',
  mega_families: [],
  status_id: '',
  interaction_type: '',
  order_ref: '',
  reminder_at: '',
  notes: '',
  entity_id: '',
  contact_id: ''
};

const savedProspect: Entity = {
  id: 'prospect-1',
  account_type: null,
  address: null,
  agency_id: 'agency-1',
  archived_at: null,
  city: 'Bordeaux',
  client_number: null,
  country: 'France',
  created_at: '2026-04-20T09:00:00.000Z',
  created_by: null,
  department: null,
  entity_type: 'Prospect',
  name: 'Ateliers Rive Ouest',
  notes: null,
  postal_code: null,
  siret: null,
  updated_at: '2026-04-20T09:00:00.000Z'
};

describe('useInteractionHandlers', () => {
  it('sauvegarde un prospect puis l injecte dans la saisie courante', async () => {
    const saveProspectMutation = {
      mutateAsync: vi.fn<(_: EntityPayload) => Promise<Entity>>().mockResolvedValue(savedProspect)
    };
    const setSelectedEntity = vi.fn();
    const setSelectedContact = vi.fn();

    const { result } = renderHook(() => {
      const form = useForm<InteractionFormValues>({ defaultValues: DEFAULT_VALUES });
      const handlers = useInteractionHandlers({
        setValue: form.setValue,
        clearErrors: form.clearErrors,
        normalizedRelation: 'client',
        contacts: [],
        megaFamilies: [],
        contactFirstName: '',
        contactLastName: '',
        activeAgencyId: 'agency-1',
        queryClient: new QueryClient(),
        setSelectedEntity,
        setSelectedContact,
        saveClientMutation: {
          mutateAsync: vi.fn<(_: ClientPayload) => Promise<Entity>>()
        },
        saveProspectMutation,
        saveContactMutation: {
          mutateAsync: vi.fn<(_: EntityContactPayload) => Promise<never>>()
        },
        onConvertComplete: vi.fn()
      });

      return { form, handlers };
    });

    const payload: EntityPayload = {
      entity_type: 'Prospect',
      name: 'Ateliers Rive Ouest',
      agency_id: 'agency-1',
      city: 'Bordeaux'
    };

    await act(async () => {
      await result.current.handlers.handleSaveProspect(payload);
    });

    expect(saveProspectMutation.mutateAsync).toHaveBeenCalledWith(payload);
    expect(setSelectedEntity).toHaveBeenCalledWith(savedProspect);
    expect(setSelectedContact).toHaveBeenCalledWith(null);
    expect(result.current.form.getValues('entity_id')).toBe(savedProspect.id);
    expect(result.current.form.getValues('entity_type')).toBe('Prospect');
    expect(result.current.form.getValues('company_name')).toBe(savedProspect.name);
    expect(result.current.form.getValues('company_city')).toBe(savedProspect.city);
  });
});
