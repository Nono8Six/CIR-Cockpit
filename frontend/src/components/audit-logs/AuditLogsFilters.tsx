import type { Agency, UserRole } from '@/types';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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
  const resolvedAgencyId = agencyId ?? 'all';
  const resolvedActorId = actorId ?? 'all';
  const agencySelectId = 'admin-audit-filter-agency';
  const actorSelectId = 'admin-audit-filter-user';
  const tableInputId = 'admin-audit-filter-table';

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="admin-audit-filters">
      <div>
        <label htmlFor={agencySelectId} className="text-xs font-medium text-muted-foreground">Agence</label>
        <Select
          value={resolvedAgencyId}
          onValueChange={(value) => onAgencyChange(value === 'all' ? null : value)}
        >
          <SelectTrigger id={agencySelectId} className="mt-1" data-testid="admin-audit-filter-agency-trigger">
            <SelectValue placeholder="Toutes les agences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            {agencies.map((agency) => (
              <SelectItem key={agency.id} value={agency.id}>
                {agency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {userRole === 'super_admin' ? (
        <div>
          <label htmlFor={actorSelectId} className="text-xs font-medium text-muted-foreground">Utilisateur</label>
          <Select
            value={resolvedActorId}
            onValueChange={(value) => onActorChange(value === 'all' ? null : value)}
          >
            <SelectTrigger id={actorSelectId} className="mt-1" data-testid="admin-audit-filter-user-trigger">
              <SelectValue placeholder="Tous les utilisateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name ?? user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div>
        <label htmlFor={tableInputId} className="text-xs font-medium text-muted-foreground">Table</label>
        <Input
          id={tableInputId}
          type="text"
          value={entityTable}
          onChange={(event) => onEntityTableChange(event.target.value)}
          placeholder="clients, interactions..."
          data-testid="admin-audit-filter-table-input"
        />
      </div>
    </div>
  );
};

export default AuditLogsFilters;
