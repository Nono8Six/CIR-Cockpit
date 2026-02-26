export const QUERY_ROOTS = {
  agencyConfig: 'agency-config',
  interactions: 'interactions',
  clients: 'clients',
  prospects: 'prospects',
  client: 'client',
  clientContacts: 'client-contacts',
  entitySearchIndex: 'entity-search-index',
  agencies: 'agencies',
  adminUsers: 'admin-users',
  auditLogs: 'audit-logs'
} as const;

const archiveScope = (includeArchived: boolean): 'with-archived' | 'active' =>
  includeArchived ? 'with-archived' : 'active';

export const agencyConfigKey = (agencyId: string) => [QUERY_ROOTS.agencyConfig, agencyId] as const;

export const interactionsRootKey = () => [QUERY_ROOTS.interactions] as const;
export const interactionsKey = (agencyId: string | null) =>
  [QUERY_ROOTS.interactions, agencyId ?? 'none'] as const;

export const clientsRootKey = () => [QUERY_ROOTS.clients] as const;
export const clientsKey = (agencyId: string | null, includeArchived: boolean, orphansOnly = false) => [
  QUERY_ROOTS.clients,
  orphansOnly ? 'orphans' : (agencyId ?? 'all'),
  archiveScope(includeArchived)
] as const;

export const prospectsRootKey = () => [QUERY_ROOTS.prospects] as const;
export const prospectsKey = (agencyId: string | null, includeArchived: boolean, orphansOnly = false) => [
  QUERY_ROOTS.prospects,
  orphansOnly ? 'orphans' : (agencyId ?? 'all'),
  archiveScope(includeArchived)
] as const;

export const clientKey = (clientId: string) => [QUERY_ROOTS.client, clientId] as const;

export const clientContactsKey = (clientId: string, includeArchived: boolean) => [
  QUERY_ROOTS.clientContacts,
  clientId,
  archiveScope(includeArchived)
] as const;

export const entitySearchIndexRootKey = () => [QUERY_ROOTS.entitySearchIndex] as const;
export const entitySearchIndexKey = (agencyId: string | null, includeArchived: boolean) => [
  QUERY_ROOTS.entitySearchIndex,
  agencyId ?? 'all',
  archiveScope(includeArchived)
] as const;

export const agenciesRootKey = () => [QUERY_ROOTS.agencies] as const;
export const agenciesKey = (includeArchived: boolean) => [QUERY_ROOTS.agencies, archiveScope(includeArchived)] as const;

export const adminUsersKey = () => [QUERY_ROOTS.adminUsers] as const;

export const auditLogsRootKey = () => [QUERY_ROOTS.auditLogs] as const;
export const auditLogsKey = (filters: Record<string, string | null | undefined>) => [
  QUERY_ROOTS.auditLogs,
  filters
] as const;
