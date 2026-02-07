import CockpitForm from '@/components/CockpitForm';
import Dashboard from '@/components/Dashboard';
import Settings from '@/components/Settings';
import ClientsPanel from '@/components/ClientsPanel';
import AdminPanel from '@/components/AdminPanel';
import type { AgencyConfig } from '@/services/config';
import type { AppTab, Entity, Interaction, InteractionDraft, UserRole } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { EntityContact } from '@/types';

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
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <Dashboard
        interactions={interactions}
        statuses={config.statuses}
        agencyId={activeAgencyId}
        onRequestConvert={onRequestConvert}
      />
    );
  }

  if (activeTab === 'settings' && canAccessSettings) {
    return <Settings config={config} canEdit={canEditSettings} agencyId={activeAgencyId} />;
  }

  if (activeTab === 'clients') {
    return (
      <ClientsPanel
        activeAgencyId={activeAgencyId}
        userRole={userRole}
        focusedClientId={focusedClientId}
        focusedContactId={focusedContactId}
        onFocusHandled={onFocusHandled}
        onRequestConvert={onRequestConvert}
      />
    );
  }

  if (activeTab === 'admin' && canAccessAdmin) {
    return <AdminPanel userRole={userRole} />;
  }

  return null;
};

export default AppMainTabContent;
