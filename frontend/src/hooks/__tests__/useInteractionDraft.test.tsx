import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInteractionDraft } from '@/hooks/useInteractionDraft';
import { Channel, type Entity, type EntityContact } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { normalizeError } from '@/services/errors/normalizeError';
import { reportError } from '@/services/errors/reportError';
import { deleteInteractionDraft } from '@/services/interactions/deleteInteractionDraft';
import { getInteractionDraft } from '@/services/interactions/getInteractionDraft';
import { saveInteractionDraft } from '@/services/interactions/saveInteractionDraft';

vi.mock('@/services/interactions/getInteractionDraft', () => ({
  getInteractionDraft: vi.fn()
}));
vi.mock('@/services/interactions/saveInteractionDraft', () => ({
  saveInteractionDraft: vi.fn()
}));
vi.mock('@/services/interactions/deleteInteractionDraft', () => ({
  deleteInteractionDraft: vi.fn()
}));
vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));
vi.mock('@/services/errors/normalizeError', () => ({
  normalizeError: vi.fn()
}));
vi.mock('@/services/errors/reportError', () => ({
  reportError: vi.fn()
}));

const createEntity = (overrides?: Partial<Entity>): Entity => ({
  id: overrides?.id ?? 'entity-1',
  account_type: overrides?.account_type ?? null,
  address: overrides?.address ?? null,
  agency_id: overrides?.agency_id ?? 'agency-1',
  archived_at: overrides?.archived_at ?? null,
  city: overrides?.city ?? 'Paris',
  client_number: overrides?.client_number ?? null,
  country: overrides?.country ?? 'France',
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  created_by: overrides?.created_by ?? null,
  department: overrides?.department ?? null,
  entity_type: overrides?.entity_type ?? 'Client',
  name: overrides?.name ?? 'Acme',
  notes: overrides?.notes ?? null,
  postal_code: overrides?.postal_code ?? null,
  siret: overrides?.siret ?? null,
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z'
});

const createContact = (overrides?: Partial<EntityContact>): EntityContact => ({
  id: overrides?.id ?? 'contact-1',
  archived_at: overrides?.archived_at ?? null,
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  email: overrides?.email ?? 'alice@example.com',
  entity_id: overrides?.entity_id ?? 'entity-1',
  first_name: overrides?.first_name ?? 'Alice',
  last_name: overrides?.last_name ?? 'Martin',
  notes: overrides?.notes ?? null,
  phone: overrides?.phone ?? '0102030405',
  position: overrides?.position ?? null,
  updated_at: overrides?.updated_at ?? '2026-01-01T10:00:00.000Z'
});

const DEFAULT_VALUES: InteractionFormValues = {
  channel: Channel.PHONE,
  entity_type: 'Client',
  contact_service: 'Atelier',
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
  status_id: 'status-1',
  interaction_type: 'Devis',
  order_ref: '',
  reminder_at: '',
  notes: '',
  entity_id: '',
  contact_id: ''
};

const buildContext = (overrides?: Partial<Parameters<typeof useInteractionDraft>[0]>) => {
  const setSelectedEntity = vi.fn();
  const setSelectedContact = vi.fn();
  const reset = vi.fn((values?: unknown) => values);
  return {
    activeAgencyId: 'agency-1',
    userId: 'user-1',
    defaultValues: DEFAULT_VALUES,
    relationOptions: ['Client', 'Prospect'],
    config: {
      statuses: [
        {
          id: 'status-1',
          label: 'Nouveau',
          category: 'todo' as const,
          is_terminal: false,
          is_default: true,
          sort_order: 1
        }
      ],
      services: ['Atelier'],
      entities: ['Client'],
      families: ['Freinage'],
      interactionTypes: ['Devis']
    },
    defaultStatusId: 'status-1',
    reset,
    setSelectedEntity,
    setSelectedContact,
    entities: [],
    contacts: [],
    entitySearchLoading: false,
    contactsLoading: false,
    entityId: '',
    contactId: '',
    selectedEntity: null,
    selectedContact: null,
    draftPayload: {
      values: {
        ...DEFAULT_VALUES
      }
    },
    hasDraftContent: false,
    ...overrides
  };
};

