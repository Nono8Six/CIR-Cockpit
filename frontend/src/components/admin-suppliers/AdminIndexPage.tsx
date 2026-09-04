import { useNavigate, useSearch } from '@tanstack/react-router';
import AdminPanel from '@/components/AdminPanel';
import { useAppSessionStateContext } from '../../hooks/session/useAppSession';
import type { AdminAiViewId, AdminPanelId, AdminSearchState } from '@/app/router';

const AdminIndexPage = () => {
  const sessionState = useAppSessionStateContext();
  const userRole = sessionState.profile?.role ?? 'tcs';
  const search = useSearch({ strict: false }) as AdminSearchState | undefined;
  const navigate = useNavigate();

  const handleNavigateAdmin = (panel: AdminPanelId, view?: AdminAiViewId) => {
    void navigate({
      to: '/admin',
      search: () => ({
        panel,
        ...(panel === 'ai' && view ? { view } : {})
      }),
      replace: true
    });
  };

  return (
    <AdminPanel
      userRole={userRole}
      panel={search?.panel}
      view={search?.view}
      onNavigateAdmin={handleNavigateAdmin}
    />
  );
};

export default AdminIndexPage;
