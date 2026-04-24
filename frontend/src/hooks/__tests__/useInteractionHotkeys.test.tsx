import { createRef } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UseFormSetFocus, UseFormSetValue } from 'react-hook-form';

import { useInteractionHotkeys } from '@/hooks/useInteractionHotkeys';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

const setup = (canStartNewEntryFromShortcut: boolean) => {
  const onReset = vi.fn();
  const setFocus: UseFormSetFocus<InteractionFormValues> = vi.fn();
  const setValue: UseFormSetValue<InteractionFormValues> = vi.fn();

  renderHook(() =>
    useInteractionHotkeys({
      formRef: createRef<HTMLFormElement>(),
      searchInputRef: createRef<HTMLInputElement>(),
      setFocus,
      setValue,
      onReset,
      canStartNewEntryFromShortcut
    })
  );

  return { onReset };
};

describe('useInteractionHotkeys', () => {
  it('ne bloque pas Ctrl+N et ne reset pas pendant une saisie active', () => {
    const { onReset } = setup(false);
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      cancelable: true
    });

    window.dispatchEvent(event);

    expect(onReset).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('declenche une nouvelle saisie avec Ctrl+N uniquement quand le raccourci est autorise', () => {
    const { onReset } = setup(true);
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      cancelable: true
    });

    window.dispatchEvent(event);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
