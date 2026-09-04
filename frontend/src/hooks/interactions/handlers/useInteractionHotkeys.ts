import { useEffect, type RefObject } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import { Channel } from '@/types';
import type { InteractionFormValues } from '../../../../../shared/schemas/interaction/interaction.schema';

type InteractionHotkeysInput = {
  isActive: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  setValue: UseFormSetValue<InteractionFormValues>;
  onReset: () => void;
  canStartNewEntryFromShortcut: boolean;
};

const CHANNEL_HOTKEYS: Record<string, Channel> = {
  t: Channel.PHONE,
  e: Channel.EMAIL,
  c: Channel.COUNTER,
  v: Channel.VISIT
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
};

export const useInteractionHotkeys = ({
  isActive,
  formRef,
  setValue,
  onReset,
  canStartNewEntryFromShortcut
}: InteractionHotkeysInput) => {
  useEffect(() => {
    if (!isActive) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'enter') {
          e.preventDefault();
          formRef.current?.requestSubmit();
          return;
        }
        if (key === 'n') {
          if (!canStartNewEntryFromShortcut) return;
          e.preventDefault();
          onReset();
          return;
        }
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const channel = CHANNEL_HOTKEYS[e.key.toLowerCase()];
      if (!channel) return;
      e.preventDefault();
      setValue('channel', channel, { shouldDirty: true, shouldValidate: true });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canStartNewEntryFromShortcut, formRef, isActive, onReset, setValue]);
};
