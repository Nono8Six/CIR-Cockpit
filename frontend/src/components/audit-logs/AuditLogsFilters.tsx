import type { Agency, UserRole } from '@/types';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import { Input } from '@/components/ui/input';

const SELECT_STYLE = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type AuditLogsFiltersProps = {
  userRole: UserRole;
  agencies: Agency[];
  users: AdminUserSummary[];
  agencyId: string | null;
  actorId: string | null;
  entityTable: string;
  onAgencyChange: (value: string | null) => void;
  onActorChange: (value: string | null) => void;
  onEntityTableChange: (value: string) => void;
};

const AuditLogsFilters = ({
  userRole,
  agencies,
  users,
  agencyId,
  actorId,
  entityTable,
  onAgencyChange,
  onActorChange,
  onEntityTableChange
}: AuditLogsFiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="text-xs font-medium text-slate-500">Agence</label>
        <select
          className={SELECT_STYLE}
          value={agencyId ?? ''}
          onChange={(event) => onAgencyChange(event.target.value || null)}
        >
          <option value="">Toutes</option>
          {agencies.map(agency => (
            <option key={agency.id} value={agency.id}>{agency.name}</option>
          ))}
        </select>
      </div>
      {userRole === 'super_admin' ? (
        <div>
          <label className="text-xs font-medium text-slate-500">Utilisateur</label>
          <select
            className={SELECT_STYLE}
            value={actorId ?? ''}
            onChange={(event) => onActorChange(event.target.value || null)}
          >
            <option value="">Tous</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.display_name ?? user.email}</option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label className="text-xs font-medium text-slate-500">Table</label>
        <Input
          type="text"
          value={entityTable}
          onChange={(event) => onEntityTableChange(event.target.value)}
          placeholder="clients, interactions\u2026"
        />
      </div>
    </div>
  );
};

export default AuditLogsFilters;
