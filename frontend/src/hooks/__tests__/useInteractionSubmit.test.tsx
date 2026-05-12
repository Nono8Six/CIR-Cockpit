import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { errAsync, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInteractionSubmit } from '@/hooks/useInteractionSubmit';
import { INTERNAL_COMPANY_NAME, INTERNAL_RELATION_LABEL } from '@/constants/relations';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { saveEntity } from '@/services/entities/saveEntity';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import {
  invalidateClientContactsQuery,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import type { Entity, EntityContact, InteractionDraft } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

vi.mock('@/services/entities/saveEntity', () => ({
  saveEntity: vi.fn()
}));

vi.mock('@/services/entities/saveEntityContact', () => ({
  saveEntityContact: vi.fn()
}));

vi.mock('@/services/query/queryInvalidation', () => ({
  invalidateClientContactsQuery: vi.fn(),
  invalidateEntitySearchIndexQueries: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

vi.mock('@/services/interactions/generateId', () => ({
  generateId: vi.fn(() => 'generated-id')
}));

vi.mock('@/utils/date/getNowIsoString', () => ({
  getNowIsoString: vi.fn(() => '2026-02-28T10:00:00.000Z')
}));

const BASE_VALUES: InteractionFormValues = {
  channel: 'Téléphone',
  entity_type: 'Prospect',
  contact_service: 'Atelier',
  company_name: 'ACME',
  company_city: 'Paris',
  contact_first_name: 'Alice',
  contact_last_name: 'Martin',
  contact_position: '',
  contact_name: '',
  contact_phone: '0102030405',
  contact_email: 'alice@example.com',
  subject: 'Demande de devis',
  mega_families: ['Freinage'],
  status_id: 'status-1',
  interaction_type: 'Devis',
  order_ref: '',
  reminder_at: '',
  notes: 'Note',
  entity_id: '',
  contact_id: ''
};

describe('useInteractionSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invalidateClientContactsQuery).mockResolvedValue(undefined);
    vi.mocked(invalidateEntitySearchIndexQueries).mockResolvedValue(undefined);
  });

  it('creates missing entity/contact and submits interaction', async () => {
    const createdEntity: Entity = {
      id: 'entity-1',
      account_type: null,
      address: null,
      agency_id: 'agency-1',
      archived_at: null,
      city: 'Paris',
      client_number: null,
      country: 'France',
      created_at: '2026-01-01T10:00:00.000Z',
      created_by: null,
      department: null,
      entity_type: 'Prospect',
      name: 'ACME',
      notes: null,
      postal_code: null,
      siret: null,
      updated_at: '2026-01-01T10:00:00.000Z'
    };
    const createdContact: EntityContact = {
      id: 'contact-1',
      archived_at: null,
      created_at: '2026-01-01T10:00:00.000Z',
      email: 'alice@example.com',
      entity_id: 'entity-1',
      first_name: 'Alice',
      last_name: 'Martin',
      notes: null,
      phone: '0102030405',
      position: null,
      updated_at: '2026-01-01T10:00:00.000Z'
    };
    const onSave = vi.fn<(_: InteractionDraft) => Promise<boolean>>().mockResolvedValue(true);
    const handleSelectEntity = vi.fn();
    const handleSelectContact = vi.fn();
    const handleReset = vi.fn();
    const setKnownCompanies = vi.fn();

    vi.mocked(saveEntity).mockReturnValue(okAsync(createdEntity));
    vi.mocked(saveEntityContact).mockReturnValue(okAsync(createdContact));

    const { result } = renderHook(() =>
      useInteractionSubmit({
        activeAgencyId: 'agency-1',
        selectedEntity: null,
        selectedContact: null,
        onSave,
        handleSelectEntity,
        handleSelectContact,
        queryClient: new QueryClient(),
        handleReset,
        onSaveSuccess: vi.fn(),
        setKnownCompanies
      })
    );

    await act(async () => {
      await result.current.onSubmit(BASE_VALUES);
    });

    expect(saveEntity).toHaveBeenCalledTimes(1);
    expect(saveEntityContact).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(handleSelectEntity).toHaveBeenCalledWith(createdEntity);
    expect(handleSelectContact).toHaveBeenCalledWith(createdContact);
    expect(invalidateClientContactsQuery).toHaveBeenCalledWith(
      expect.any(QueryClient),
      createdEntity.id,
      false
    );
    expect(invalidateEntitySearchIndexQueries).toHaveBeenCalledWith(
      expect.any(QueryClient),
      'agency-1'
    );
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('reports an error when entity creation fails', async () => {
    const appError = createAppError({
      code: 'REQUEST_FAILED',
      message: "Impossible de creer l'entite.",
      source: 'edge'
    });
    const onSave = vi.fn<(_: InteractionDraft) => Promise<boolean>>().mockResolvedValue(true);
    vi.mocked(saveEntity).mockReturnValue(errAsync(appError));

    const { result } = renderHook(() =>
      useInteractionSubmit({
        activeAgencyId: 'agency-1',
        selectedEntity: null,
        selectedContact: null,
        onSave,
        handleSelectEntity: vi.fn(),
        handleSelectContact: vi.fn(),
        queryClient: new QueryClient(),
        handleReset: vi.fn(),
        onSaveSuccess: vi.fn(),
        setKnownCompanies: vi.fn()
      })
    );

    await act(async () => {
      await result.current.onSubmit(BASE_VALUES);
    });

    expect(handleUiError).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits internal interactions without creating entity/contact', async () => {
    const onSave = vi.fn<(_: InteractionDraft) => Promise<boolean>>().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useInteractionSubmit({
        activeAgencyId: 'agency-1',
        selectedEntity: null,
        selectedContact: null,
        onSave,
        handleSelectEntity: vi.fn(),
        handleSelectContact: vi.fn(),
        queryClient: new QueryClient(),
        handleReset: vi.fn(),
        onSaveSuccess: vi.fn(),
        setKnownCompanies: vi.fn()
      })
    );

    await act(async () => {
      await result.current.onSubmit({
        ...BASE_VALUES,
        entity_type: INTERNAL_RELATION_LABEL,
        company_name: 'Ignored'
      });
    });

    expect(saveEntity).not.toHaveBeenCalled();
    expect(saveEntityContact).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: INTERNAL_COMPANY_NAME
      })
    );
  });
});
