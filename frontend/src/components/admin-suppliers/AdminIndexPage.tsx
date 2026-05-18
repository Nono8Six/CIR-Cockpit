import AdminPanel from '@/components/AdminPanel';
import { useAppSessionStateContext } from '@/hooks/useAppSession';

const AdminIndexPage = () => {
  const sessionState = useAppSessionStateContext();
  const userRole = sessionState.profile?.role ?? 'tcs';

  return <AdminPanel userRole={userRole} />;
};

export default AdminIndexPage;
