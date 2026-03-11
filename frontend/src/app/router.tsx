import { Navigate, Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import App from '@/App';
import { APP_TAB_PATHS } from '@/app/appRoutes';
import ClientDirectoryConvertPage from '@/components/client-directory/ClientDirectoryConvertPage';
import ClientDirectoryCreatePage from '@/components/client-directory/ClientDirectoryCreatePage';
import ClientDirectoryDetailPage from '@/components/client-directory/ClientDirectoryDetailPage';
import ClientDirectoryPage from '@/components/client-directory/ClientDirectoryPage';
import { validateDirectorySearch } from '@/components/client-directory/clientDirectorySearch';

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => <Navigate to={APP_TAB_PATHS.cockpit} replace />
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to={APP_TAB_PATHS.cockpit} replace />
});

const cockpitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'cockpit',
  component: () => null
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'dashboard',
  component: () => null
});

export const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'clients',
  component: () => <Outlet />
});

export const clientsIndexRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '/',
  validateSearch: validateDirectorySearch,
  component: ClientDirectoryPage
});

export const clientsCreateRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'new',
  validateSearch: validateDirectorySearch,
  component: ClientDirectoryCreatePage
});

export const clientRecordRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '$clientNumber',
  component: () => {
    const { clientNumber } = clientRecordRoute.useParams();
    return <ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber }} />;
  }
});

export const prospectConvertRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'prospects/$prospectId/convert',
  component: () => {
    const { prospectId } = prospectConvertRoute.useParams();
    return <ClientDirectoryConvertPage prospectId={prospectId} />;
  }
});

export const prospectRecordRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'prospects/$prospectId',
  component: () => {
    const { prospectId } = prospectRecordRoute.useParams();
    return <ClientDirectoryDetailPage routeRef={{ kind: 'prospect', id: prospectId }} />;
  }
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'admin',
  component: () => null
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'settings',
  component: () => null
});

const uiPocRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'ui-poc',
  component: () => null
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  cockpitRoute,
  dashboardRoute,
  clientsRoute.addChildren([
    clientsIndexRoute,
    clientsCreateRoute,
    prospectConvertRoute,
    clientRecordRoute,
    prospectRecordRoute
  ]),
  adminRoute,
  settingsRoute,
  uiPocRoute
]);

export const appRouter = createRouter({
  routeTree,
  defaultPreload: 'intent'
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRouter;
  }
}
