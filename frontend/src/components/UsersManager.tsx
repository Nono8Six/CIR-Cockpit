import { useUsersManager } from '@/hooks/useUsersManager';
import UsersManagerContent from './users/UsersManagerContent';
import UsersManagerDialogs from './users/UsersManagerDialogs';

const UsersManager = () => {
  const state = useUsersManager();

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-5" data-testid="admin-users-panel">
      <UsersManagerContent state={state} />
      <UsersManagerDialogs state={state} />
    </div>
  );
};

export default UsersManager;
