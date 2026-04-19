import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProspectFormDialog } from '@/hooks/useProspectFormDialog';
import type { Agency } from '@/types';

const AGENCY_ONE = '11111111-1111-4111-8111-111111111111';
const AGENCY_TWO = '22222222-2222-4222-8222-222222222222';

type ProspectInput = {
  id: string;
  entity_type: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  department: string | null;
  city: string | null;
  siret: string | null;
  siren: string | null;
  naf_code: string | null;
  official_name: string | null;
  official_data_source: string | null;
  official_data_synced_at: string | null;
  notes: string | null;
  agency_id: string | null;
};

const buildProspect = (overrides: Partial<ProspectInput> = {}): ProspectInput => ({
  id: 'prospect-1',
  entity_type: 'Prospect',
  name: 'Acme SARL',
  address: '12 rue Victor Hugo',
  postal_code: '75011',
  department: '75',
  city: 'Paris',
  siret: '12345678900010',
  siren: '123456789',
  naf_code: '6201Z',
  official_name: 'ACME SARL',
  official_data_source: null,
  official_data_synced_at: null,
  notes: 'Prospect chaud',
  agency_id: AGENCY_ONE,
  ...overrides,
});

const AGENCIES: Agency[] = [
  {
    id: AGENCY_ONE,
    name: 'Agence Paris',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    archived_at: null,
  },
  {
    id: AGENCY_TWO,
    name: 'Agence Lyon',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    archived_at: null,
  },
];

describe('useProspectFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets the form to prospect values when dialog opens', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const prospect = buildProspect();

    const { result } = renderHook(() =>
      useProspectFormDialog({
        open: true,
        prospect,
        agencies: AGENCIES,
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ONE,
        onSave,
        onOpenChange,
      }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Acme SARL');
    });
    expect(result.current.form.getValues('city')).toBe('Paris');
    expect(result.current.postalCode).toBe('75011');
    expect(result.current.agencyValue).toBe(AGENCY_ONE);
  });

  it('updates department when postal code changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      useProspectFormDialog({
        open: true,
        prospect: null,
        agencies: AGENCIES,
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ONE,
        onSave,
        onOpenChange,
      }),
    );

    act(() => {
      result.current.handlePostalCodeChange({
        target: { value: '69002abc' },
      } as ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      expect(result.current.postalCode).toBe('69002');
    });
    expect(result.current.form.getValues('department')).toBe('69');
  });

  it('submits payload with trimmed optional fields and closes dialog', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const prospect = buildProspect({ address: '  12 rue  ', notes: '   ' });

    const { result } = renderHook(() =>
      useProspectFormDialog({
        open: true,
        prospect,
        agencies: AGENCIES,
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ONE,
        onSave,
        onOpenChange,
      }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Acme SARL');
    });

    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      id: 'prospect-1',
      entity_type: 'Prospect',
      name: 'Acme SARL',
      agency_id: AGENCY_ONE,
      address: '12 rue',
      notes: null,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('forces active agency for tcs role', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const prospect = buildProspect({ agency_id: AGENCY_TWO });

    const { result } = renderHook(() =>
      useProspectFormDialog({
        open: true,
        prospect,
        agencies: AGENCIES,
        userRole: 'tcs',
        activeAgencyId: AGENCY_ONE,
        onSave,
        onOpenChange,
      }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Acme SARL');
    });

    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    expect(onSave.mock.calls[0]?.[0]?.agency_id).toBe(AGENCY_ONE);
  });

  it('sets root error when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('server error'));
    const onOpenChange = vi.fn();
    const prospect = buildProspect();

    const { result } = renderHook(() =>
      useProspectFormDialog({
        open: true,
        prospect,
        agencies: AGENCIES,
        userRole: 'agency_admin',
        activeAgencyId: AGENCY_ONE,
        onSave,
        onOpenChange,
      }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Acme SARL');
    });

    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.root?.message).toBe(
      "Impossible d'enregistrer le prospect.",
    );
  });
});
