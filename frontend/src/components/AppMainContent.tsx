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
  canEditAgencySettings,
  canEditProductSettings,
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
    <main id="main-content" className="relative flex-1 min-h-0 overflow-hidden p-2 sm:p-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col transition-opacity duration-200">
        <AppMainStateView
          mainViewState={mainViewState}
          activeTab={activeTab}
          onReloadData={onReloadData}
        />
        {mainViewState.kind === 'ready' && (
          <div className="min-h-0 flex-1">
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
              canEditAgencySettings={canEditAgencySettings}
              canEditProductSettings={canEditProductSettings}
              canAccessAdmin={canAccessAdmin}
              focusedClientId={focusedClientId}
              focusedContactId={focusedContactId}
              onFocusHandled={onFocusHandled}
              onSaveInteraction={onSaveInteraction}
              onRequestConvert={onRequestConvert}
              onOpenGlobalSearch={onOpenGlobalSearch}
            />
          </div>
        )}
      </div>
    </main>
  );
};

export default memo(AppMainContent);
