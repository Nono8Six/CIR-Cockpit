import { memo } from 'react';
import AppMainStateView from './app-main/AppMainStateView';
import AppMainTabContent from './app-main/AppMainTabContent';
import type { AppMainContentProps } from './app-main/AppMainContent.types';

const AppMainContent = ({
  activeTab,
  mainViewState,
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
  onOpenGlobalSearch,
  onReloadData
}: AppMainContentProps) => {
  return (
    <main id="main-content" className="relative flex-1 overflow-y-auto overflow-x-clip p-2 sm:p-4">
      <div className="min-h-full w-full max-w-[1600px] mx-auto transition-opacity duration-200">
        <AppMainStateView
          mainViewState={mainViewState}
          onReloadData={onReloadData}
        />
        {mainViewState.kind === 'ready' && (
          <AppMainTabContent
            activeTab={activeTab}
            activeAgencyId={activeAgencyId}
            config={config}
            interactions={interactions}
            userId={userId}
            userRole={userRole}
            recentEntities={recentEntities}
            entitySearchIndex={entitySearchIndex}
            entitySearchLoading={entitySearchLoading}
            canAccessSettings={canAccessSettings}
            canEditSettings={canEditSettings}
            canAccessAdmin={canAccessAdmin}
            focusedClientId={focusedClientId}
            focusedContactId={focusedContactId}
            onFocusHandled={onFocusHandled}
            onSaveInteraction={onSaveInteraction}
            onRequestConvert={onRequestConvert}
            onOpenGlobalSearch={onOpenGlobalSearch}
          />
        )}
      </div>
    </main>
  );
};

export default memo(AppMainContent);
