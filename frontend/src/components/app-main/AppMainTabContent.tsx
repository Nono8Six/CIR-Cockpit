import { Suspense, lazy, useEffect, useRef } from 'react';
import { Outlet } from '@tanstack/react-router';

import type { AgencyConfig } from '@/services/config';
import type { AppTab, Entity, Interaction, InteractionDraft, UserRole } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { EntityContact } from '@/types';

const loadCockpitForm = () => import('@/components/CockpitForm');
const loadDashboard = () => import('@/components/Dashboard');
const loadSettings = () => import('@/components/Settings');
const loadAdminPanel = () => import('@/components/AdminPanel');

const CockpitForm = lazy(loadCockpitForm);
const Dashboard = lazy(loadDashboard);
const Settings = lazy(loadSettings);
const AdminPanel = lazy(loadAdminPanel);

const ROUTE_LOADING_FALLBACK = (
  <div className="flex h-full min-h-0 flex-col gap-3 p-6">
    <div className="flex items-center gap-3">
      <div className="skeleton-shimmer h-7 w-36 rounded-lg" />
      <div className="skeleton-shimmer h-7 w-24 rounded-lg" />
    </div>
    <div className="flex gap-3 flex-1 mt-2">
      <div className="skeleton-shimmer flex-1 rounded-xl" />
      <div className="skeleton-shimmer w-72 rounded-xl" />
    </div>
  </div>
);

type AppMainTabContentProps = {
  activeTab: AppTab;
  activeAgencyId: string | null;
  config: AgencyConfig;
  interactions: Interaction[];
  userId: string | null;
  userRole: UserRole;
  recentEntities: Entity[];
  entitySearchIndex: {
    entities: Entity[];
    contacts: EntityContact[];
  };
  entitySearchLoading: boolean;
  canAccessSettings: boolean;
  canEditAgencySettings: boolean;
  canEditProductSettings: boolean;
  canAccessAdmin: boolean;
  focusedClientId: string | null;
  focusedContactId: string | null;
  onFocusHandled: () => void;
  onSaveInteraction: (draft: InteractionDraft) => Promise<boolean>;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  onOpenGlobalSearch: () => void;
};

const KEEP_ALIVE_TABS: AppTab[] = ['cockpit', 'dashboard', 'clients', 'settings', 'admin'];

const AppMainTabContent = (props: AppMainTabContentProps) => {
  const {
    activeTab,
    activeAgencyId,
    config,
    interactions,
    userId,
    userRole,
    recentEntities,
    entitySearchIndex,
    entitySearchLoading,
    canAccessSettings,
    canEditAgencySettings,
    canEditProductSettings,
    canAccessAdmin,
    onSaveInteraction,
    onRequestConvert,
    onOpenGlobalSearch
  } = props;
  useEffect(() => {
    void loadCockpitForm();
    void loadDashboard();
    void loadSettings();
    void loadAdminPanel();
  }, []);

  const visitedTabsRef = useRef<Record<AppTab, boolean>>({
    cockpit: activeTab === 'cockpit',
    dashboard: activeTab === 'dashboard',
    clients: activeTab === 'clients',
    settings: activeTab === 'settings' && canAccessSettings,
    admin: activeTab === 'admin' && canAccessAdmin
  });

  const isAllowedActiveTab =
    (activeTab !== 'settings' || canAccessSettings)
    && (activeTab !== 'admin' || canAccessAdmin);
  if (isAllowedActiveTab) {
    visitedTabsRef.current[activeTab] = true;
  }

  return (
    <>
      {KEEP_ALIVE_TABS.map((tab) => {
        const isActive = activeTab === tab;
        const isAllowed =
          tab === 'settings'
            ? canAccessSettings
            : tab === 'admin'
              ? canAccessAdmin
              : true;

        if (!isAllowed || !visitedTabsRef.current[tab]) {
          return null;
        }

        return (
          <section
            key={tab}
            hidden={!isActive}
            className="flex h-full min-h-0 flex-col"
            data-state={isActive ? 'active' : 'inactive'}
            data-testid={`app-main-tab-${tab}`}
          >
            {tab === 'cockpit' ? (
              <div className="min-h-0 flex-1">
                <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                  <CockpitForm
                    onSave={onSaveInteraction}
                    config={config}
                    activeAgencyId={activeAgencyId}
                    userId={userId}
                    userRole={userRole}
                    recentEntities={recentEntities}
                    interactions={interactions}
                    entitySearchIndex={entitySearchIndex}
                    entitySearchLoading={entitySearchLoading}
                    onOpenGlobalSearch={onOpenGlobalSearch}
                  />
                </Suspense>
              </div>
            ) : null}

            {tab === 'dashboard' ? (
              <div className="min-h-0 flex-1">
                <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                  <Dashboard
                    interactions={interactions}
                    statuses={config.statuses}
                    agencyId={activeAgencyId}
                    onRequestConvert={onRequestConvert}
                  />
                </Suspense>
              </div>
            ) : null}

            {tab === 'settings' ? (
              <div className="min-h-0 flex-1">
                <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                  <Settings
                    config={config}
                    canEditAgencySettings={canEditAgencySettings}
                    canEditProductSettings={canEditProductSettings}
                    agencyId={activeAgencyId}
                  />
                </Suspense>
              </div>
            ) : null}

            {tab === 'clients' ? (
              <div className="min-h-0 flex-1">
                <Outlet />
              </div>
            ) : null}

            {tab === 'admin' ? (
              <div className="min-h-0 flex-1">
                <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                  <AdminPanel userRole={userRole} />
                </Suspense>
              </div>
            ) : null}
          </section>
        );
      })}
    </>
  );
};

export default AppMainTabContent;
