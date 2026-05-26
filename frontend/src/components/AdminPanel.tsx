import { useState } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/navigation/Tabs';
import UsersManager from './UsersManager';
import AgenciesManager from './AgenciesManager';
import AuditLogsPanel from './AuditLogsPanel';
import ErrorJournalExport from './ErrorJournalExport';
import { UserRole } from '@/types';

interface AdminPanelProps {
  userRole: UserRole;
}

const AdminPanel = ({ userRole }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState('users');

  if (userRole !== 'super_admin') {
    return (
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-1" data-testid="admin-panel">
        <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Journaux d&apos;Audit</h1>
          <p className="text-sm text-muted-foreground">
            Consultez les actions système et modifications de données pour votre agence.
          </p>
        </div>
        <AuditLogsPanel userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden" data-testid="admin-panel">
      <div className="flex flex-col gap-1 border-b border-border/40 pb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Administration Système</h1>
        <p className="text-sm text-muted-foreground">
          Pilotez les accès agences, configurez les rôles d&apos;utilisateurs et suivez la santé du système.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col"
        data-testid="admin-tabs-root"
      >
        <TabsList
          className="flex h-11 w-full shrink-0 justify-start gap-6 border-b border-border/60 bg-transparent p-0 rounded-none"
          data-testid="admin-tabs-list"
        >
          <TabsTrigger
            value="users"
            className="relative h-11 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none active:scale-[0.98]"
            data-testid="admin-tab-users"
          >
            <span>Utilisateurs</span>
            {activeTab === 'users' && (
              <motion.div
                layoutId="admin-active-tab-line"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="agencies"
            className="relative h-11 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none active:scale-[0.98]"
            data-testid="admin-tab-agencies"
          >
            <span>Agences</span>
            {activeTab === 'agencies' && (
              <motion.div
                layoutId="admin-active-tab-line"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="relative h-11 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none active:scale-[0.98]"
            data-testid="admin-tab-audit"
          >
            <span>Audit logs</span>
            {activeTab === 'audit' && (
              <motion.div
                layoutId="admin-active-tab-line"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="diagnostic"
            className="relative h-11 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none active:scale-[0.98]"
            data-testid="admin-tab-diagnostic"
          >
            <span>Diagnostic</span>
            {activeTab === 'diagnostic' && (
              <motion.div
                layoutId="admin-active-tab-line"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="admin-tab-panel-users">
          <UsersManager />
        </TabsContent>
        <TabsContent value="agencies" className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="admin-tab-panel-agencies">
          <AgenciesManager />
        </TabsContent>
        <TabsContent value="audit" className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="admin-tab-panel-audit">
          <AuditLogsPanel userRole={userRole} />
        </TabsContent>
        <TabsContent value="diagnostic" className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="admin-tab-panel-diagnostic">
          <ErrorJournalExport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
