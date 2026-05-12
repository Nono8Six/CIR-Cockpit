import { act, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { errAsync, okAsync } from 'neverthrow';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useEntityContactActions } from '@/hooks/useEntityContactActions';
import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { saveEntityContact, type EntityContactPayload } from '@/services/entities/saveEntityContact';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import { clientContactsKey } from '@/services/query/queryKeys';
import type { EntityContact } from '@/types';

vi.mock('@/services/entities/saveEntityContact', () => ({
  saveEntityContact: vi.fn()
}));

vi.mock('@/services/entities/deleteEntityContact', () => ({
  deleteEntityContact: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

vi.mock('@/services/errors/notify', () => ({
  notifySuccess: vi.fn()
}));

const contact = {
  id: 'contact-1',
  entity_id: 'entity-1',
  first_name: 'Alice',
  last_name: 'Martin',
  email: 'alice@example.test',
  phone: null,
  position: 'Responsable',
  notes: null,
  archived_at: null,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z'
} satisfies EntityContact;

const payload = {
  entity_id: 'entity-1',
  first_name: 'Alice',
  last_name: 'Durand',
  email: 'alice.durand@example.test',
  phone: null,
  position: null,
  notes: null
} satisfies EntityContactPayload;

const renderActions = () => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => useEntityContactActions({ entityId: 'entity-1', agencyId: 'agency-1' }),
    { wrapper }
  );
  return { ...hook, queryClient };
};

describe('useEntityContactActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a contact, updates the contact cache and notifies success', async () => {
    const savedContact = { ...contact, ...payload, id: 'contact-2' } satisfies EntityContact;
    vi.mocked(saveEntityContact).mockReturnValue(okAsync(savedContact));
    const { result, queryClient } = renderActions();

    await act(async () => {
      await result.current.saveContact(payload);
    });

    const cached = queryClient.getQueryData<EntityContact[]>(clientContactsKey('entity-1', false));
    expect(cached?.map((item) => item.id)).toContain('contact-2');
    expect(notifySuccess).toHaveBeenCalledWith('Contact ajouté.');
  });

  it('rolls back the optimistic cache when save fails', async () => {
    const appError = createAppError({ code: 'DB_WRITE_FAILED', message: 'KO', source: 'edge' });
    vi.mocked(saveEntityContact).mockReturnValue(errAsync(appError));
    const { result, queryClient } = renderActions();
    queryClient.setQueryData(clientContactsKey('entity-1', false), [contact]);

    await act(async () => {
      await result.current.saveContact(payload).catch(() => undefined);
    });

    expect(queryClient.getQueryData(clientContactsKey('entity-1', false))).toEqual([contact]);
    expect(handleUiError).toHaveBeenCalledWith(appError, "Impossible d'enregistrer le contact.", {
      source: 'useEntityContactActions.saveContact'
    });
  });

  it('deletes a contact through confirmation workflow', async () => {
    vi.mocked(deleteEntityContact).mockReturnValue(okAsync(undefined));
    const { result, queryClient } = renderActions();
    queryClient.setQueryData(clientContactsKey('entity-1', false), [contact]);

    act(() => {
      result.current.requestDeleteContact(contact);
    });
    await act(async () => {
      await result.current.confirmDeleteContact();
    });

    expect(queryClient.getQueryData(clientContactsKey('entity-1', false))).toEqual([]);
    expect(deleteEntityContact).toHaveBeenCalledWith('contact-1');
    expect(notifySuccess).toHaveBeenCalledWith('Contact supprimé.');
  });
});
