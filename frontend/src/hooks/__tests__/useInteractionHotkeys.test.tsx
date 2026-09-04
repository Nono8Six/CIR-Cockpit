import type { RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UseFormSetValue } from 'react-hook-form';

import { useInteractionHotkeys } from '../interactions/handlers/useInteractionHotkeys';
import type { InteractionFormValues } from '../../../../shared/schemas/interaction/interaction.schema';
import { Channel } from '@/types';

type HookProps = {
  isActive: boolean;
  canStartNewEntryFromShortcut: boolean;
};

const setup = (initialProps: HookProps) => {
  const onReset = vi.fn();
  const requestSubmit = vi.fn();
  const setValue: UseFormSetValue<InteractionFormValues> = vi.fn();
  const form = document.createElement('form');
  form.requestSubmit = requestSubmit;
  const formRef = { current: form } as RefObject<HTMLFormElement>;

  const view = renderHook(
    ({ isActive, canStartNewEntryFromShortcut }: HookProps) =>
      useInteractionHotkeys({
        isActive,
        formRef,
        setValue,
        onReset,
        canStartNewEntryFromShortcut
      }),
    { initialProps }
  );

  return { ...view, onReset, requestSubmit, setValue };
};

describe('useInteractionHotkeys', () => {
  it('ne bloque pas Ctrl+N et ne reset pas pendant une saisie active', () => {
    const { onReset } = setup({ isActive: true, canStartNewEntryFromShortcut: false });
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      cancelable: true
    });

    window.dispatchEvent(event);

    expect(onReset).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('conserve soumission, nouvelle saisie et changement de canal quand le Cockpit est actif', () => {
    const { onReset, requestSubmit, setValue } = setup({
      isActive: true,
      canStartNewEntryFromShortcut: true
    });
    const submitEvents = [new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      cancelable: true
    }), new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      cancelable: true
    })];
    const resetEvents = [new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      cancelable: true
    }), new KeyboardEvent('keydown', {
      key: 'n',
      metaKey: true,
      cancelable: true
    })];
    const channelEvents = [
      ['t', Channel.PHONE],
      ['e', Channel.EMAIL],
      ['c', Channel.COUNTER],
      ['v', Channel.VISIT]
    ] as const;

    submitEvents.forEach((event) => window.dispatchEvent(event));
    resetEvents.forEach((event) => window.dispatchEvent(event));
    channelEvents.forEach(([key]) => window.dispatchEvent(
      new KeyboardEvent('keydown', { key, cancelable: true })
    ));

    expect(requestSubmit).toHaveBeenCalledTimes(2);
    expect(onReset).toHaveBeenCalledTimes(2);
    expect(vi.mocked(setValue).mock.calls.map(([field, channel]) => [field, channel])).toEqual(
      channelEvents.map(([, channel]) => ['channel', channel])
    );
    submitEvents.forEach((event) => expect(event.defaultPrevented).toBe(true));
    resetEvents.forEach((event) => expect(event.defaultPrevented).toBe(true));
  });

  it('ne traite ni ne bloque les raccourcis metier quand le Cockpit est inactif', () => {
    const { onReset, requestSubmit, setValue } = setup({
      isActive: false,
      canStartNewEntryFromShortcut: true
    });
    const events = [
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, cancelable: true }),
      new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, cancelable: true }),
      ...['t', 'e', 'c', 'v'].map((key) => new KeyboardEvent('keydown', { key, cancelable: true }))
    ];

    events.forEach((event) => window.dispatchEvent(event));

    expect(requestSubmit).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
    expect(setValue).not.toHaveBeenCalled();
    events.forEach((event) => expect(event.defaultPrevented).toBe(false));
  });

  it('retire le traitement lors du rerender actif vers inactif', () => {
    const { rerender, requestSubmit } = setup({
      isActive: true,
      canStartNewEntryFromShortcut: true
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    expect(requestSubmit).toHaveBeenCalledTimes(1);

    rerender({ isActive: false, canStartNewEntryFromShortcut: true });
    const inactiveEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      cancelable: true
    });
    window.dispatchEvent(inactiveEvent);

    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(inactiveEvent.defaultPrevented).toBe(false);
  });

  it('ne reserve jamais F1 ou F2 au Cockpit', () => {
    setup({ isActive: true, canStartNewEntryFromShortcut: true });
    const events = ['F1', 'F2'].map((key) => new KeyboardEvent('keydown', { key, cancelable: true }));

    events.forEach((event) => window.dispatchEvent(event));

    events.forEach((event) => expect(event.defaultPrevented).toBe(false));
  });
});
