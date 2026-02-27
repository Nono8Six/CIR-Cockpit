import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';

import AppHeader from './components/AppHeader';
import AppMainContent from './components/AppMainContent';
import type { AppMainViewState } from './components/app-main/AppMainContent.types';
import type { ConvertClientEntity } from './components/ConvertClientDialog';
import { useAgencyConfig } from './hooks/useAgencyConfig';
import { useAppSessionActions, useAppSessionStateContext } from './hooks/useAppSession';
import { useEntitySearchIndex } from './hooks/useEntitySearchIndex';
import { useInteractions } from './hooks/useInteractions';
import { useRealtimeInteractions } from './hooks/useRealtimeInteractions';
import { useSaveInteraction } from './hooks/useSaveInteraction';
import { getAppGate } from './app/getAppGate';
import { getPathForTab, getTabFromPathname, isInteractionTab } from './app/appRoutes';
import { EMPTY_CONFIG, ROLE_BADGE_STYLES, ROLE_LABELS, buildNavigationTabs } from './app/appConstants';
import { getDefaultStatusId, useAppSearchData } from './app/useAppSearchData';
import { useAppShortcuts } from './app/useAppShortcuts';
import { useProfileMenuDismiss } from './app/useProfileMenuDismiss';
import { convertEntityToClient, type ConvertClientPayload } from './services/entities/convertEntityToClient';
import { handleUiError } from './services/errors/handleUiError';
import { notifySuccess } from './services/errors/notify';
import { invalidateClientsQueries, invalidateEntitySearchIndexQueries } from './services/query/queryInvalidation';
import { prefetchAdminPanelQueries, prefetchClientsPanelQueries } from './services/query/queryPrefetch';
import type { AppTab, InteractionDraft } from './types';

const loadAppSearchOverlay = () => import('./components/AppSearchOverlay');
const loadConvertClientDialog = () => import('./components/ConvertClientDialog');

const AppSearchOverlay = lazy(loadAppSearchOverlay);
const ConvertClientDialog = lazy(loadConvertClientDialog);

let appSearchOverlayPreloadPromise: Promise<unknown> | null = null;
let convertClientDialogPreloadPromise: Promise<unknown> | null = null;

const preloadAppSearchOverlay = (): Promise<unknown> => {
  appSearchOverlayPreloadPromise ??= loadAppSearchOverlay();
  return appSearchOverlayPreloadPromise;
};

const preloadConvertClientDialog = (): Promise<unknown> => {
  convertClientDialogPreloadPromise ??= loadConvertClientDialog();
  return convertClientDialogPreloadPromise;
};

