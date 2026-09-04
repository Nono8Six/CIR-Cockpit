import { useCallback, useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppShortcuts } from '@/app/useAppShortcuts';
import AppMainTabContent from '@/components/app-main/AppMainTabContent';
import { useDashboardKeyboardShortcuts } from '@/hooks/dashboard-state/useDashboardKeyboardShortcuts';
import { useInteractionHotkeys } from '@/hooks/interactions/handlers/useInteractionHotkeys';
import type { AgencyConfig } from '@/services/config';
import type { AppTab, Interaction } from '@/types';

const keyboardSpies = vi.hoisted(() => ({
  cockpitSubmit: vi.fn(),
  cockpitReset: vi.fn(),
  cockpitSetValue: vi.fn(),
  dashboardOpen: vi.fn(),
  dashboardDelete: vi.fn(),
  shellNavigate: vi.fn()
}));

vi.mock('@/components/CockpitForm', () => ({
  default: function MockCockpitForm({ isActive }: { isActive: boolean }) {
    const [draft, setDraft] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    useInteractionHotkeys({
      isActive,
      formRef,
      setValue: keyboardSpies.cockpitSetValue,
      onReset: keyboardSpies.cockpitReset,
      canStartNewEntryFromShortcut: true
    });

    return (
      <form
        ref={formRef}
        data-cockpit-scroll-root
        data-testid="mock-cockpit-form"
        data-active={isActive}
        onSubmit={(event) => {
          event.preventDefault();
          keyboardSpies.cockpitSubmit();
        }}
      >
        <input
          aria-label="Brouillon Cockpit"
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
      </form>
    );
  }
}));
vi.mock('@/components/Dashboard', () => ({
  default: function MockDashboard({ isActive }: { isActive: boolean }) {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
    const interaction = { id: 'interaction-1' } as Interaction;
    useDashboardKeyboardShortcuts({
      isActive,
      searchInputRef,
      tableRows: [{ interaction }],
      activeInteractionId,
      setActiveInteractionId,
      onOpenInteraction: keyboardSpies.dashboardOpen,
      onRequestDeleteInteraction: keyboardSpies.dashboardDelete
    });

    return (
      <input
        ref={searchInputRef}
        aria-label="Recherche Pilotage"
        data-testid="mock-dashboard"
        data-active={isActive}
      />
    );
  }
}));
vi.mock('@/components/tasks/TasksPage', () => ({
  default: () => <button type="button" data-testid="mock-tasks">Tâches</button>
}));
vi.mock('@/components/Settings', () => ({
  default: () => <div data-testid="mock-settings">Settings</div>
}));
vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="mock-clients-panel">Clients</div>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({})
}));
vi.mock('@/components/AdminPanel', () => ({
  default: () => <div data-testid="mock-admin-panel">Admin</div>
}));

const config: AgencyConfig = {
  statuses: [],
  historicalStatuses: [],
  services: [],
  families: [],
  interactionTypes: []
};

const baseProps = {
  activeAgencyId: 'agency-1',
  config,
  interactions: [],
  userId: 'user-1',
  userRole: 'agency_admin' as const,
  recentEntities: [],
  entitySearchIndex: { entities: [], contacts: [] },
  entitySearchLoading: false,
  canAccessSettings: true,
  canEditAgencySettings: true,
  canAccessAdmin: true,
  focusedClientId: null,
  focusedContactId: null,
  onFocusHandled: () => undefined,
  onSaveInteraction: async () => true,
  onRequestConvert: () => undefined,
  onOpenGlobalSearch: () => undefined
};

const KeyboardNavigationHarness = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('cockpit');
  const setActiveTabFromShortcut = useCallback((tab: AppTab) => {
    keyboardSpies.shellNavigate(tab);
    setActiveTab(tab);
  }, []);
  useAppShortcuts({
    canAccessAdmin: true,
    canAccessSettings: true,
    setActiveTab: setActiveTabFromShortcut,
    setIsSearchOpen: vi.fn()
  });

  return <AppMainTabContent {...baseProps} activeTab={activeTab} />;
};

