import { ShieldCheck } from 'lucide-react';

const AuditLogsHeader = () => {
  return (
    <div data-testid="admin-audit-header">
      <h2 className="text-sm font-semibold text-foreground">Audit logs</h2>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ShieldCheck size={14} className="text-muted-foreground/80" aria-hidden="true" />
        Tracabilite des actions et modifications
      </p>
    </div>
  );
};

export default AuditLogsHeader;
