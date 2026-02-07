import { useQuery } from '@tanstack/react-query';

import { AuditLogFilters, getAuditLogs } from '@/services/admin/getAuditLogs';
import { auditLogsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useAuditLogs = (filters: AuditLogFilters, enabled = true) => {
  const query = useQuery({
    queryKey: auditLogsKey({
      agencyId: filters.agencyId ?? null,
      actorId: filters.actorId ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
      entityTable: filters.entityTable ?? null
    }),
    queryFn: () => getAuditLogs(filters),
    enabled
  });

  useNotifyError(query.error, 'Impossible de charger les audits', 'useAuditLogs');

  return query;
};
