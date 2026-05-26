import { AuditLogEntry } from '@/services/admin/getAuditLogs';
import { formatDate } from '@/utils/date/formatDate';
import { formatAuditMetadata } from '@/utils/audit/formatAuditMetadata';
import { TableCell, TableRow } from '../ui/data-display/Table';
import { Badge } from '../ui/data-display/Badge';

type AuditLogsRowProps = {
  log: AuditLogEntry;
  variant: 'table' | 'card';
};

const AuditLogsRow = ({ log, variant }: AuditLogsRowProps) => {
  const metadataLabel = formatAuditMetadata(log.metadata);
  const actorLabel = log.actor?.display_name ?? log.actor?.email ?? 'Système';

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('INSERT') || act.includes('CREATE') || act.includes('AJOUT')) {
      return (
        <Badge variant="success" className="text-[10px] bg-success/10 text-success border-success/20 hover:bg-success hover:text-success-foreground transition-all duration-200 uppercase font-semibold">
          Création
        </Badge>
      );
    }
    if (act.includes('DELETE') || act.includes('ARCHIVE') || act.includes('REMOVE') || act.includes('SUPPR')) {
      return (
        <Badge variant="destructive" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 uppercase font-semibold">
          Suppression
        </Badge>
      );
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('RENAME') || act.includes('MODIF')) {
      return (
        <Badge variant="warning" className="text-[10px] bg-warning/10 text-warning border-warning/20 hover:bg-warning hover:text-warning-foreground transition-all duration-200 uppercase font-semibold">
          Modification
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
        {action}
      </Badge>
    );
  };

  if (variant === 'table') {
    return (
      <TableRow className="group relative transition-all duration-200 hover:bg-muted/15" data-testid={`admin-audit-row-${log.id}`}>
        <TableCell className="py-3.5 pl-6 relative text-xs text-muted-foreground">
          <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full bg-primary opacity-0 group-hover:opacity-100 transition-all duration-200" />
          {formatDate(log.created_at)}
        </TableCell>
        <TableCell className="py-3.5 text-xs">{getActionBadge(log.action)}</TableCell>
        <TableCell className="py-3.5 text-xs font-semibold text-foreground">{log.entity_table}</TableCell>
        <TableCell className="py-3.5 text-xs text-muted-foreground">{log.agency?.name ?? '-'}</TableCell>
        <TableCell className="py-3.5 text-xs text-muted-foreground font-medium">{actorLabel}</TableCell>
        <TableCell className="py-3.5 max-w-[260px] truncate text-xs text-muted-foreground/80 font-mono" title={metadataLabel}>
          {metadataLabel}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs" data-testid={`admin-audit-card-${log.id}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
        <span className="text-xs font-semibold text-foreground">{log.entity_table}</span>
        {getActionBadge(log.action)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-muted-foreground font-medium block">Date</span>
          <span className="text-foreground">{formatDate(log.created_at)}</span>
        </div>
        <div>
          <span className="text-muted-foreground font-medium block">Acteur</span>
          <span className="text-foreground font-medium">{actorLabel}</span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground font-medium block">Agence</span>
          <span className="text-foreground">{log.agency?.name ?? '-'}</span>
        </div>
      </div>
      {metadataLabel && (
        <div className="pt-2 border-t border-border/40">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Métadonnées
          </span>
          <p className="bg-muted/30 p-2 rounded-lg text-[10px] font-mono break-all text-muted-foreground/90">
            {metadataLabel}
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditLogsRow;
