import { useMemo, useState } from 'react';

import { UserRole } from '@/types';
import { useAuditLogs } from './useAuditLogs';
import { useAgencies } from './useAgencies';
import { useAdminUsers } from './useAdminUsers';

export const useAuditLogsPanel = (userRole: UserRole) => {
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entityTable, setEntityTable] = useState('');

  const agenciesQuery = useAgencies(true, true);
  const agencies = useMemo(() => agenciesQuery.data ?? [], [agenciesQuery.data]);

  const usersQuery = useAdminUsers(userRole === 'super_admin');
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const filters = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00Z`).toISOString() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59Z`).toISOString() : null;
    return {
      agencyId,
      actorId,
      from,
      to,
      entityTable: entityTable.trim() || null,
      limit: 200
    };
  }, [actorId, agencyId, entityTable, fromDate, toDate]);

  const auditQuery = useAuditLogs(filters, true);
  const logs = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);

  return {
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
  };
};
