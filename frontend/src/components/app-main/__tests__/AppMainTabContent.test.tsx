import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AppMainTabContent from '@/components/app-main/AppMainTabContent';
import type { AgencyConfig } from '@/services/config';

vi.mock('@/components/CockpitForm', () => ({
  default: () => <div data-cockpit-scroll-root data-testid="mock-cockpit-form">Cockpit</div>
}));
vi.mock('@/components/Dashboard', () => ({
  default: () => <div data-testid="mock-dashboard">Dashboard</div>
}));
vi.mock('@/components/Settings', () => ({
  default: () => <div data-testid="mock-settings">Settings</div>
}));
vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="mock-clients-panel">Clients</div>
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

describe('AppMainTabContent', () => {
  it('keeps visited tabs mounted without applying aria-hidden to inactive sections', async () => {
    const { rerender } = render(<AppMainTabContent {...baseProps} activeTab="cockpit" />);

    expect(await screen.findByTestId('mock-cockpit-form')).toBeInTheDocument();

    rerender(<AppMainTabContent {...baseProps} activeTab="clients" />);

    expect(await screen.findByTestId('mock-clients-panel')).toBeInTheDocument();

    const hiddenCockpitPanel = screen.getByTestId('app-main-tab-cockpit');
    const activeClientsPanel = screen.getByTestId('app-main-tab-clients');

    expect(hiddenCockpitPanel).toHaveAttribute('hidden');
    expect(hiddenCockpitPanel).not.toHaveAttribute('aria-hidden');
    expect(activeClientsPanel).not.toHaveAttribute('hidden');
    expect(activeClientsPanel).toHaveAttribute('data-state', 'active');
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
});
