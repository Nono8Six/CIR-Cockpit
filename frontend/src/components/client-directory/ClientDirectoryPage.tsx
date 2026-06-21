import { useCallback } from 'react';

import type { DirectorySearchState } from '../../../../shared/schemas/system/directory.schema';
import { useNavigate, useSearch } from '@tanstack/react-router';

import ClientDirectoryWorkspace from './ClientDirectoryWorkspace';

const ClientDirectoryPage = () => {
  const navigate = useNavigate({ from: '/clients/' });
  const search = useSearch({ from: '/clients/' });

  const handleSearchChange = useCallback(
    (updater: (previous: DirectorySearchState) => DirectorySearchState) => {
      void navigate({
        search: (previous) => updater({ ...search, ...previous })
      });
    },
    [navigate, search]
  );

  const handleCreateRecord = useCallback(
    (effectiveSearch: DirectorySearchState) => {
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
      onCreateRecord={handleCreateRecord}
    />
  );
};

export default ClientDirectoryPage;
