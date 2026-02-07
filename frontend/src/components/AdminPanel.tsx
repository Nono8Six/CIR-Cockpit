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
      <div className="h-full">
        <AuditLogsPanel userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <ErrorJournalExport />
      <Tabs defaultValue="users">
        <TabsList className="flex bg-slate-100 rounded-md p-1 gap-1 h-auto">
          <TabsTrigger value="users" className="text-xs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="agencies" className="text-xs">Agences</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit logs</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersManager />
        </TabsContent>
        <TabsContent value="agencies">
          <AgenciesManager />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogsPanel userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
