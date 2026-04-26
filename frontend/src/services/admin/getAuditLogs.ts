import {
  adminAuditLogsResponseSchema,
  type AdminAuditLogEntry
} from 'shared/schemas/api-responses';
import type { AdminAuditLogsInput } from 'shared/schemas/user.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type AuditLogEntry = AdminAuditLogEntry;
export type AuditLogFilters = {
  agencyId?: string | null;
  actorId?: string | null;
  from?: string | null;
  to?: string | null;
  entityTable?: string | null;
  limit?: number;
};

const parseAuditLogsResponse = (payload: unknown): AuditLogEntry[] => {
  const parsed = adminAuditLogsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'EDGE_INVALID_RESPONSE',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data.logs;
};

const toAuditLogsInput = (filters: AuditLogFilters): AdminAuditLogsInput => ({
  agency_id: filters.agencyId ?? null,
  actor_id: filters.actorId ?? null,
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
