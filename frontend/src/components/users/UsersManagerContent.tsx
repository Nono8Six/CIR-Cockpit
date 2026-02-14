import type { useUsersManager } from '@/hooks/useUsersManager';
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
    openMembershipDialog
  } = state;

  return (
    <>
      <UsersManagerHeader
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((prev) => !prev)}
        onOpenCreate={() => setCreateOpen(true)}
      />

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
      />
    </>
  );
};

export default UsersManagerContent;
