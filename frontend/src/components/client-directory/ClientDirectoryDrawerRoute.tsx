import { useCallback, useEffect, useState } from 'react';

import type {
  DirectoryListInput,
  DirectoryListRow,
  DirectoryRouteRef
} from 'shared/schemas/directory.schema';
import { useNavigate } from '@tanstack/react-router';

import ClientDirectoryRecordDetails from './ClientDirectoryRecordDetails';
import ClientDirectoryWorkspace from './ClientDirectoryWorkspace';
import { getDirectoryRouteRefFromRow } from './directoryRouting';
import {
  DESKTOP_DIRECTORY_DRAWER_QUERY,
  getIsDesktopDirectoryDrawerViewport
} from './directoryViewport';

export interface ClientDirectoryDrawerRouteProps {
  routeRef: DirectoryRouteRef;
  search: DirectoryListInput;
}

const ClientDirectoryDrawerRoute = ({
  routeRef,
  search
}: ClientDirectoryDrawerRouteProps) => {
  const navigate = useNavigate();
  const [isDesktopDrawerViewport, setIsDesktopDrawerViewport] = useState(getIsDesktopDirectoryDrawerViewport());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_DIRECTORY_DRAWER_QUERY);
    const updateViewport = (matches: boolean) => setIsDesktopDrawerViewport(matches);
    updateViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      const handleChange = (event: MediaQueryListEvent) => updateViewport(event.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    const legacyHandler = (event: MediaQueryListEvent) => updateViewport(event.matches);
    mediaQuery.addListener(legacyHandler);
    return () => mediaQuery.removeListener(legacyHandler);
  }, []);

  useEffect(() => {
    if (isDesktopDrawerViewport) {
      return;
    }

    if (routeRef.kind === 'client') {
      void navigate({
        to: '/clients/$clientNumber',
        params: { clientNumber: routeRef.clientNumber },
        replace: true
      });
      return;
    }

    void navigate({
      to: '/clients/prospects/$prospectId',
      params: { prospectId: routeRef.id },
      replace: true
    });
  }, [isDesktopDrawerViewport, navigate, routeRef]);

  const handleSearchChange = useCallback(
    (updater: (previous: DirectoryListInput) => DirectoryListInput) => {
      if (routeRef.kind === 'client') {
        void navigate({
          to: '/clients/$clientNumber/drawer',
          params: { clientNumber: routeRef.clientNumber },
          search: (previous) => updater({ ...search, ...previous })
        });
        return;
      }

      void navigate({
        to: '/clients/prospects/$prospectId/drawer',
        params: { prospectId: routeRef.id },
        search: (previous) => updater({ ...search, ...previous })
      });
    },
    [navigate, routeRef, search]
  );

  const handleOpenRecord = useCallback(
    (row: DirectoryListRow, effectiveSearch: DirectoryListInput) => {
      const nextRouteRef = getDirectoryRouteRefFromRow(row);

      if (nextRouteRef.kind === 'client') {
        void navigate({
          to: '/clients/$clientNumber/drawer',
          params: { clientNumber: nextRouteRef.clientNumber },
          search: () => effectiveSearch,
          replace: true,
          mask: {
            to: '/clients/$clientNumber',
            params: { clientNumber: nextRouteRef.clientNumber }
          }
        });
        return;
      }

      void navigate({
        to: '/clients/prospects/$prospectId/drawer',
        params: { prospectId: nextRouteRef.id },
        search: () => effectiveSearch,
        replace: true,
        mask: {
          to: '/clients/prospects/$prospectId',
          params: { prospectId: nextRouteRef.id }
        }
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

  const handleClose = useCallback(() => {
    if (globalThis.history.length > 1) {
      globalThis.history.back();
      return;
    }

    void navigate({
      to: '/clients',
      search: () => search,
      replace: true
    });
  }, [navigate, search]);

  if (!isDesktopDrawerViewport) {
    return null;
  }

  return (
    <ClientDirectoryWorkspace
      search={search}
      onSearchChange={handleSearchChange}
      onOpenRecord={handleOpenRecord}
      onCreateRecord={handleCreateRecord}
      detailPane={(
        <ClientDirectoryRecordDetails
          routeRef={routeRef}
          surface="drawer"
          onClose={handleClose}
          onDeleteSuccess={handleClose}
        />
      )}
    />
  );
};

export default ClientDirectoryDrawerRoute;
