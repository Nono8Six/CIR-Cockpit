import { Archive, ArchiveRestore, Trash2, X } from 'lucide-react';
import type { useUsersManager } from '../../hooks/admin/users/identity/useUsersManager';
import { Button } from '../ui/inputs/basic/Button';
import UsersManagerHeader from './UsersManagerHeader';
import UsersManagerList from './UsersManagerList';
import UsersManagerSearch from './UsersManagerSearch';

type UsersManagerState = ReturnType<typeof useUsersManager>;

type UsersManagerContentProps = {
  state: UsersManagerState;
};

const UsersManagerContent = ({ state }: UsersManagerContentProps) => {
  const {
    searchTerm,
    setSearchTerm,
    showArchived,
    setShowArchived,
    setCreateOpen,
    usersQuery,
    filteredUsers,
    handleResetPassword,
    handleArchiveToggle,
    openRoleChangeDialog,
    openMembershipDialog,
    openEditIdentityDialog,
    handleDeleteUser,
    selectedUserIds,
    toggleSelectUser,
    toggleSelectAll,
    clearSelection,
    handleBulkDelete,
    handleBulkArchive
  } = state;

  const allUsers = usersQuery.data ?? [];
  const countsReady = !usersQuery.isLoading && !usersQuery.isError;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <UsersManagerHeader
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((prev) => !prev)}
        onOpenCreate={() => setCreateOpen(true)}
        totalCount={allUsers.length}
        activeCount={allUsers.filter((user) => !user.archived_at).length}
        archivedCount={allUsers.filter((user) => !!user.archived_at).length}
        countsReady={countsReady}
      />

      <UsersManagerSearch searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />

      <UsersManagerList
        usersQuery={usersQuery}
        users={filteredUsers}
        onRetry={() => {
          void usersQuery.refetch();
        }}
        onResetPassword={handleResetPassword}
        onArchiveToggle={handleArchiveToggle}
        onChangeRole={openRoleChangeDialog}
        onEditMemberships={openMembershipDialog}
        onEditIdentity={openEditIdentityDialog}
        onDeleteUser={handleDeleteUser}
        selectedUserIds={selectedUserIds}
        onSelectToggle={toggleSelectUser}
        onSelectAllToggle={toggleSelectAll}
      />

      {/* Destination de la selection multiple : barre d'actions groupees. */}
      {selectedUserIds.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 duration-200 animate-in fade-in slide-in-from-bottom-3"
          data-testid="admin-users-bulk-bar"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border-subtle bg-background/95 px-3 py-2 shadow-soft backdrop-blur">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {selectedUserIds.length} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
            </span>
            <span className="h-4 w-px bg-border-subtle" aria-hidden="true" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-md px-2.5 text-[11px] shadow-none"
              onClick={() => handleBulkArchive(selectedUserIds, !showArchived)}
            >
              {showArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
              {showArchived ? 'Restaurer' : 'Archiver'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-7 gap-1.5 rounded-md px-2.5 text-[11px]"
              onClick={() => handleBulkDelete(selectedUserIds)}
            >
              <Trash2 size={13} />
              Supprimer
            </Button>
            <span className="h-4 w-px bg-border-subtle" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-md p-0"
              onClick={clearSelection}
              aria-label="Annuler la sélection"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagerContent;
