import { useCallback } from 'react';

import type { DirectoryListInput, DirectoryListRow } from 'shared/schemas/directory.schema';
import { useNavigate, useSearch } from '@tanstack/react-router';

import ClientDirectoryWorkspace from './ClientDirectoryWorkspace';
import { getDirectoryRouteRefFromRow } from './directoryRouting';

const ClientDirectoryPage = () => {
  const navigate = useNavigate({ from: '/clients/' });
  const search = useSearch({ from: '/clients/' });

  const handleSearchChange = useCallback(
    (updater: (previous: DirectoryListInput) => DirectoryListInput) => {
      void navigate({
        search: (previous) => updater({ ...search, ...previous })
      });
    },
    [navigate, search]
  );

  const handleOpenRecord = useCallback(
    (row: DirectoryListRow, effectiveSearch: DirectoryListInput) => {
      const routeRef = getDirectoryRouteRefFromRow(row);

      if (routeRef.kind === 'client') {
        void navigate({
          to: '/clients/$clientNumber',
          params: { clientNumber: routeRef.clientNumber },
          search: () => effectiveSearch
        });
        return;
      }

      void navigate({
        to: '/clients/prospects/$prospectId',
        params: { prospectId: routeRef.id },
        search: () => effectiveSearch
      });
    },
    [navigate]
  );

  const handleCreateRecord = useCallback(
    (effectiveSearch: DirectoryListInput) => {
      void navigate({
        to: '/clients/new',
        search: () => effectiveSearch
      });
    },
    [navigate]
  );

  return (
    <ClientDirectoryWorkspace
      search={search}
      onSearchChange={handleSearchChange}
      onOpenRecord={handleOpenRecord}
      onCreateRecord={handleCreateRecord}
    />
  );
};

export default ClientDirectoryPage;
