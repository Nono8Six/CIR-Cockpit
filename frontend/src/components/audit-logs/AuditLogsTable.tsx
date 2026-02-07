import { AuditLogEntry } from '@/services/admin/getAuditLogs';
import AuditLogsRow from './AuditLogsRow';

type AuditLogsTableProps = {
  logs: AuditLogEntry[];
  isLoading: boolean;
};

const AuditLogsTable = ({ logs, isLoading }: AuditLogsTableProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-6 bg-slate-100 text-xs uppercase tracking-widest text-slate-500 p-2">
        <span>Date</span>
        <span>Action</span>
        <span>Table</span>
        <span>Agence</span>
        <span>Acteur</span>
        <span>Metadata</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-sm text-slate-400">Chargement des audits...</div>
        )}
        {!isLoading && logs.length === 0 && (
          <div className="p-4 text-sm text-slate-400">Aucun audit.</div>
        )}
        {logs.map(log => (
          <AuditLogsRow key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
};

export default AuditLogsTable;
