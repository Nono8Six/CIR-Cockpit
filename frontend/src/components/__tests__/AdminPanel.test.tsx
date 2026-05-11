import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminPanel from '@/components/AdminPanel';
import AgenciesManagerSearch from '@/components/agencies/AgenciesManagerSearch';
import UsersManagerSearch from '@/components/users/UsersManagerSearch';

vi.mock('@/components/ErrorJournalExport', () => ({
  default: () => <div data-testid="mock-error-journal-export" />
}));
vi.mock('@/components/AuditLogsPanel', () => ({
  default: () => <div data-testid="mock-audit-logs-panel" />
}));
vi.mock('@/components/UsersManager', () => ({
  default: () => (
    <UsersManagerSearch searchTerm="" onSearchTermChange={() => undefined} />
  )
}));
vi.mock('@/components/AgenciesManager', () => ({
  default: () => (
    <AgenciesManagerSearch value="" onChange={() => undefined} />
  )
}));

describe('AdminPanel', () => {
  it('keeps every admin tab in a bounded scrollable flex chain', () => {
    render(<AdminPanel userRole="super_admin" />);

    expect(screen.getByTestId('admin-panel')).toHaveClass('h-full', 'min-h-0', 'overflow-hidden');
    expect(screen.getByTestId('admin-tabs-root')).toHaveClass('min-h-0', 'flex-1', 'flex-col');
    expect(screen.getByTestId('admin-tabs-list')).toHaveClass('shrink-0');
    expect(screen.getByTestId('admin-tab-panel-users')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(screen.getByTestId('admin-tab-panel-agencies')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(screen.getByTestId('admin-tab-panel-audit')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
  });

  it('keeps audit logs scrollable for non super-admin users', () => {
    render(<AdminPanel userRole="agency_admin" />);

    expect(screen.getByTestId('admin-panel')).toHaveClass('h-full', 'min-h-0', 'overflow-y-auto');
  });

  it('exposes named and labelled admin search inputs', async () => {
    const user = userEvent.setup();
    render(<AdminPanel userRole="super_admin" />);

    expect(screen.getByLabelText('Rechercher un utilisateur')).toHaveAttribute('name', 'admin-users-search');

    await user.click(screen.getByTestId('admin-tab-agencies'));

    expect(screen.getByLabelText('Rechercher une agence')).toHaveAttribute('name', 'admin-agencies-search');
  });
});
