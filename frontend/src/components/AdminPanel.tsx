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
      <div className="h-full min-h-0 overflow-y-auto pr-1" data-testid="admin-panel">
        <AuditLogsPanel userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden" data-testid="admin-panel">
      <ErrorJournalExport />
      <Tabs defaultValue="users" className="flex min-h-0 flex-1 flex-col" data-testid="admin-tabs-root">
        <TabsList className="flex h-auto w-full shrink-0 flex-wrap gap-1 rounded-md bg-muted p-1" data-testid="admin-tabs-list">
          <TabsTrigger value="users" className="text-xs sm:text-sm" data-testid="admin-tab-users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="agencies" className="text-xs sm:text-sm" data-testid="admin-tab-agencies">Agences</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm" data-testid="admin-tab-audit">Audit logs</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="admin-tab-panel-users">
          <UsersManager />
        </TabsContent>
        <TabsContent value="agencies" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="admin-tab-panel-agencies">
          <AgenciesManager />
        </TabsContent>
        <TabsContent value="audit" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="admin-tab-panel-audit">
          <AuditLogsPanel userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
