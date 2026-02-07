export const agencyConfigKey = (agencyId: string) => ['agency-config', agencyId] as const;

export const interactionsKey = (agencyId: string) => ['interactions', agencyId] as const;

export const clientsKey = (agencyId: string | null, includeArchived: boolean, orphansOnly = false) => [
  'clients',
  orphansOnly ? 'orphans' : (agencyId ?? 'all'),
  includeArchived ? 'with-archived' : 'active'
] as const;

export const prospectsKey = (agencyId: string | null, includeArchived: boolean, orphansOnly = false) => [
  'prospects',
  orphansOnly ? 'orphans' : (agencyId ?? 'all'),
  includeArchived ? 'with-archived' : 'active'
] as const;

export const clientKey = (clientId: string) => ['client', clientId] as const;

export const clientContactsKey = (clientId: string, includeArchived: boolean) => [
  'client-contacts',
  clientId,
  includeArchived ? 'with-archived' : 'active'
] as const;

export const entitySearchIndexKey = (agencyId: string | null, includeArchived: boolean) => [
  'entity-search-index',
  agencyId ?? 'all',
  includeArchived ? 'with-archived' : 'active'
] as const;

export const agenciesKey = (includeArchived: boolean) => [
  'agencies',
  includeArchived ? 'with-archived' : 'active'
] as const;

export const adminUsersKey = () => ['admin-users'] as const;

export const auditLogsKey = (filters: Record<string, string | null | undefined>) => [
  'audit-logs',
  filters
] as const;
