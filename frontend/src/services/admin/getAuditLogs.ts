import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import {
  adminAuditLogsResponseSchema,
  type AdminAuditLogEntry
} from '../../../../shared/schemas/system/api-responses';
import type { AdminAuditLogsInput } from '../../../../shared/schemas/admin/user.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';

export type AuditLogEntry = AdminAuditLogEntry;
export type AuditLogFilters = {
  agencyId?: string | null;
  actorId?: string | null;
  entityId?: string | null;
  from?: string | null;
  to?: string | null;
  entityTable?: string | null;
  limit?: number;
};

const parseAuditLogsResponse = createTrpcResponseParser(
  adminAuditLogsResponseSchema,
  (response): AuditLogEntry[] => {
  return response.logs;
},
  { code: 'EDGE_INVALID_RESPONSE', message: 'Réponse serveur invalide.' }
);

const toAuditLogsInput = (filters: AuditLogFilters): AdminAuditLogsInput => ({
  agency_id: filters.agencyId ?? null,
  actor_id: filters.actorId ?? null,
  entity_id: filters.entityId ?? null,
  from: filters.from ?? null,
  to: filters.to ?? null,
  entity_table: filters.entityTable ?? null,
  limit: filters.limit
});

export const getAuditLogs = (filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> =>
  invokeTrpc(
    (api, options) => api.admin['audit-logs'].query(toAuditLogsInput(filters), options),
    parseAuditLogsResponse,
    'Impossible de charger les audits.'
  );
