import AppMainStateView from './app-main/AppMainStateView';
import AppMainTabContent from './app-main/AppMainTabContent';
import type { AppMainContentProps } from './app-main/AppMainContent.types';

const AppMainContent = ({
  activeTab,
  isInteractionTab,
  isContextBlocking,
  isDataLoading,
  hasDataError,
  activeAgencyId,
  contextError,
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
    <main id="main-content" className="flex-1 p-4 overflow-hidden relative">
      <div className="h-full w-full max-w-[1600px] mx-auto transition-opacity duration-200">
        <AppMainStateView
          isContextBlocking={isContextBlocking}
          isDataLoading={isDataLoading}
          hasDataError={hasDataError}
          isInteractionTab={isInteractionTab}
          activeAgencyId={activeAgencyId}
          contextError={contextError}
          onReloadData={onReloadData}
        />
        {(!isInteractionTab || (activeAgencyId && !isContextBlocking && !isDataLoading && !hasDataError)) && (
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

export default AppMainContent;
