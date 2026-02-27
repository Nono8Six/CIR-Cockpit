import { Suspense, lazy, useEffect, useState } from 'react';

import type { AgencyConfig } from '@/services/config';
import type { AppTab, Entity, Interaction, InteractionDraft, UserRole } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { EntityContact } from '@/types';

const CockpitForm = lazy(() => import('@/components/CockpitForm'));
const Dashboard = lazy(() => import('@/components/Dashboard'));
const Settings = lazy(() => import('@/components/Settings'));
const ClientsPanel = lazy(() => import('@/components/ClientsPanel'));
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

const ROUTE_LOADING_FALLBACK = (
  <div className="h-full flex items-center justify-center text-muted-foreground/80 text-sm">
    Chargement de la vue...
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
  canEditSettings: boolean;
  canAccessAdmin: boolean;
  focusedClientId: string | null;
  focusedContactId: string | null;
  onFocusHandled: () => void;
  onSaveInteraction: (draft: InteractionDraft) => Promise<boolean>;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  onOpenGlobalSearch: () => void;
};

const KEEP_ALIVE_TABS: AppTab[] = ['cockpit', 'dashboard', 'clients', 'settings', 'admin'];

const AppMainTabContent = ({
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
  canEditSettings,
  canAccessAdmin,
  focusedClientId,
  focusedContactId,
  onFocusHandled,
  onSaveInteraction,
  onRequestConvert,
  onOpenGlobalSearch
}: AppMainTabContentProps) => {
  const [visitedTabs, setVisitedTabs] = useState<Record<AppTab, boolean>>({
    cockpit: activeTab === 'cockpit',
    dashboard: activeTab === 'dashboard',
    clients: activeTab === 'clients',
    settings: activeTab === 'settings' && canAccessSettings,
    admin: activeTab === 'admin' && canAccessAdmin
  });

  useEffect(() => {
    if (activeTab === 'settings' && !canAccessSettings) {
      return;
    }

    if (activeTab === 'admin' && !canAccessAdmin) {
      return;
    }

    setVisitedTabs((previous) => {
      if (previous[activeTab]) {
        return previous;
      }

      return {
        ...previous,
        [activeTab]: true
      };
    });
  }, [activeTab, canAccessAdmin, canAccessSettings]);

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

        if (!isAllowed || !visitedTabs[tab]) {
          return null;
        }

        return (
          <section
            key={tab}
            className={isActive ? 'h-full' : 'hidden'}
            aria-hidden={!isActive}
            data-testid={`app-main-tab-${tab}`}
          >
            {tab === 'cockpit' ? (
              <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                <CockpitForm
                  onSave={onSaveInteraction}
                  config={config}
                  activeAgencyId={activeAgencyId}
                  userId={userId}
                  userRole={userRole}
                  recentEntities={recentEntities}
                  entitySearchIndex={entitySearchIndex}
                  entitySearchLoading={entitySearchLoading}
                  onOpenGlobalSearch={onOpenGlobalSearch}
                />
              </Suspense>
            ) : null}

            {tab === 'dashboard' ? (
              <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                <Dashboard
                  interactions={interactions}
                  statuses={config.statuses}
                  agencyId={activeAgencyId}
                  onRequestConvert={onRequestConvert}
                />
              </Suspense>
            ) : null}

            {tab === 'settings' ? (
              <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                <Settings config={config} canEdit={canEditSettings} agencyId={activeAgencyId} />
              </Suspense>
            ) : null}

            {tab === 'clients' ? (
              <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                <ClientsPanel
                  activeAgencyId={activeAgencyId}
                  userRole={userRole}
                  focusedClientId={focusedClientId}
                  focusedContactId={focusedContactId}
                  onFocusHandled={onFocusHandled}
                  onRequestConvert={onRequestConvert}
                />
              </Suspense>
            ) : null}

            {tab === 'admin' ? (
              <Suspense fallback={ROUTE_LOADING_FALLBACK}>
                <AdminPanel userRole={userRole} />
              </Suspense>
            ) : null}
          </section>
        );
      })}
    </>
  );
};

export default AppMainTabContent;
