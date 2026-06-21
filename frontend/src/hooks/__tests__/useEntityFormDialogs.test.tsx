import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useClientFormDialog, type ClientCompanyFormUiValues } from '../entities/clients/useClientFormDialog';
import { useProspectFormDialog } from '../entities/prospects/useProspectFormDialog';
import type { ProspectFormValues } from '../../../../shared/schemas/entity/prospect.schema';

const AGENCY_ID = '11111111-1111-1111-1111-111111111111';
const agency = {
  id: AGENCY_ID,
  name: 'Agence A',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  archived_at: null
};

describe('entity form dialogs', () => {
  it('keeps client dialog open and sets root error when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    const onOpenChange = vi.fn();
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() =>
      useClientFormDialog({
        open: true,
        client: null,
        agencies: [agency],
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ID,
        onSave,
        onOpenChange
      }),
      { wrapper }
    );

    const values: ClientCompanyFormUiValues = {
      client_number: '1234',
      client_kind: 'company',
      account_type: 'term',
      name: 'ACME',
      address: 'Rue de Paris',
      postal_code: '75001',
      department: '75',
      city: 'Paris',
      siret: '',
      notes: '',
      agency_id: AGENCY_ID,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '0600000000'
    };

    await act(async () => {
      await result.current.onSubmit(values);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(result.current.form.formState.errors.root?.message).toBe(
        "Impossible d'enregistrer le client ou son contact principal."
      );
    });
  });

  it('keeps prospect dialog open and sets root error when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    const onOpenChange = vi.fn();
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() =>
      useProspectFormDialog({
        open: true,
        prospect: null,
        agencies: [agency],
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ID,
        onSave,
        onOpenChange
      }),
      { wrapper }
    );

    const values: ProspectFormValues = {
      name: 'Prospect A',
      address: 'Rue',
      postal_code: '33000',
      department: '33',
      city: 'Bordeaux',
      siret: '',
      notes: '',
      agency_id: AGENCY_ID
    };

    await act(async () => {
      await result.current.onSubmit(values);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(result.current.form.formState.errors.root?.message).toBe(
        "Impossible d'enregistrer le prospect."
      );
    });
  });
});
