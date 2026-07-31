import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';

import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import UsersManagerList from '../UsersManagerList';
import UserRoleChangeDialog from '../UserRoleChangeDialog';

const user1: AdminUserSummary = {
  id: 'user-1',
  email: 'a.ferron-tcs@cir.fr',
  display_name: 'FERRON Arnaud',
  first_name: 'Arnaud',
  last_name: 'FERRON',
  role: 'tcs',
  archived_at: null,
  created_at: '2026-01-01T10:00:00.000Z',
  memberships: [{ agency_id: 'ag-1', agency_name: 'CIR Paris' }]
};

const buildQuery = (overrides: Partial<UseQueryResult<AdminUserSummary[]>> = {}) =>
  ({
    data: [user1],
    isLoading: false,
    isError: false,
    ...overrides
  }) as UseQueryResult<AdminUserSummary[]>;

const renderList = (
  props: Partial<React.ComponentProps<typeof UsersManagerList>> = {}
) => {
  const handlers = {
    onRetry: vi.fn(),
    onResetPassword: vi.fn(),
    onArchiveToggle: vi.fn(),
    onChangeRole: vi.fn(),
    onEditMemberships: vi.fn(),
    onEditIdentity: vi.fn(),
    onDeleteUser: vi.fn(),
    onSelectToggle: vi.fn(),
    onSelectAllToggle: vi.fn()
  };
  render(
    <UsersManagerList
      usersQuery={buildQuery()}
      users={[user1]}
      selectedUserIds={[]}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe('UsersManagerList', () => {
  it('ne laisse qu une seule voie d action par ligne', () => {
    renderList();

    const row = screen.getByTestId('admin-user-row-user-1');
    // Une seule commande dans la ligne : le menu. Ni select de role, ni bouton
    // « Modifier » dans la cellule Agences.
    expect(within(row).getAllByRole('button')).toHaveLength(1);
    expect(within(row).getByLabelText('Actions pour a.ferron-tcs@cir.fr')).toBeInTheDocument();
    expect(within(row).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  });

  it('passe le changement de role par le menu et jamais par la ligne', async () => {
    const handlers = renderList();

    const row = screen.getByTestId('admin-user-row-user-1');
    await userEvent.click(within(row).getByLabelText('Actions pour a.ferron-tcs@cir.fr'));
    await userEvent.click(await screen.findByText('Modifier le rôle'));

    // Le menu ouvre la confirmation, il n'applique aucun role lui-meme.
    expect(handlers.onChangeRole).toHaveBeenCalledWith(user1);
  });

  it('traite les etats chargement, erreur et vide', () => {
    const { rerender } = render(
      <UsersManagerList
        usersQuery={buildQuery({ isLoading: true, data: undefined })}
        users={[]}
        selectedUserIds={[]}
        onRetry={vi.fn()}
        onResetPassword={vi.fn()}
        onArchiveToggle={vi.fn()}
        onChangeRole={vi.fn()}
        onEditMemberships={vi.fn()}
        onEditIdentity={vi.fn()}
        onDeleteUser={vi.fn()}
        onSelectToggle={vi.fn()}
        onSelectAllToggle={vi.fn()}
      />
    );
    expect(screen.getByText('Chargement des utilisateurs en cours…')).toBeInTheDocument();

    const commonProps = {
      users: [],
      selectedUserIds: [],
      onRetry: vi.fn(),
      onResetPassword: vi.fn(),
      onArchiveToggle: vi.fn(),
      onChangeRole: vi.fn(),
      onEditMemberships: vi.fn(),
      onEditIdentity: vi.fn(),
      onDeleteUser: vi.fn(),
      onSelectToggle: vi.fn(),
      onSelectAllToggle: vi.fn()
    };

    rerender(
      <UsersManagerList
        usersQuery={buildQuery({ isError: true, data: undefined })}
        {...commonProps}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La liste des utilisateurs est temporairement indisponible.'
    );

    rerender(<UsersManagerList usersQuery={buildQuery({ data: [] })} {...commonProps} />);
    expect(
      screen.getByText('Aucun utilisateur ne correspond à votre recherche.')
    ).toBeInTheDocument();
  });
});

describe('UserRoleChangeDialog', () => {
  it('nomme l utilisateur, les deux roles et ce que le nouveau autorise', () => {
    render(<UserRoleChangeDialog user={user1} onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(
      screen.getByText('Modifier le rôle de FERRON Arnaud')
    ).toBeInTheDocument();
    expect(
      screen.getByText('FERRON Arnaud (a.ferron-tcs@cir.fr) est actuellement TCS.')
    ).toBeInTheDocument();
    // Tant que le role n'a pas change, la confirmation reste inerte.
    expect(screen.getByTestId('admin-user-role-confirm')).toBeDisabled();
  });
});
