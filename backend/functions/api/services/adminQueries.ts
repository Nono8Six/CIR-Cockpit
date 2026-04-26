import { and, asc, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';

import { agencies, agency_members, audit_logs, profiles } from '../../../drizzle/schema.ts';
import type {
  AdminAuditLogEntry,
  AdminAuditLogsResponse,
  AdminUserMembership,
  AdminUserSummary,
  AdminUsersListResponse
} from '../../../../shared/schemas/api-responses.ts';
import type {
  AdminAuditLogsInput,
  AdminUsersListInput
} from '../../../../shared/schemas/user.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from './dataAccess.ts';
import { checkRateLimit } from './rateLimit.ts';

const DEFAULT_AUDIT_LOG_LIMIT = 200;

const toMembershipsByUser = (
  rows: Array<{ user_id: string; agency_id: string; agency_name: string }>
): Map<string, AdminUserMembership[]> => {
  const membershipsByUser = new Map<string, AdminUserMembership[]>();

  for (const row of rows) {
    const memberships = membershipsByUser.get(row.user_id) ?? [];
    memberships.push({
      agency_id: row.agency_id,
      agency_name: row.agency_name
    });
    membershipsByUser.set(row.user_id, memberships);
  }

  return membershipsByUser;
};

export const listAdminUsers = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  _input: AdminUsersListInput
): Promise<AdminUsersListResponse> => {
  const allowed = await checkRateLimit('admin-users:list', callerId);
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes. Reessayez plus tard.');
  }

  try {
    const users = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        display_name: profiles.display_name,
        first_name: profiles.first_name,
        last_name: profiles.last_name,
        role: profiles.role,
        archived_at: profiles.archived_at,
        created_at: profiles.created_at
      })
      .from(profiles)
      .where(eq(profiles.is_system, false))
      .orderBy(asc(profiles.email));

    if (users.length === 0) {
      return { request_id: requestId, ok: true, users: [] };
    }

    const memberships = await db
      .select({
        user_id: agency_members.user_id,
        agency_id: agency_members.agency_id,
        agency_name: agencies.name
      })
      .from(agency_members)
      .innerJoin(agencies, eq(agency_members.agency_id, agencies.id))
      .where(inArray(agency_members.user_id, users.map((user) => user.id)))
      .orderBy(asc(agencies.name));

    const membershipsByUser = toMembershipsByUser(memberships);
    const summaries: AdminUserSummary[] = users.map((user) => ({
      ...user,
      memberships: membershipsByUser.get(user.id) ?? []
    }));

    return { request_id: requestId, ok: true, users: summaries };
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les utilisateurs.');
  }
};

const buildAuditLogAccessConditions = (
  authContext: AuthContext,
  input: AdminAuditLogsInput
): SQL[] => {
  const conditions: SQL[] = [];

  if (authContext.isSuperAdmin) {
    if (input.agency_id) {
      conditions.push(eq(audit_logs.agency_id, input.agency_id));
    }
    return conditions;
  }

  if (authContext.role !== 'agency_admin') {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  if (input.agency_id) {
    conditions.push(eq(audit_logs.agency_id, ensureAgencyAccess(authContext, input.agency_id)));
    return conditions;
  }

  if (authContext.agencyIds.length === 0) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  conditions.push(inArray(audit_logs.agency_id, authContext.agencyIds));
  return conditions;
};

const toAuditLogEntry = (row: {
  id: string;
  action: string;
  entity_table: string;
  entity_id: string;
  metadata: AdminAuditLogEntry['metadata'];
  created_at: string;
  actor_id: string | null;
  actor_is_super_admin: boolean;
  agency_id: string | null;
  actor_display_name: string | null;
  actor_email: string | null;
  agency_name: string | null;
}): AdminAuditLogEntry => ({
  id: row.id,
  action: row.action,
  entity_table: row.entity_table,
  entity_id: row.entity_id,
  metadata: row.metadata,
  created_at: row.created_at,
  actor_id: row.actor_id,
  actor_is_super_admin: row.actor_is_super_admin,
  agency_id: row.agency_id,
  actor: row.actor_id && row.actor_email
    ? {
      id: row.actor_id,
      display_name: row.actor_display_name,
      email: row.actor_email
    }
    : null,
  agency: row.agency_id && row.agency_name
    ? {
      id: row.agency_id,
      name: row.agency_name
    }
    : null
});

export const listAdminAuditLogs = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: AdminAuditLogsInput
): Promise<AdminAuditLogsResponse> => {
  await ensureDataRateLimit('admin:audit_logs', authContext.userId);

  const conditions = buildAuditLogAccessConditions(authContext, input);
  if (input.actor_id) conditions.push(eq(audit_logs.actor_id, input.actor_id));
  if (input.entity_table) conditions.push(eq(audit_logs.entity_table, input.entity_table));
  if (input.from) conditions.push(gte(audit_logs.created_at, input.from));
  if (input.to) conditions.push(lte(audit_logs.created_at, input.to));

  try {
    const rows = await db
      .select({
        id: audit_logs.id,
        action: audit_logs.action,
        entity_table: audit_logs.entity_table,
        entity_id: audit_logs.entity_id,
        metadata: audit_logs.metadata,
        created_at: audit_logs.created_at,
        actor_id: audit_logs.actor_id,
        actor_is_super_admin: audit_logs.actor_is_super_admin,
        agency_id: audit_logs.agency_id,
        actor_display_name: profiles.display_name,
        actor_email: profiles.email,
        agency_name: agencies.name
      })
      .from(audit_logs)
      .leftJoin(profiles, eq(audit_logs.actor_id, profiles.id))
      .leftJoin(agencies, eq(audit_logs.agency_id, agencies.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(audit_logs.created_at))
      .limit(input.limit ?? DEFAULT_AUDIT_LOG_LIMIT);

    return {
      request_id: requestId,
      ok: true,
      logs: rows.map(toAuditLogEntry)
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'AUTH_FORBIDDEN'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les audits.');
  }
};