const App = () => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const sessionState = useAppSessionStateContext();
  const sessionActions = useAppSessionActions();
  const activeTab = useMemo<AppTab>(() => getTabFromPathname(pathname), [pathname]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [focusedClientId, setFocusedClientId] = useState<string | null>(null);
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const [convertTarget, setConvertTarget] = useState<ConvertClientEntity | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const userRole = sessionState.profile?.role ?? 'tcs';
  const canAccessSettings = userRole !== 'tcs';
  const canEditSettings = userRole === 'super_admin';
  const canAccessAdmin = userRole !== 'tcs';
  const configQuery = useAgencyConfig(sessionState.activeAgencyId, sessionState.canLoadData);
  const interactionsQuery = useInteractions(sessionState.activeAgencyId, sessionState.canLoadData);
  const saveInteractionMutation = useSaveInteraction(sessionState.activeAgencyId);
  useRealtimeInteractions(sessionState.activeAgencyId, sessionState.canLoadData);

  const shouldLoadEntityIndex = isSearchOpen || activeTab === 'clients' || activeTab === 'cockpit';
  const entitySearchQuery = useEntitySearchIndex(sessionState.activeAgencyId, false, shouldLoadEntityIndex);
  const config = useMemo(() => configQuery.data ?? EMPTY_CONFIG, [configQuery.data]);
  const interactions = useMemo(() => interactionsQuery.data ?? [], [interactionsQuery.data]);
  const entitySearchIndex = useMemo(() => entitySearchQuery.data ?? { entities: [], contacts: [] }, [entitySearchQuery.data]);
  const searchData = useAppSearchData({ searchQuery, interactions, entitySearchIndex, defaultStatusId: getDefaultStatusId(config.statuses) });
  const mainViewState = useMemo<AppMainViewState>(() => {
    if (!isInteractionTab(activeTab)) {
      return { kind: 'ready' };
    }

    if (sessionState.isContextLoading && !sessionState.agencyContext) {
      return { kind: 'context-loading' };
    }

    if (sessionState.canLoadData && (configQuery.isLoading || interactionsQuery.isLoading)) {
      return { kind: 'data-loading' };
    }

    if (configQuery.isError || interactionsQuery.isError) {
      return { kind: 'data-error' };
    }

    if (!sessionState.activeAgencyId) {
      return {
        kind: 'missing-agency',
        contextError: sessionState.contextError
      };
    }

    return { kind: 'ready' };
  }, [
    activeTab,
    configQuery.isError,
    configQuery.isLoading,
    interactionsQuery.isError,
    interactionsQuery.isLoading,
    sessionState.activeAgencyId,
    sessionState.agencyContext,
    sessionState.canLoadData,
    sessionState.contextError,
    sessionState.isContextLoading
  ]);

  const handleTabChange = useCallback(
    (tab: AppTab) => {
      void navigate({ to: getPathForTab(tab) });
    },
    [navigate]
  );

  const handleSearchIntent = useCallback(() => {
    void preloadAppSearchOverlay();
  }, []);

  const handleSearchOpenChange = useCallback((open: boolean) => {
    if (open) {
      void preloadAppSearchOverlay();
    }
    setIsSearchOpen(open);
  }, []);

  const handleOpenSearch = useCallback(() => {
    void preloadAppSearchOverlay();
    setIsSearchOpen(true);
  }, []);

  const handleRequestConvert = useCallback((entity: ConvertClientEntity) => {
    void preloadConvertClientDialog();
    setConvertTarget(entity);
    setIsSearchOpen(false);
    setSearchQuery('');
  }, []);

  useAppShortcuts({
    canAccessAdmin,
    canAccessSettings,
    setActiveTab: handleTabChange,
    setIsSearchOpen: handleSearchOpenChange
  });
  useProfileMenuDismiss(profileMenuRef, isProfileMenuOpen, setIsProfileMenuOpen);

  useEffect(() => {
    if ((activeTab === 'settings' && !canAccessSettings) || (activeTab === 'admin' && !canAccessAdmin)) {
      void navigate({ to: getPathForTab('cockpit'), replace: true });
    }
  }, [activeTab, canAccessAdmin, canAccessSettings, navigate]);

  useEffect(() => {
    if (activeTab === 'clients' && sessionState.activeAgencyId) {
      void prefetchClientsPanelQueries(queryClient, sessionState.activeAgencyId);
    }
    if (activeTab === 'admin' && canAccessAdmin) {
      void prefetchAdminPanelQueries(queryClient);
    }
  }, [activeTab, canAccessAdmin, queryClient, sessionState.activeAgencyId]);

  const handleSaveInteraction = useCallback(async (draft: InteractionDraft) => {
    try {
      await saveInteractionMutation.mutateAsync(draft);
      notifySuccess("Interaction enregistrée avec succès");
      return true;
    } catch {
      return false;
    }
  }, [saveInteractionMutation]);

  const handleSignOut = useCallback(async () => {
    if (await sessionActions.signOutUser()) {
      void navigate({ to: getPathForTab('cockpit'), replace: true });
    }
  }, [navigate, sessionActions]);

  const gate = getAppGate({
    authReady: sessionState.authReady,
    session: sessionState.session,
    profileLoading: sessionState.profileLoading,
    profile: sessionState.profile,
    profileError: sessionState.profileError,
    mustChangePassword: sessionState.mustChangePassword,
    onProfileRetry: sessionActions.retryProfile,
    onSignOut: () => void handleSignOut(),
    onPasswordChanged: sessionActions.refreshProfile
  });
  if (gate) return gate;

  const navigationTabs = buildNavigationTabs(canAccessAdmin, searchData.pendingCount);

  return (
    <div className="min-h-[100dvh] w-screen flex flex-col bg-surface-1/70 overflow-hidden text-foreground font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-foreground focus:shadow-md"
      >
        Passer au contenu
      </a>
      <AppHeader
        agencyContext={sessionState.agencyContext}
        agencyMemberships={sessionState.agencyMemberships}
        hasMultipleAgencies={sessionState.agencyMemberships.length > 1}
        userRole={userRole}
        sessionEmail={sessionState.session?.user?.email ?? 'Utilisateur'}
        profileLoading={sessionState.profileLoading}
        isContextRefreshing={sessionState.isContextLoading && Boolean(sessionState.agencyContext)}
        activeTab={activeTab}
        navigationTabs={navigationTabs}
        isSettingsDisabled={!canAccessSettings}
        isProfileMenuOpen={isProfileMenuOpen}
        profileMenuRef={profileMenuRef}
        hasProfileMenu
        roleLabels={ROLE_LABELS}
        roleBadgeStyles={ROLE_BADGE_STYLES}
        onTabChange={handleTabChange}
        onAgencyChange={async (agencyId) => {
          if (await sessionActions.changeActiveAgency(agencyId)) notifySuccess('Agence active mise à jour');
        }}
        onOpenSearch={handleOpenSearch}
        onSearchIntent={handleSearchIntent}
        onToggleProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
        onOpenSettings={() => {
          handleTabChange('settings');
          setIsProfileMenuOpen(false);
        }}
        onSignOut={() => void handleSignOut()}
      />
      <AppMainContent
        activeTab={activeTab}
        mainViewState={mainViewState}
        activeAgencyId={sessionState.activeAgencyId}
        config={config}
        interactions={interactions}
        userId={sessionState.session?.user?.id ?? null}
        userRole={userRole}
        recentEntities={searchData.recentEntities}
        entitySearchIndex={entitySearchIndex}
        entitySearchLoading={entitySearchQuery.isLoading}
        canAccessSettings={canAccessSettings}
        canEditSettings={canEditSettings}
        canAccessAdmin={canAccessAdmin}
        focusedClientId={focusedClientId}
        focusedContactId={focusedContactId}
        onFocusHandled={() => {
          setFocusedClientId(null);
          setFocusedContactId(null);
        }}
        onSaveInteraction={handleSaveInteraction}
        onRequestConvert={handleRequestConvert}
        onOpenGlobalSearch={handleOpenSearch}
        onReloadData={() => {
          void configQuery.refetch();
          void interactionsQuery.refetch();
        }}
      />
      {isSearchOpen ? (
        <Suspense fallback={null}>
          <AppSearchOverlay
            open={isSearchOpen}
            onOpenChange={handleSearchOpenChange}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            filteredInteractions={searchData.filteredInteractions}
            filteredClients={searchData.filteredClients}
            filteredProspects={searchData.filteredProspects}
            filteredContacts={searchData.filteredContacts}
            hasSearchResults={searchData.hasSearchResults}
            isEntitySearchLoading={entitySearchQuery.isLoading}
            entitySearchError={entitySearchQuery.error}
            onRetrySearch={async () => entitySearchQuery.refetch()}
            entityNameById={searchData.entityNameById}
            onOpenInteraction={() => {
              handleTabChange('dashboard');
              setIsSearchOpen(false);
            }}
            onFocusClient={(clientId, contactId) => {
              setFocusedClientId(clientId);
              setFocusedContactId(contactId ?? null);
              handleTabChange('clients');
              setIsSearchOpen(false);
            }}
            onRequestConvert={handleRequestConvert}
          />
        </Suspense>
      ) : null}
      {convertTarget ? (
        <Suspense fallback={null}>
          <ConvertClientDialog
            open={Boolean(convertTarget)}
            onOpenChange={(open) => {
              if (!open) setConvertTarget(null);
            }}
            entity={convertTarget}
            onConvert={async (payload: ConvertClientPayload) => {
              const result = await convertEntityToClient(payload).match(
                (updated) => updated,
                (error) => {
                  handleUiError(error, 'Impossible de convertir en client.', {
                    source: 'App.convertEntityToClient'
                  });
                  return null;
                }
              );
              if (!result) return;
              void invalidateClientsQueries(queryClient, sessionState.activeAgencyId);
              void invalidateEntitySearchIndexQueries(queryClient, sessionState.activeAgencyId);
              setConvertTarget(null);
              notifySuccess('Prospect converti en client');
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default App;


