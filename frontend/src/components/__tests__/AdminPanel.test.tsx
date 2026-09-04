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
vi.mock('@/components/admin-ai/AdminAiPanel', () => ({
  default: () => <div data-testid="mock-admin-ai-panel">Gestion IA Panel</div>
}));

describe('AdminPanel', () => {
  it('keeps every admin tab in a bounded scrollable flex chain', () => {
    render(<AdminPanel userRole="super_admin" />);

    expect(screen.getByTestId('admin-panel')).toHaveClass('h-full', 'min-h-0', 'overflow-hidden');
    expect(screen.getByTestId('admin-tabs-root')).toHaveClass('min-h-0', 'flex-1', 'flex-col');
    expect(screen.getByTestId('admin-tabs-list')).toHaveClass('shrink-0');
    // Onglet Utilisateurs : le scroll est descendu dans la table, qui s'etire
    // jusqu'au bas de la fenetre ; le panneau reste une colonne flex bornee.
    expect(screen.getByTestId('admin-tab-panel-users')).toHaveClass('min-h-0', 'flex-1', 'flex-col', 'overflow-hidden');
    expect(screen.getByTestId('admin-tab-panel-agencies')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(screen.getByTestId('admin-tab-panel-audit')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
  });

  it('keeps audit logs scrollable for non super-admin users', () => {
    render(<AdminPanel userRole="agency_admin" />);

    expect(screen.getByTestId('admin-panel')).toHaveClass('h-full', 'min-h-0', 'overflow-y-auto');
  });

  it('keeps agency admins focused on audit logs without super-admin management tabs', () => {
    render(<AdminPanel userRole="agency_admin" />);

    expect(screen.queryByRole('link', { name: /fournisseurs/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-tab-users')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-tab-agencies')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-audit-logs-panel')).toBeInTheDocument();
  });

  it('exposes named and labelled admin search inputs', async () => {
    const user = userEvent.setup();
    render(<AdminPanel userRole="super_admin" />);

    expect(screen.getByLabelText('Rechercher un utilisateur')).toHaveAttribute('name', 'admin-users-search');

    await user.click(screen.getByTestId('admin-tab-agencies'));

    expect(screen.getByLabelText('Rechercher une agence')).toHaveAttribute('name', 'admin-agencies-search');
  });

  it('expose l’onglet Gestion IA avec le bon nom accessible et supporte la navigation par panel', async () => {
    const user = userEvent.setup();
    const onNavigateAdmin = vi.fn();
    render(<AdminPanel userRole="super_admin" panel="ai" onNavigateAdmin={onNavigateAdmin} />);

    const aiTab = screen.getByRole('tab', { name: /gestion ia/i });
    expect(aiTab).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /utilisateurs/i }));
    expect(onNavigateAdmin).toHaveBeenCalledWith('users', undefined);
  });

  it('synchronise l’onglet actif lorsque la route change sans remontage', () => {
    const { rerender } = render(<AdminPanel userRole="super_admin" panel="users" />);

    expect(screen.getByRole('tab', { name: /utilisateurs/i })).toHaveAttribute('data-state', 'active');

    rerender(<AdminPanel userRole="super_admin" panel="ai" />);

    expect(screen.getByRole('tab', { name: /gestion ia/i })).toHaveAttribute('data-state', 'active');
  });
});
