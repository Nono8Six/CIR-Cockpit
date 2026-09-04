import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';

import type { Interaction } from '@/types';

type DashboardKeyboardRow = {
  interaction: Interaction;
};

type UseDashboardKeyboardShortcutsParams = {
  isActive: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  tableRows: DashboardKeyboardRow[];
  activeInteractionId: string | null;
  setActiveInteractionId: Dispatch<SetStateAction<string | null>>;
  onOpenInteraction: (interaction: Interaction) => void;
  onRequestDeleteInteraction: (interaction: Interaction) => void;
};

export const useDashboardKeyboardShortcuts = ({
  isActive,
  searchInputRef,
  tableRows,
  activeInteractionId,
  setActiveInteractionId,
  onOpenInteraction,
  onRequestDeleteInteraction
}: UseDashboardKeyboardShortcutsParams) => {
  useEffect(() => {
    if (!isActive) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;

      if (
        activeEl instanceof HTMLInputElement
        || activeEl instanceof HTMLTextAreaElement
        || (activeEl as HTMLElement)?.isContentEditable
        || activeEl?.closest('[role="dialog"]')
        || activeEl?.closest('[role="menu"]')
      ) {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (tableRows.length === 0) return;
        event.preventDefault();
        const currentIndex = tableRows.findIndex((row) => row.interaction.id === activeInteractionId);
        const nextIndex = event.key === 'ArrowDown'
          ? currentIndex === -1 ? 0 : Math.min(currentIndex + 1, tableRows.length - 1)
          : currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        setActiveInteractionId(tableRows[nextIndex]?.interaction.id ?? null);
        return;
      }

      if (activeInteractionId && (event.key === 'Enter' || event.key.toLowerCase() === 'o')) {
        event.preventDefault();
        const activeRow = tableRows.find((row) => row.interaction.id === activeInteractionId);
        if (activeRow) {
          onOpenInteraction(activeRow.interaction);
        }
        return;
      }

      if (activeInteractionId && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        const activeRow = tableRows.find((row) => row.interaction.id === activeInteractionId);
        if (activeRow) {
          onRequestDeleteInteraction(activeRow.interaction);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeInteractionId,
    isActive,
    onOpenInteraction,
    onRequestDeleteInteraction,
    searchInputRef,
    setActiveInteractionId,
    tableRows
  ]);
};
