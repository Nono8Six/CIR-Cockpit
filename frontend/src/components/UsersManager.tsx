import { useUsersManager } from '../hooks/admin/users/identity/useUsersManager';
import UsersManagerContent from './users/UsersManagerContent';
import UsersManagerDialogs from './users/UsersManagerDialogs';

const UsersManager = () => {
  const state = useUsersManager();

  return (
    <div className="space-y-6 pb-6 w-full" data-testid="admin-users-panel">
      <UsersManagerContent state={state} />
      <UsersManagerDialogs state={state} />
    </div>
  );
};

export default UsersManager;
