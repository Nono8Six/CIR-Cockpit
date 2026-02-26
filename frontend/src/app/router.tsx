import { Navigate, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import App from '@/App';
import { APP_TAB_PATHS } from '@/app/appRoutes';

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

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'clients',
  component: () => null
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  cockpitRoute,
  dashboardRoute,
  clientsRoute,
  adminRoute,
  settingsRoute
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
