import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouteMask,
  createRouter
} from '@tanstack/react-router';

import App from '@/App';
import { APP_TAB_PATHS } from '@/app/appRoutes';
import ClientDirectoryConvertPage from '@/components/client-directory/ClientDirectoryConvertPage';
import ClientDirectoryDrawerRoute from '@/components/client-directory/ClientDirectoryDrawerRoute';
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

export const clientRecordDrawerRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '$clientNumber/drawer',
  validateSearch: validateDirectorySearch,
  component: () => {
    const { clientNumber } = clientRecordDrawerRoute.useParams();
    const search = clientRecordDrawerRoute.useSearch();
    return <ClientDirectoryDrawerRoute routeRef={{ kind: 'client', clientNumber }} search={search} />;
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

export const prospectRecordDrawerRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'prospects/$prospectId/drawer',
  validateSearch: validateDirectorySearch,
  component: () => {
    const { prospectId } = prospectRecordDrawerRoute.useParams();
    const search = prospectRecordDrawerRoute.useSearch();
    return <ClientDirectoryDrawerRoute routeRef={{ kind: 'prospect', id: prospectId }} search={search} />;
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
    clientRecordDrawerRoute,
    clientRecordRoute,
    prospectRecordDrawerRoute,
    prospectRecordRoute
  ]),
  adminRoute,
  settingsRoute,
  uiPocRoute
]);

const clientDrawerRouteMask = createRouteMask({
  routeTree,
  from: '/clients/$clientNumber/drawer',
  to: '/clients/$clientNumber',
  params: true
});

const prospectDrawerRouteMask = createRouteMask({
  routeTree,
  from: '/clients/prospects/$prospectId/drawer',
  to: '/clients/prospects/$prospectId',
  params: true
});

export const appRouter = createRouter({
  routeTree,
  defaultPreload: 'intent',
  routeMasks: [clientDrawerRouteMask, prospectDrawerRouteMask]
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRouter;
  }
}