describe('AppMainTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conserve Cockpit et Pilotage après navigation, puis rend les vues inactives hidden et inert', async () => {
    const { rerender } = render(<AppMainTabContent {...baseProps} activeTab="cockpit" />);

    expect(await screen.findByTestId('mock-cockpit-form')).toHaveAttribute('data-active', 'true');
    fireEvent.change(screen.getByRole('textbox', { name: /brouillon cockpit/i }), {
      target: { value: 'Brouillon conservé' }
    });

    rerender(<AppMainTabContent {...baseProps} activeTab="dashboard" />);

    expect(await screen.findByTestId('mock-dashboard')).toHaveAttribute('data-active', 'true');

    rerender(<AppMainTabContent {...baseProps} activeTab="tasks" />);

    expect(await screen.findByTestId('mock-tasks')).toBeInTheDocument();
    expect(screen.getByTestId('mock-cockpit-form')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('mock-dashboard')).toHaveAttribute('data-active', 'false');
    expect(screen.queryByRole('textbox', { name: /brouillon cockpit/i })).not.toBeInTheDocument();

    const hiddenCockpitPanel = screen.getByTestId('app-main-tab-cockpit');
    const hiddenDashboardPanel = screen.getByTestId('app-main-tab-dashboard');
    const activeTasksPanel = screen.getByTestId('app-main-tab-tasks');

    expect(hiddenCockpitPanel).toHaveAttribute('hidden');
    expect(hiddenCockpitPanel).toHaveAttribute('inert');
    expect(hiddenCockpitPanel).not.toHaveAttribute('aria-hidden');
    expect(hiddenCockpitPanel.querySelector('input[aria-label="Brouillon Cockpit"]'))
      .toHaveValue('Brouillon conservé');
    expect(hiddenDashboardPanel).toHaveAttribute('hidden');
    expect(hiddenDashboardPanel).toHaveAttribute('inert');
    expect(activeTasksPanel).not.toHaveAttribute('hidden');
    expect(activeTasksPanel).not.toHaveAttribute('inert');
    expect(activeTasksPanel).toHaveAttribute('data-state', 'active');
  });

  it('keeps routed tabs mounted without applying aria-hidden to inactive sections', async () => {
    const { rerender } = render(<AppMainTabContent {...baseProps} activeTab="cockpit" />);

    expect(await screen.findByTestId('mock-cockpit-form')).toBeInTheDocument();

    rerender(<AppMainTabContent {...baseProps} activeTab="clients" />);

    expect(await screen.findByTestId('mock-clients-panel')).toBeInTheDocument();

    const hiddenCockpitPanel = screen.getByTestId('app-main-tab-cockpit');
    const activeClientsPanel = screen.getByTestId('app-main-tab-clients');

    expect(hiddenCockpitPanel).toHaveAttribute('hidden');
    expect(hiddenCockpitPanel).toHaveAttribute('inert');
    expect(hiddenCockpitPanel).not.toHaveAttribute('aria-hidden');
    expect(activeClientsPanel).not.toHaveAttribute('hidden');
    expect(activeClientsPanel).not.toHaveAttribute('inert');
    expect(activeClientsPanel).toHaveAttribute('data-state', 'active');
  });

  it('renders the routed suppliers panel for authorized users', async () => {
    render(<AppMainTabContent {...baseProps} activeTab="suppliers" />);

    expect(await screen.findByTestId('mock-clients-panel')).toBeInTheDocument();
    expect(screen.getByTestId('app-main-tab-suppliers')).toHaveAttribute('data-state', 'active');
  });

  it('does not render suppliers when admin access is unavailable', () => {
    render(<AppMainTabContent {...baseProps} activeTab="suppliers" canAccessAdmin={false} />);

    expect(screen.queryByTestId('app-main-tab-suppliers')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-clients-panel')).not.toBeInTheDocument();
  });

  it('resets the cockpit scroll position when returning to the cockpit tab', async () => {
    const { rerender } = render(<AppMainTabContent {...baseProps} activeTab="cockpit" />);
    const cockpitScrollRoot = await screen.findByTestId('mock-cockpit-form');

    cockpitScrollRoot.scrollTo = vi.fn(({ top }) => {
      cockpitScrollRoot.scrollTop = Number(top);
    });
    cockpitScrollRoot.scrollTop = 240;

    rerender(<AppMainTabContent {...baseProps} activeTab="clients" />);
    rerender(<AppMainTabContent {...baseProps} activeTab="cockpit" />);

    expect(cockpitScrollRoot.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
    expect(cockpitScrollRoot.scrollTop).toBe(0);
  });

  it('ne laisse agir que les raccourcis de la vue visible après Cockpit, Pilotage puis Tâches', async () => {
    render(<KeyboardNavigationHarness />);
    expect(await screen.findByTestId('mock-cockpit-form')).toHaveAttribute('data-active', 'true');

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    fireEvent.keyDown(window, { key: 't' });
    expect(keyboardSpies.cockpitSubmit).toHaveBeenCalledTimes(1);
    expect(keyboardSpies.cockpitReset).toHaveBeenCalledTimes(1);
    expect(keyboardSpies.cockpitSetValue).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'F4' });
    expect(await screen.findByTestId('mock-dashboard')).toHaveAttribute('data-active', 'true');
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 't' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(keyboardSpies.cockpitSubmit).toHaveBeenCalledTimes(1);
    expect(keyboardSpies.cockpitSetValue).toHaveBeenCalledTimes(1);
    expect(keyboardSpies.dashboardOpen).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'F9' });
    expect(await screen.findByTestId('mock-tasks')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 't' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Delete' });

    expect(keyboardSpies.cockpitSubmit).toHaveBeenCalledTimes(1);
    expect(keyboardSpies.cockpitSetValue).toHaveBeenCalledTimes(1);
    expect(keyboardSpies.dashboardOpen).toHaveBeenCalledTimes(1);
    expect(keyboardSpies.dashboardDelete).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'F1' });
    fireEvent.keyDown(window, { key: 'F2' });
    expect(keyboardSpies.shellNavigate.mock.calls.filter(([tab]) => tab === 'clients')).toHaveLength(1);
    expect(keyboardSpies.shellNavigate.mock.calls.filter(([tab]) => tab === 'suppliers')).toHaveLength(1);
  });
});