describe('useInteractionDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores draft values and resolves pending entity/contact selection', async () => {
    const context = buildContext();
    vi.mocked(getInteractionDraft).mockResolvedValue({
      id: 'draft-1',
      updated_at: '2026-02-28T09:00:00.000Z',
      payload: {
        values: {
          ...DEFAULT_VALUES,
          entity_id: 'entity-1',
          contact_id: 'contact-1',
          company_name: 'Acme'
        }
      }
    });

    const { rerender } = renderHook(
      (props: ReturnType<typeof buildContext>) => useInteractionDraft(props),
      { initialProps: context }
    );

    await waitFor(() => {
      expect(context.reset).toHaveBeenCalledTimes(1);
    });

    rerender({
      ...context,
      entities: [createEntity({ id: 'entity-1' })],
      contacts: [createContact({ id: 'contact-1', entity_id: 'entity-1' })]
    });

    await waitFor(() => {
      expect(context.setSelectedEntity).toHaveBeenCalled();
      expect(context.setSelectedContact).toHaveBeenCalled();
    });
  });

  it('uses handleUiError once, then reportError on repeated autosave failures', async () => {
    vi.useFakeTimers();
    const appError = createAppError({
      code: 'DRAFT_SAVE_FAILED',
      message: 'Sauvegarde automatique indisponible.',
      source: 'db'
    });
    vi.mocked(getInteractionDraft).mockResolvedValue(null);
    vi.mocked(saveInteractionDraft).mockRejectedValue(new Error('save failed'));
    vi.mocked(normalizeError).mockReturnValue(appError);

    const initialContext = buildContext({
      hasDraftContent: false
    });
    const { rerender } = renderHook(
      (props: ReturnType<typeof buildContext>) => useInteractionDraft(props),
      { initialProps: initialContext }
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(getInteractionDraft).toHaveBeenCalledTimes(1);

    rerender(
      {
        ...initialContext,
        hasDraftContent: true,
        draftPayload: {
          values: {
            ...DEFAULT_VALUES,
            subject: 'Sujet modifie 1'
          }
        }
      }
    );

    await act(async () => {
      vi.advanceTimersByTime(900);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(handleUiError).toHaveBeenCalledTimes(1);

    rerender(
      {
        ...initialContext,
        hasDraftContent: true,
        draftPayload: {
          values: {
            ...DEFAULT_VALUES,
            subject: 'Sujet modifie 2'
          }
        }
      }
    );

    await act(async () => {
      vi.advanceTimersByTime(900);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it('cleans up invalid drafts when DRAFT_NOT_FOUND is received', async () => {
    vi.mocked(getInteractionDraft).mockRejectedValue(
      createAppError({
        code: 'DRAFT_NOT_FOUND',
        message: 'Brouillon introuvable.',
        source: 'db'
      })
    );
    vi.mocked(deleteInteractionDraft).mockResolvedValue(undefined);

    renderHook(() => useInteractionDraft(buildContext()));

    await waitFor(() => {
      expect(deleteInteractionDraft).toHaveBeenCalledTimes(1);
    });
    expect(handleUiError).not.toHaveBeenCalled();
  });

  it('normalizes draft values and clears persisted draft on reset', async () => {
    const context = buildContext();
    vi.mocked(getInteractionDraft).mockResolvedValue({
      id: 'draft-2',
      updated_at: '2026-02-28T09:00:00.000Z',
      payload: {
        values: {
          ...DEFAULT_VALUES,
          entity_type: 'Relation inconnue',
          contact_service: 'Service inconnu',
          interaction_type: 'Type inconnu',
          status_id: 'status-inconnu',
          mega_families: ['Invalide'],
          company_name: 'Entreprise'
        }
      }
    });
    vi.mocked(deleteInteractionDraft).mockResolvedValue(undefined);

    const { result } = renderHook(() => useInteractionDraft(context));

    await waitFor(() => {
      expect(context.reset).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.handleReset();
    });

    await waitFor(() => {
      expect(deleteInteractionDraft).toHaveBeenCalledWith({
        userId: 'user-1',
        agencyId: 'agency-1'
      });
    });
  });
});
