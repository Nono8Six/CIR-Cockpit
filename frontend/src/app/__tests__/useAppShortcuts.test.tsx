import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAppShortcuts } from '@/app/useAppShortcuts';

type HarnessProps = {
  canAccessAdmin: boolean;
  canAccessSettings: boolean;
  setActiveTab: (tab: 'cockpit' | 'dashboard' | 'settings' | 'clients' | 'admin') => void;
  setIsSearchOpen: (open: boolean) => void;
};

const Harness = ({
  canAccessAdmin,
  canAccessSettings,
  setActiveTab,
  setIsSearchOpen
}: HarnessProps) => {
  useAppShortcuts({ canAccessAdmin, canAccessSettings, setActiveTab, setIsSearchOpen });
  return null;
};

describe('useAppShortcuts', () => {
  it('maps keyboard shortcuts to route tabs and search open/close', () => {
    const setActiveTab = vi.fn();
    const setIsSearchOpen = vi.fn();
    render(
      <Harness
        canAccessAdmin
        canAccessSettings
        setActiveTab={setActiveTab}
        setIsSearchOpen={setIsSearchOpen}
      />
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(setActiveTab).toHaveBeenCalledWith('cockpit');
    expect(setActiveTab).toHaveBeenCalledWith('dashboard');
    expect(setActiveTab).toHaveBeenCalledWith('settings');
    expect(setActiveTab).toHaveBeenCalledWith('admin');
    expect(setActiveTab).toHaveBeenCalledWith('clients');
    expect(setIsSearchOpen).toHaveBeenCalledWith(true);
    expect(setIsSearchOpen).toHaveBeenCalledWith(false);
  });

  it('blocks protected shortcuts when access is disabled', () => {
    const setActiveTab = vi.fn();
    const setIsSearchOpen = vi.fn();
    render(
      <Harness
        canAccessAdmin={false}
        canAccessSettings={false}
        setActiveTab={setActiveTab}
        setIsSearchOpen={setIsSearchOpen}
      />
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4' }));

    expect(setActiveTab).not.toHaveBeenCalledWith('settings');
    expect(setActiveTab).not.toHaveBeenCalledWith('admin');
  });
});
