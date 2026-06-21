import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';

import App from '@/App';
import { APP_TAB_PATHS } from '@/app/appRoutes';
import ClientDirectoryConvertPage from '@/components/client-directory/ClientDirectoryConvertPage';
import ClientDirectoryCreatePage from '@/components/client-directory/ClientDirectoryCreatePage';
import ClientDirectoryDetailPage from '@/components/client-directory/ClientDirectoryDetailPage';
import ClientDirectoryPage from '@/components/client-directory/ClientDirectoryPage';
import { validateDirectorySearch } from '@/components/client-directory/clientDirectorySearch';
import AdminIndexPage from '@/components/admin-suppliers/AdminIndexPage';
import AdminSupplierCreatePage from '@/components/admin-suppliers/AdminSupplierCreatePage';
import AdminSuppliersPage from '@/components/admin-suppliers/AdminSuppliersPage';
import {
  DEFAULT_SUPPLIER_SEARCH,
  validateSupplierDirectorySearch
} from '@/components/admin-suppliers/supplierDirectorySearch';
import { validateDashboardSearch } from '@/app/dashboardSearch';

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => <Navigate to={APP_TAB_PATHS.cockpit} replace />
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null
});

const cockpitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'cockpit',
  component: () => null
});

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'dashboard',
  validateSearch: validateDashboardSearch,
  component: () => null
});

export const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'clients',
  component: () => <Outlet />
});

export const suppliersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'suppliers',
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

export const clientRecordEditRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: '$clientNumber/edit',
  component: () => {
    const { clientNumber } = clientRecordEditRoute.useParams();
    return <ClientDirectoryDetailPage routeRef={{ kind: 'client', clientNumber }} isEditOpen />;
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

export const prospectRecordEditRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'prospects/$prospectId/edit',
  component: () => {
    const { prospectId } = prospectRecordEditRoute.useParams();
    return <ClientDirectoryDetailPage routeRef={{ kind: 'prospect', id: prospectId }} isEditOpen />;
  }
});

export const suppliersIndexRoute = createRoute({
  getParentRoute: () => suppliersRoute,
  path: '/',
  validateSearch: validateSupplierDirectorySearch,
  component: AdminSuppliersPage
});

export const supplierCreateRoute = createRoute({
  getParentRoute: () => suppliersRoute,
  path: 'new',
  component: AdminSupplierCreatePage
});

export const supplierRecordRoute = createRoute({
  getParentRoute: () => suppliersRoute,
  path: '$supplierId',
  component: () => {
    const { supplierId } = supplierRecordRoute.useParams();
    return <ClientDirectoryDetailPage routeRef={{ kind: 'supplier', id: supplierId }} />;
  }
});

export const supplierRecordEditRoute = createRoute({
  getParentRoute: () => suppliersRoute,
  path: '$supplierId/edit',
  component: () => {
    const { supplierId } = supplierRecordEditRoute.useParams();
    return <ClientDirectoryDetailPage routeRef={{ kind: 'supplier', id: supplierId }} isEditOpen />;
  }
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'admin',
  component: () => <Outlet />
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/',
  component: AdminIndexPage
});

const adminSupplierCreateRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'suppliers/new',
  component: () => <Navigate to="/suppliers/new" replace />
});

const adminSuppliersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'suppliers',
  validateSearch: validateSupplierDirectorySearch,
  component: () => <Navigate to="/suppliers" search={() => DEFAULT_SUPPLIER_SEARCH} replace />
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
  clientsRoute.addChildren([
    clientsIndexRoute,
    clientsCreateRoute,
    prospectConvertRoute,
    clientRecordEditRoute,
    prospectRecordEditRoute,
    clientRecordRoute,
    prospectRecordRoute
  ]),
  suppliersRoute.addChildren([
    suppliersIndexRoute,
    supplierCreateRoute,
    supplierRecordEditRoute,
    supplierRecordRoute
  ]),
  adminRoute.addChildren([
    adminIndexRoute,
    adminSuppliersRoute,
    adminSupplierCreateRoute
  ]),
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
