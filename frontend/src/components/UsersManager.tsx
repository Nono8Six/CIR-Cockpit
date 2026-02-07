import { useUsersManager } from '@/hooks/useUsersManager';
import UsersManagerContent from './users/UsersManagerContent';
import UsersManagerDialogs from './users/UsersManagerDialogs';

const UsersManager = () => {
  const state = useUsersManager();

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
      <UsersManagerContent state={state} />
      <UsersManagerDialogs state={state} />
    </div>
  );
};

export default UsersManager;
