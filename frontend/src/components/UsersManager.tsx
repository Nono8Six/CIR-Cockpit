import { useUsersManager } from '../hooks/admin/users/identity/useUsersManager';
import UsersManagerContent from './users/UsersManagerContent';
import UsersManagerDialogs from './users/UsersManagerDialogs';

const UsersManager = () => {
  const state = useUsersManager();

  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-testid="admin-users-panel">
      <UsersManagerContent state={state} />
      <UsersManagerDialogs state={state} />
    </div>
  );
};

export default UsersManager;
