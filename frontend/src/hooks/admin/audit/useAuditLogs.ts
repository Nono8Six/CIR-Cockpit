import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AuditLogFilters, getAuditLogs } from '@/services/admin/getAuditLogs';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';
import { auditLogsKey } from '@/services/query/queryKeys';

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

  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!query.error) return;
    const appError = mapAdminDomainError(query.error, {
      action: 'read_audit',
      fallbackMessage: 'Impossible de charger les audits.'
    });
    const signature = `${appError.code}:${appError.message}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    handleUiError(appError, appError.message, { source: 'useAuditLogs' });
  }, [query.error]);

  return query;
};
