import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClientContactDialog } from '@/hooks/useClientContactDialog';
import type { EntityContact } from '@/types';

const buildContact = (overrides: Partial<EntityContact> = {}): EntityContact => ({
  id: 'contact-1',
  entity_id: 'entity-1',
  first_name: 'Alice',
  last_name: 'Martin',
  email: 'alice@example.com',
  phone: '0102030405',
  position: 'CEO',
  notes: 'VIP',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  archived_at: null,
  ...overrides,
});

describe('useClientContactDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets the form to contact values when dialog opens', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const contact = buildContact();

    const { result } = renderHook(() =>
      useClientContactDialog({ open: true, contact, entityId: 'entity-1', onSave, onOpenChange }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('first_name')).toBe('Alice');
    });
    expect(result.current.form.getValues('last_name')).toBe('Martin');
    expect(result.current.phoneValue).toBe('0102030405');
  });

  it('resets to empty values when no contact is provided', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      useClientContactDialog({
        open: true,
        contact: null,
        entityId: 'entity-1',
        onSave,
        onOpenChange,
      }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('first_name')).toBe('');
    });
    expect(result.current.form.getValues('email')).toBe('');
  });

  it('formats phone value on change', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      useClientContactDialog({
        open: true,
        contact: null,
        entityId: 'entity-1',
        onSave,
        onOpenChange,
      }),
    );

    act(() => {
      result.current.handlePhoneChange({
        target: { value: '0102030405' },
      } as ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      expect(result.current.phoneValue).toBe('01 02 03 04 05');
    });
  });

  it('submits a valid payload and closes dialog on success', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const contact = buildContact();

    const { result } = renderHook(() =>
      useClientContactDialog({ open: true, contact, entityId: 'entity-1', onSave, onOpenChange }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('first_name')).toBe('Alice');
    });

    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    expect(onSave).toHaveBeenCalledWith({
      id: 'contact-1',
      entity_id: 'entity-1',
      first_name: 'Alice',
      last_name: 'Martin',
      email: 'alice@example.com',
      phone: '0102030405',
      position: 'CEO',
      notes: 'VIP',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('sets a root error when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('server down'));
    const onOpenChange = vi.fn();
    const contact = buildContact();

    const { result } = renderHook(() =>
      useClientContactDialog({ open: true, contact, entityId: 'entity-1', onSave, onOpenChange }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('first_name')).toBe('Alice');
    });

    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.root?.message).toBe(
      "Impossible d'enregistrer le contact.",
    );
  });

  it('coerces empty optional fields to null in payload', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { result } = renderHook(() =>
      useClientContactDialog({
        open: true,
        contact: null,
        entityId: 'entity-1',
        onSave,
        onOpenChange,
      }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues('first_name')).toBe('');
    });

    act(() => {
      result.current.form.setValue('first_name', 'Bob');
      result.current.form.setValue('last_name', 'Doe');
    });

    await act(async () => {
      await result.current.onSubmit(result.current.form.getValues());
    });

    expect(onSave).toHaveBeenCalledWith({
      id: undefined,
      entity_id: 'entity-1',
      first_name: 'Bob',
      last_name: 'Doe',
      email: null,
      phone: null,
      position: null,
      notes: null,
    });
  });
});
