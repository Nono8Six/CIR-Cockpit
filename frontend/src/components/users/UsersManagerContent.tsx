import { Users, UserCheck, UserMinus, Archive, ArchiveRestore, Trash2, X } from 'lucide-react';
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
    handleRoleChange,
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

  return (
    <div className="flex flex-col gap-6">
      <UsersManagerHeader
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((prev) => !prev)}
        onOpenCreate={() => setCreateOpen(true)}
      />

      {/* Statistiques rapides */}
      {!usersQuery.isLoading && !usersQuery.isError && usersQuery.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="group rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:border-border/80 transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Total</span>
              <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {usersQuery.data.length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/30 text-muted-foreground/80 group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300">
              <Users size={20} />
            </div>
          </div>
          <div className="group rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:border-success/30 transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Actifs</span>
              <span className="text-2xl font-bold tracking-tight text-success font-mono">
                {usersQuery.data.filter((u) => !u.archived_at).length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-success/10 text-success group-hover:bg-success/20 transition-colors duration-300">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="group rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:border-warning/30 transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Archivés</span>
              <span className="text-2xl font-bold tracking-tight text-warning font-mono">
                {usersQuery.data.filter((u) => !!u.archived_at).length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning group-hover:bg-warning/20 transition-colors duration-300">
              <UserMinus size={20} />
            </div>
          </div>
        </div>
      )}

      <UsersManagerSearch
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      <UsersManagerList
        usersQuery={usersQuery}
        users={filteredUsers}
        onRetry={() => {
          void usersQuery.refetch();
        }}
        onResetPassword={handleResetPassword}
        onArchiveToggle={handleArchiveToggle}
        onRoleChange={handleRoleChange}
        onEditMemberships={openMembershipDialog}
        onEditIdentity={openEditIdentityDialog}
        onDeleteUser={handleDeleteUser}
        selectedUserIds={selectedUserIds}
        onSelectToggle={toggleSelectUser}
        onSelectAllToggle={toggleSelectAll}
      />

      {/* Floating Bulk Actions Bar */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[450px] md:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between gap-3 sm:gap-6 rounded-2xl border border-border/50 bg-background/85 backdrop-blur-md px-4 sm:px-6 py-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary font-mono">
                {selectedUserIds.length}
              </span>
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden sm:inline">
                sélectionné{selectedUserIds.length > 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="h-5 w-[1px] bg-border/50 hidden sm:block" />

            <div className="flex items-center gap-2">
              {!showArchived ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkArchive(selectedUserIds, true)}
                  className="inline-flex items-center gap-1.5 h-8.5 rounded-xl text-warning hover:bg-warning/10 hover:text-warning hover:border-warning/30 border-warning/10 bg-warning/5 font-semibold text-xs transition-colors"
                >
                  <Archive size={14} />
                  <span>Archiver</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkArchive(selectedUserIds, false)}
                  className="inline-flex items-center gap-1.5 h-8.5 rounded-xl text-success hover:bg-success/10 hover:text-success hover:border-success/30 border-success/10 bg-success/5 font-semibold text-xs transition-colors"
                >
                  <ArchiveRestore size={14} />
                  <span>Restaurer</span>
                </Button>
              )}

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleBulkDelete(selectedUserIds)}
                className="inline-flex items-center gap-1.5 h-8.5 rounded-xl font-semibold text-xs"
              >
                <Trash2 size={14} />
                <span>Supprimer</span>
              </Button>
            </div>

            <div className="h-5 w-[1px] bg-border/50" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 w-8 p-0 rounded-full hover:bg-muted"
              aria-label="Annuler la sélection"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagerContent;
