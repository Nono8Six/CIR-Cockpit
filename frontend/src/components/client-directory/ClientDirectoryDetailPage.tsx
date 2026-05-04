import { useCallback, useMemo } from 'react';

import type { DirectoryRouteRef, DirectorySearchState } from 'shared/schemas/directory.schema';
import { useCanGoBack, useNavigate } from '@tanstack/react-router';

import ClientDirectoryRecordDetails from './ClientDirectoryRecordDetails';
import { toDirectoryListInput } from './clientDirectorySearch';
import { getDirectoryRouteRefFromRow } from './directoryRouting';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDirectoryPage } from '@/hooks/useDirectoryPage';

type ClientDirectoryDetailPageProps = {
  routeRef: DirectoryRouteRef;
  search: DirectorySearchState;
};

const ClientDirectoryDetailPage = ({ routeRef, search }: ClientDirectoryDetailPageProps) => {
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const sessionState = useAppSessionStateContext();
  const directoryListInput = useMemo(() => toDirectoryListInput(search), [search]);
  const directoryPageQuery = useDirectoryPage(directoryListInput, sessionState.canLoadData);

  const navigateToRouteRef = useCallback((targetRouteRef: DirectoryRouteRef) => {
    if (targetRouteRef.kind === 'client') {
      void navigate({
        to: '/clients/$clientNumber',
        params: { clientNumber: targetRouteRef.clientNumber },
        search: () => search,
        replace: true
      });
      return;
    }

    void navigate({
      to: '/clients/prospects/$prospectId',
      params: { prospectId: targetRouteRef.id },
      search: () => search,
      replace: true
    });
  }, [navigate, search]);

  const handleDeleteSuccess = useCallback(() => {
    if (canGoBack) {
      globalThis.history.back();
      return;
    }

    void navigate({
      to: '/clients',
      search: () => search,
      replace: true
    });
  }, [canGoBack, navigate, search]);

  const relativeNavigation = useMemo(() => {
    const rows = directoryPageQuery.data?.rows ?? [];
    if (rows.length === 0) {
      return null;
    }

    const currentIndex = rows.findIndex((row) => {
      const rowRouteRef = getDirectoryRouteRefFromRow(row);
      if (routeRef.kind === 'client') {
        if (rowRouteRef.kind !== 'client') {
          return false;
        }

        return rowRouteRef.clientNumber === routeRef.clientNumber;
      }

      if (rowRouteRef.kind !== 'prospect') {
        return false;
      }

      return rowRouteRef.id === routeRef.id;
    });

    if (currentIndex === -1) {
      return null;
    }

    const previousRouteRef = currentIndex > 0 ? getDirectoryRouteRefFromRow(rows[currentIndex - 1]!) : null;
    const nextRouteRef = currentIndex < (rows.length - 1) ? getDirectoryRouteRefFromRow(rows[currentIndex + 1]!) : null;

    return {
      previousDisabled: previousRouteRef === null,
      nextDisabled: nextRouteRef === null,
      onOpenPrevious: previousRouteRef ? () => navigateToRouteRef(previousRouteRef) : undefined,
      onOpenNext: nextRouteRef ? () => navigateToRouteRef(nextRouteRef) : undefined
    };
  }, [directoryPageQuery.data?.rows, navigateToRouteRef, routeRef]);

  return (
    <ClientDirectoryRecordDetails
      routeRef={routeRef}
      search={search}
      onDeleteSuccess={handleDeleteSuccess}
      relativeNavigation={relativeNavigation}
    />
  );
};

export default ClientDirectoryDetailPage;
