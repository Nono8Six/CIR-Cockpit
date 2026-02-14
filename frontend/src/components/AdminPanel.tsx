import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import UsersManager from './UsersManager';
import AgenciesManager from './AgenciesManager';
import AuditLogsPanel from './AuditLogsPanel';
import ErrorJournalExport from './ErrorJournalExport';
import { UserRole } from '@/types';

interface AdminPanelProps {
  userRole: UserRole;
}

const AdminPanel = ({ userRole }: AdminPanelProps) => {
  if (userRole !== 'super_admin') {
    return (
      <div className="h-full" data-testid="admin-panel">
        <AuditLogsPanel userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4" data-testid="admin-panel">
      <ErrorJournalExport />
      <Tabs defaultValue="users" data-testid="admin-tabs-root">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-md bg-slate-100 p-1" data-testid="admin-tabs-list">
          <TabsTrigger value="users" className="text-xs sm:text-sm" data-testid="admin-tab-users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="agencies" className="text-xs sm:text-sm" data-testid="admin-tab-agencies">Agences</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm" data-testid="admin-tab-audit">Audit logs</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-3" data-testid="admin-tab-panel-users">
          <UsersManager />
        </TabsContent>
        <TabsContent value="agencies" className="mt-3" data-testid="admin-tab-panel-agencies">
          <AgenciesManager />
        </TabsContent>
        <TabsContent value="audit" className="mt-3" data-testid="admin-tab-panel-audit">
          <AuditLogsPanel userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
