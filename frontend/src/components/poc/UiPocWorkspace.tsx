import { useDeferredValue, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import UiPocClientsFilters from '@/components/poc/UiPocClientsFilters';
import UiPocClientsTable from '@/components/poc/UiPocClientsTable';
import UiPocClientDetails from '@/components/poc/UiPocClientDetails';
import {
  createDefaultUiPocClientsFilters,
  getNextUiPocSortState,
  normalizeUiPocClientsFilters,
  UI_POC_CLIENTS_PAGE_SIZE
} from '@/components/poc/uiPocClientsGridUtils';
import { useUiPocClientsPage } from '@/hooks/useUiPocClientsPage';
import type {
  UiPocClientsSortBy,
  UiPocClientsSortDirection
} from '@/services/clients/getUiPocClientsPage';
import type { AgencyMembershipSummary, Client, UserRole } from '@/types';

type UiPocWorkspaceProps = {
  activeAgencyId: string | null;
  userRole: UserRole;
  agencyMemberships: AgencyMembershipSummary[];
  authReady: boolean;
  isAuthenticated: boolean;
};

const EMPTY_CLIENTS: Client[] = [];

const UiPocWorkspace = ({
  activeAgencyId,
  userRole,
  agencyMemberships,
  authReady,
  isAuthenticated
}: UiPocWorkspaceProps) => {
  const defaultAgencyId = userRole === 'super_admin' ? null : activeAgencyId;
  const [filters, setFilters] = useState(() =>
    createDefaultUiPocClientsFilters(defaultAgencyId)
  );
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<UiPocClientsSortBy>('name');
  const [sortDirection, setSortDirection] = useState<UiPocClientsSortDirection>('asc');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const deferredFilters = useDeferredValue(filters);
  const normalizedFilters = useMemo(
    () => normalizeUiPocClientsFilters(deferredFilters),
    [deferredFilters]
  );
  const hasMultipleAgencies = agencyMemberships.length > 1;
  const queryFilters = useMemo(
    () => {
      if (userRole === 'super_admin') {
        return normalizedFilters;
      }

      if (hasMultipleAgencies) {
        return {
          ...normalizedFilters,
          agencyId: normalizedFilters.agencyId ?? activeAgencyId
        };
      }

      return {
        ...normalizedFilters,
        agencyId: activeAgencyId
      };
    },
    [activeAgencyId, hasMultipleAgencies, normalizedFilters, userRole]
  );

  const canQueryClients = isAuthenticated && (userRole === 'super_admin' || Boolean(activeAgencyId));
  const safePage = useMemo(
    () => Math.max(1, Math.trunc(page)),
    [page]
  );
  const queryOptions = useMemo(
    () => ({
      page: safePage,
      pageSize: UI_POC_CLIENTS_PAGE_SIZE,
      sortBy,
      sortDirection,
      filters: queryFilters
    }),
    [queryFilters, safePage, sortBy, sortDirection]
  );
  const clientsPageQuery = useUiPocClientsPage(queryOptions, canQueryClients);
  const pageData = clientsPageQuery.data;
  const clients = pageData?.clients ?? EMPTY_CLIENTS;
  const effectivePage = Math.min(safePage, pageData?.totalPages ?? safePage);
  const effectiveTotalPages = pageData?.totalPages ?? 1;
  const selectedClientIdInPage = useMemo(
    () => clients.some((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );
  const effectiveSelectedClientId = selectedClientIdInPage
    ? selectedClientId
    : clients[0]?.id ?? null;

  const selectedClient = useMemo<Client | null>(
    () => clients.find((client) => client.id === effectiveSelectedClientId) ?? null,
    [clients, effectiveSelectedClientId]
  );

  const agencyNameById = useMemo(
    () =>
      agencyMemberships.reduce<Record<string, string>>((map, agency) => {
        map[agency.agency_id] = agency.agency_name;
        return map;
      }, {}),
    [agencyMemberships]
  );

  if (!authReady) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/70 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Vérification de la session en cours...
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/70 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Connexion requise pour charger les données clients réelles dans ce POC.
        </p>
      </section>
    );
  }

  if (!canQueryClients) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/70 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Agence active requise pour afficher les clients.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/70 bg-card p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 size={16} className="text-muted-foreground" />
            <h2 className="truncate text-base font-semibold text-foreground">
              Clients
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Filtres fluides + tri colonnes + pagination 25 lignes
          </p>
        </div>
        <Badge variant="secondary">CA: phase 2</Badge>
      </div>

      <UiPocClientDetails
        selectedClient={selectedClient}
        overviewContent={(
          <div className="space-y-3">
            <UiPocClientsFilters
              filters={filters}
              userRole={userRole}
              hasMultipleAgencies={hasMultipleAgencies}
              agencies={agencyMemberships}
              onFiltersChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
              onResetFilters={() => {
                setFilters(createDefaultUiPocClientsFilters(defaultAgencyId));
                setPage(1);
              }}
            />

            <UiPocClientsTable
              clients={clients}
              selectedClientId={effectiveSelectedClientId}
              onSelectClient={setSelectedClientId}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSortChange={(clickedBy) => {
                const next = getNextUiPocSortState(sortBy, sortDirection, clickedBy);
                setSortBy(next.sortBy);
                setSortDirection(next.sortDirection);
                setPage(1);
              }}
              page={effectivePage}
              totalPages={effectiveTotalPages}
              total={pageData?.total ?? 0}
              pageSize={UI_POC_CLIENTS_PAGE_SIZE}
              isFetching={clientsPageQuery.isFetching}
              agencyNameById={agencyNameById}
              onPageChange={(nextPage) => {
                setPage(Math.max(1, nextPage));
              }}
            />
          </div>
        )}
      />
    </section>
  );
};

export default UiPocWorkspace;
