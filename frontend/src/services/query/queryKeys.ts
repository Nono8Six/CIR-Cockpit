export const QUERY_ROOTS = {
  configSnapshot: 'config-snapshot',
  interactions: 'interactions',
  clients: 'clients',
  prospects: 'prospects',
  directory: 'directory',
  directoryCompanyDetails: 'directory-company-details',
  directoryCompanySearch: 'directory-company-search',
  directoryDuplicates: 'directory-duplicates',
  directoryOptions: 'directory-options',
  directoryCitySuggestions: 'directory-city-suggestions',
  directoryRecord: 'directory-record',
  directorySavedViews: 'directory-saved-views',
  client: 'client',
  clientContacts: 'client-contacts',
  entityInteractions: 'entity-interactions',
  entitySearchIndex: 'entity-search-index',
  agencies: 'agencies',
  adminUsers: 'admin-users',
  auditLogs: 'audit-logs'
} as const;

const archiveScope = (includeArchived: boolean): 'with-archived' | 'active' =>
  includeArchived ? 'with-archived' : 'active';

export const configSnapshotKey = (agencyId: string) => [QUERY_ROOTS.configSnapshot, agencyId] as const;
export const agencyConfigKey = (agencyId: string) => configSnapshotKey(agencyId);

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

export const directoryRootKey = () => [QUERY_ROOTS.directory] as const;
export const directoryCompanyDetailsRootKey = () => [QUERY_ROOTS.directoryCompanyDetails] as const;
export const directoryCompanyDetailsKey = (input: Record<string, unknown>) => [QUERY_ROOTS.directoryCompanyDetails, input] as const;
export const directoryPageKey = (input: Record<string, unknown>) => [QUERY_ROOTS.directory, input] as const;
export const directoryCompanySearchRootKey = () => [QUERY_ROOTS.directoryCompanySearch] as const;
export const directoryCompanySearchKey = (input: Record<string, unknown>) => [QUERY_ROOTS.directoryCompanySearch, input] as const;
export const directoryDuplicatesRootKey = () => [QUERY_ROOTS.directoryDuplicates] as const;
export const directoryDuplicatesKey = (input: Record<string, unknown>) => [QUERY_ROOTS.directoryDuplicates, input] as const;
export const directoryOptionsRootKey = () => [QUERY_ROOTS.directoryOptions] as const;
export const directoryOptionsKey = (input: Record<string, unknown>) => [QUERY_ROOTS.directoryOptions, input] as const;
export const directoryCitySuggestionsRootKey = () => [QUERY_ROOTS.directoryCitySuggestions] as const;
export const directoryCitySuggestionsKey = (input: Record<string, unknown>) => [QUERY_ROOTS.directoryCitySuggestions, input] as const;
export const directoryRecordRootKey = () => [QUERY_ROOTS.directoryRecord] as const;
export const directoryRecordKey = (route: Record<string, unknown>) => [QUERY_ROOTS.directoryRecord, route] as const;
export const directorySavedViewsRootKey = () => [QUERY_ROOTS.directorySavedViews] as const;
export const directorySavedViewsKey = () => [QUERY_ROOTS.directorySavedViews] as const;

export const clientKey = (clientId: string) => [QUERY_ROOTS.client, clientId] as const;

export const clientContactsKey = (clientId: string, includeArchived: boolean) => [
  QUERY_ROOTS.clientContacts,
  clientId,
  archiveScope(includeArchived)
] as const;

export const entityInteractionsRootKey = () => [QUERY_ROOTS.entityInteractions] as const;
export const entityInteractionsKey = (entityId: string | null, page: number, pageSize: number) => [
  QUERY_ROOTS.entityInteractions,
  entityId ?? 'none',
  page,
  pageSize
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
