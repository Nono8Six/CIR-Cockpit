import { AuditLogEntry } from '@/services/admin/getAuditLogs';
import { formatDate } from '@/utils/date/formatDate';
import { formatAuditMetadata } from '@/utils/audit/formatAuditMetadata';
import { TableCell, TableRow } from '@/components/ui/table';

type AuditLogsRowProps = {
  log: AuditLogEntry;
  variant: 'table' | 'card';
};

const AuditLogsRow = ({ log, variant }: AuditLogsRowProps) => {
  const metadataLabel = formatAuditMetadata(log.metadata);
  const actorLabel = log.actor?.display_name ?? log.actor?.email ?? 'System';

  if (variant === 'table') {
    return (
      <TableRow data-testid={`admin-audit-row-${log.id}`}>
        <TableCell className="text-xs text-slate-600">{formatDate(log.created_at)}</TableCell>
        <TableCell className="text-xs font-semibold text-slate-800">{log.action}</TableCell>
        <TableCell className="text-xs text-slate-600">{log.entity_table}</TableCell>
        <TableCell className="text-xs text-slate-600">{log.agency?.name ?? '-'}</TableCell>
        <TableCell className="text-xs text-slate-600">{actorLabel}</TableCell>
        <TableCell className="max-w-[260px] truncate text-xs text-slate-600" title={metadataLabel}>
          {metadataLabel}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600" data-testid={`admin-audit-card-${log.id}`}>
      <p className="font-semibold text-slate-800">{log.action}</p>
      <p>{formatDate(log.created_at)}</p>
      <p>
        <span className="font-medium text-slate-700">Table:</span> {log.entity_table}
      </p>
      <p>
        <span className="font-medium text-slate-700">Agence:</span> {log.agency?.name ?? '-'}
      </p>
      <p>
        <span className="font-medium text-slate-700">Acteur:</span> {actorLabel}
      </p>
      <p className="break-words">
        <span className="font-medium text-slate-700">Metadata:</span> {metadataLabel}
      </p>
    </div>
  );
};

export default AuditLogsRow;
