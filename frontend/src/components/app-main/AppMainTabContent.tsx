import { Suspense, lazy } from 'react';

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
  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
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
  if (activeTab === 'cockpit') {
    return (
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
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <Suspense fallback={ROUTE_LOADING_FALLBACK}>
        <Dashboard
          interactions={interactions}
          statuses={config.statuses}
          agencyId={activeAgencyId}
          onRequestConvert={onRequestConvert}
        />
      </Suspense>
    );
  }

  if (activeTab === 'settings' && canAccessSettings) {
    return (
      <Suspense fallback={ROUTE_LOADING_FALLBACK}>
        <Settings config={config} canEdit={canEditSettings} agencyId={activeAgencyId} />
      </Suspense>
    );
  }

  if (activeTab === 'clients') {
    return (
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
    );
  }

  if (activeTab === 'admin' && canAccessAdmin) {
    return (
      <Suspense fallback={ROUTE_LOADING_FALLBACK}>
        <AdminPanel userRole={userRole} />
      </Suspense>
    );
  }

  return null;
};

export default AppMainTabContent;
