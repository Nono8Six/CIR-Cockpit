import { ShieldCheck } from 'lucide-react';

const AuditLogsHeader = () => {
  return (
    <div data-testid="admin-audit-header">
      <h2 className="text-sm font-semibold text-slate-900">Audit logs</h2>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
        <ShieldCheck size={14} className="text-slate-400" aria-hidden="true" />
        Tracabilite des actions et modifications
      </p>
    </div>
  );
};

export default AuditLogsHeader;
