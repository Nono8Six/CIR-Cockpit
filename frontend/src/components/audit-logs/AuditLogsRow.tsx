import { AuditLogEntry } from '@/services/admin/getAuditLogs';
import { formatDate } from '@/utils/date/formatDate';
import { formatAuditMetadata } from '@/utils/audit/formatAuditMetadata';

type AuditLogsRowProps = {
  log: AuditLogEntry;
};

const AuditLogsRow = ({ log }: AuditLogsRowProps) => {
  const metadataLabel = formatAuditMetadata(log.metadata);

  return (
    <div className="grid grid-cols-6 gap-2 p-2 border-t border-slate-100 text-xs text-slate-600">
      <span>{formatDate(log.created_at)}</span>
      <span className="font-semibold text-slate-800">{log.action}</span>
      <span>{log.entity_table}</span>
      <span>{log.agency?.name ?? '-'}</span>
      <span>{log.actor?.display_name ?? log.actor?.email ?? 'System'}</span>
      <span className="truncate" title={metadataLabel}>
        {metadataLabel}
      </span>
    </div>
  );
};

export default AuditLogsRow;
