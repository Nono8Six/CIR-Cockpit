import AuditLogsDateRange from './audit-logs/AuditLogsDateRange';
import AuditLogsFilters from './audit-logs/AuditLogsFilters';
import AuditLogsHeader from './audit-logs/AuditLogsHeader';
import AuditLogsTable from './audit-logs/AuditLogsTable';
import { useAuditLogsPanel } from '@/hooks/useAuditLogsPanel';
import { UserRole } from '@/types';

interface AuditLogsPanelProps {
  userRole: UserRole;
}

const AuditLogsPanel = ({ userRole }: AuditLogsPanelProps) => {
  const {
    agencyId,
    actorId,
    fromDate,
    toDate,
    entityTable,
    agencies,
    users,
    auditQuery,
    logs,
    setAgencyId,
    setActorId,
    setFromDate,
    setToDate,
    setEntityTable
  } = useAuditLogsPanel(userRole);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
      <AuditLogsHeader />

      <AuditLogsFilters
        userRole={userRole}
        agencies={agencies}
        users={users}
        agencyId={agencyId}
        actorId={actorId}
        entityTable={entityTable}
        onAgencyChange={setAgencyId}
        onActorChange={setActorId}
        onEntityTableChange={setEntityTable}
      />

      <AuditLogsDateRange
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
      />

      <AuditLogsTable logs={logs} isLoading={auditQuery.isLoading} />
    </div>
  );
};

export default AuditLogsPanel;
