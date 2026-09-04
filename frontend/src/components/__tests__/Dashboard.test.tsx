import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDashboardKeyboardShortcuts } from '@/hooks/dashboard-state/useDashboardKeyboardShortcuts';
import type { Interaction } from '@/types';

const dashboardSpies = vi.hoisted(() => ({
  setActiveInteractionId: vi.fn(),
  openInteraction: vi.fn(),
  handleRequestDeleteInteraction: vi.fn()
}));

const interaction = {
  id: 'interaction-1'
} as Interaction;

const DashboardKeyboardHarness = ({ isActive }: { isActive: boolean }) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  useDashboardKeyboardShortcuts({
    isActive,
    searchInputRef,
    tableRows: [{ interaction }],
    activeInteractionId: interaction.id,
    setActiveInteractionId: dashboardSpies.setActiveInteractionId,
    onOpenInteraction: dashboardSpies.openInteraction,
    onRequestDeleteInteraction: dashboardSpies.handleRequestDeleteInteraction
  });

  return <input ref={searchInputRef} aria-label="Recherche Pilotage" />;
};

describe('Dashboard keyboard isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conserve les raccourcis actifs puis les retire au passage vers une autre vue', () => {
    const view = render(<DashboardKeyboardHarness isActive />);
    const searchInput = screen.getByRole('textbox', { name: /recherche pilotage/i });

    fireEvent.keyDown(window, { key: '/' });
    expect(searchInput).toHaveFocus();

    searchInput.blur();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'o' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    fireEvent.keyDown(window, { key: 'Delete' });

    expect(dashboardSpies.setActiveInteractionId).toHaveBeenCalledTimes(2);
    expect(dashboardSpies.openInteraction).toHaveBeenCalledTimes(2);
    expect(dashboardSpies.handleRequestDeleteInteraction).toHaveBeenCalledTimes(2);

    view.rerender(<DashboardKeyboardHarness isActive={false} />);
    searchInput.blur();
    dashboardSpies.setActiveInteractionId.mockClear();
    dashboardSpies.openInteraction.mockClear();
    dashboardSpies.handleRequestDeleteInteraction.mockClear();

    const inactiveEvents = ['/', 'ArrowDown', 'ArrowUp', 'Enter', 'o', 'Backspace', 'Delete']
      .map((key) => new KeyboardEvent('keydown', { key, cancelable: true }));
    inactiveEvents.forEach((event) => window.dispatchEvent(event));

    expect(searchInput).not.toHaveFocus();
    expect(dashboardSpies.setActiveInteractionId).not.toHaveBeenCalled();
    expect(dashboardSpies.openInteraction).not.toHaveBeenCalled();
    expect(dashboardSpies.handleRequestDeleteInteraction).not.toHaveBeenCalled();
    inactiveEvents.forEach((event) => expect(event.defaultPrevented).toBe(false));
  });
});
