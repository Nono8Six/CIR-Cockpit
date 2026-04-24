import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import {
  INTERNAL_COMPANY_NAME,
  INTERNAL_RELATION_LABEL
} from '@/constants/relations';
import { useCockpitRelationChange } from '@/hooks/useCockpitRelationChange';
import type { AgencyConfig } from '@/services/config';
import { Channel, type Entity, type EntityContact } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

const filledClientValues: InteractionFormValues = {
  channel: Channel.PHONE,
  entity_type: 'Client',
  contact_service: 'Pieces',
  company_name: 'SEA Aquitaine',
  company_city: 'Gradignan',
  contact_first_name: 'Marc',
  contact_last_name: 'Dupont',
  contact_position: 'Responsable atelier',
  contact_name: 'Marc Dupont',
  contact_phone: '05 56 00 00 00',
  contact_email: 'marc.dupont@example.test',
  subject: 'Demande de piece',
  mega_families: ['Freinage'],
  status_id: 'status-old',
  interaction_type: 'Rappel',
  order_ref: 'BC-42',
  reminder_at: '2026-04-22T08:00',
  notes: 'Note interne',
  entity_id: 'client-1',
  contact_id: 'contact-1'
};

const config: AgencyConfig = {
  statuses: [
    {
      id: 'status-default',
      label: 'Nouveau',
      category: 'todo',
      is_terminal: false,
      is_default: true,
      sort_order: 1
    }
  ],
  services: ['Atelier'],
  entities: ['Client', 'Fournisseur', INTERNAL_RELATION_LABEL],
  families: ['Freinage'],
  interactionTypes: ['Demande']
};

const clearedStringFields: Array<keyof InteractionFormValues> = [
  'company_city',
  'contact_first_name',
  'contact_last_name',
  'contact_position',
  'contact_name',
  'contact_phone',
  'contact_email',
  'subject',
  'order_ref',
  'reminder_at',
  'notes',
  'entity_id',
  'contact_id'
];

const setup = () => {
  const setSelectedEntity = vi.fn<(_: Entity | null) => void>();
  const setSelectedContact = vi.fn<(_: EntityContact | null) => void>();

  const hook = renderHook(() => {
    const form = useForm<InteractionFormValues>({ defaultValues: filledClientValues });
    const onRelationChange = useCockpitRelationChange({
      reset: form.reset,
      clearErrors: form.clearErrors,
      channel: form.getValues('channel'),
      entityType: form.getValues('entity_type'),
      config,
      defaultStatusId: 'status-default',
      setSelectedEntity,
      setSelectedContact
    });

    return { form, onRelationChange };
  });

  return { ...hook, setSelectedEntity, setSelectedContact };
};

describe('useCockpitRelationChange', () => {
  it('nettoie le client et le contact quand le type de tiers change', () => {
    const { result, setSelectedEntity, setSelectedContact } = setup();

    act(() => {
      result.current.onRelationChange('Fournisseur');
    });

    expect(setSelectedEntity).toHaveBeenCalledWith(null);
    expect(setSelectedContact).toHaveBeenCalledWith(null);
    expect(result.current.form.getValues('channel')).toBe(Channel.PHONE);
    expect(result.current.form.getValues('entity_type')).toBe('Fournisseur');
    expect(result.current.form.getValues('contact_service')).toBe('Atelier');
    expect(result.current.form.getValues('interaction_type')).toBe('Demande');
    expect(result.current.form.getValues('status_id')).toBe('status-default');
    expect(result.current.form.getValues('company_name')).toBe('');
    expect(result.current.form.getValues('mega_families')).toEqual([]);
    clearedStringFields.forEach((field) => {
      expect(result.current.form.getValues(field)).toBe('');
    });
  });

  it('ne reset pas les champs quand le type de tiers reste identique', () => {
    const { result, setSelectedEntity, setSelectedContact } = setup();

    act(() => {
      result.current.onRelationChange(' Client ');
    });

    expect(setSelectedEntity).not.toHaveBeenCalled();
    expect(setSelectedContact).not.toHaveBeenCalled();
    expect(result.current.form.getValues('entity_type')).toBe('Client');
    expect(result.current.form.getValues('company_name')).toBe('SEA Aquitaine');
    expect(result.current.form.getValues('contact_id')).toBe('contact-1');
    expect(result.current.form.getValues('subject')).toBe('Demande de piece');
  });

  it('renseigne CIR et vide les donnees tiers pour une relation interne', () => {
    const { result } = setup();

    act(() => {
      result.current.onRelationChange(INTERNAL_RELATION_LABEL);
    });

    expect(result.current.form.getValues('entity_type')).toBe(INTERNAL_RELATION_LABEL);
    expect(result.current.form.getValues('company_name')).toBe(INTERNAL_COMPANY_NAME);
    expect(result.current.form.getValues('contact_id')).toBe('');
    expect(result.current.form.getValues('subject')).toBe('');
  });

  it('preserve le mode Tout avec un entity_type vide', () => {
    const { result } = setup();

    act(() => {
      result.current.onRelationChange('');
    });

    expect(result.current.form.getValues('entity_type')).toBe('');
    expect(result.current.form.getValues('contact_service')).toBe('Atelier');
    expect(result.current.form.getValues('interaction_type')).toBe('Demande');
    expect(result.current.form.getValues('status_id')).toBe('status-default');
    expect(result.current.form.getValues('company_name')).toBe('');
  });
});
