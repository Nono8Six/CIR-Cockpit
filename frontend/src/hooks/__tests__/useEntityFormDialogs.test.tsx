import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useClientFormDialog } from '@/hooks/useClientFormDialog';
import { useProspectFormDialog } from '@/hooks/useProspectFormDialog';
import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import type { ProspectFormValues } from '../../../../shared/schemas/prospect.schema';

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

    const { result } = renderHook(() =>
      useClientFormDialog({
        open: true,
        client: null,
        agencies: [agency],
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ID,
        onSave,
        onOpenChange
      })
    );

    const values: ClientFormValues = {
      client_number: '1234',
      account_type: 'term',
      name: 'ACME',
      address: 'Rue de Paris',
      postal_code: '75001',
      department: '75',
      city: 'Paris',
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
        "Impossible d'enregistrer le client."
      );
    });
  });

  it('keeps prospect dialog open and sets root error when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      useProspectFormDialog({
        open: true,
        prospect: null,
        agencies: [agency],
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ID,
        onSave,
        onOpenChange
      })
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
