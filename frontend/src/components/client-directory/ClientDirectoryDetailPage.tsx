import { useCallback } from 'react';

import type { DirectoryRouteRef } from '../../../../shared/schemas/system/directory.schema';
import { useCanGoBack, useNavigate } from '@tanstack/react-router';

import ClientDirectoryRecordDetails from './ClientDirectoryRecordDetails';
import { DEFAULT_DIRECTORY_SEARCH } from './clientDirectorySearch';
import { DEFAULT_SUPPLIER_SEARCH } from '@/components/admin-suppliers/supplierDirectorySearch';

type ClientDirectoryDetailPageProps = {
  routeRef: DirectoryRouteRef;
  isEditOpen?: boolean;
};

const ClientDirectoryDetailPage = ({ routeRef, isEditOpen = false }: ClientDirectoryDetailPageProps) => {
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();

  const handleDeleteSuccess = useCallback(() => {
    if (canGoBack) {
      globalThis.history.back();
      return;
    }

    if (routeRef.kind === 'supplier') {
      void navigate({
        to: '/suppliers',
        search: DEFAULT_SUPPLIER_SEARCH,
        replace: true
      });
      return;
    }

    void navigate({
      to: '/clients',
      search: DEFAULT_DIRECTORY_SEARCH,
      replace: true
    });
  }, [canGoBack, navigate, routeRef.kind]);

  return (
    <ClientDirectoryRecordDetails
      routeRef={routeRef}
      isEditOpen={isEditOpen}
      onDeleteSuccess={handleDeleteSuccess}
    />
  );
};

export default ClientDirectoryDetailPage;
