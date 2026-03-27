import { useCallback } from 'react';

import type { DirectoryRouteRef } from 'shared/schemas/directory.schema';
import { useCanGoBack } from '@tanstack/react-router';

import ClientDirectoryRecordDetails from './ClientDirectoryRecordDetails';

type ClientDirectoryDetailPageProps = {
  routeRef: DirectoryRouteRef;
};

const ClientDirectoryDetailPage = ({ routeRef }: ClientDirectoryDetailPageProps) => {
  const canGoBack = useCanGoBack();

  const handleDeleteSuccess = useCallback(() => {
    if (canGoBack) {
      globalThis.history.back();
      return;
    }

    globalThis.location.assign('/clients');
  }, [canGoBack]);

  return (
    <ClientDirectoryRecordDetails
      routeRef={routeRef}
      surface="page"
      onDeleteSuccess={handleDeleteSuccess}
    />
  );
};

export default ClientDirectoryDetailPage;
