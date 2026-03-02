import { Suspense, lazy, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';

import { EMPTY_CONFIG, ROLE_BADGE_STYLES, ROLE_LABELS, buildNavigationTabs } from '@/app/appConstants';
import { getAppGate } from '@/app/getAppGate';
import { getPathForTab, isInteractionTab } from '@/app/appRoutes';
import AppLayout from '@/components/AppLayout';
import type { AppMainViewState } from '@/components/app-main/AppMainContent.types';
import { useAppQueries } from '@/hooks/useAppQueries';
import { useAppSessionActions, useAppSessionStateContext } from '@/hooks/useAppSession';
import { useAppViewState } from '@/hooks/useAppViewState';
import { useSaveInteraction } from '@/hooks/useSaveInteraction';
import { convertEntityToClient, type ConvertClientPayload } from '@/services/entities/convertEntityToClient';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import { invalidateClientsQueries, invalidateEntitySearchIndexQueries } from '@/services/query/queryInvalidation';
import type { InteractionDraft } from '@/types';

const loadAppSearchOverlay = () => import('@/components/AppSearchOverlay');
const loadConvertClientDialog = () => import('@/components/ConvertClientDialog');

const AppSearchOverlay = lazy(loadAppSearchOverlay);
const ConvertClientDialog = lazy(loadConvertClientDialog);

let appSearchOverlayPreloadPromise: Promise<unknown> | null = null;
let convertClientDialogPreloadPromise: Promise<unknown> | null = null;

const preloadAppSearchOverlay = (): void => {
  appSearchOverlayPreloadPromise ??= loadAppSearchOverlay();
};

const preloadConvertClientDialog = (): void => {
  convertClientDialogPreloadPromise ??= loadConvertClientDialog();
};

const App = () => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const sessionState = useAppSessionStateContext();
  const sessionActions = useAppSessionActions();
  const queryClient = useQueryClient();

  const userRole = sessionState.profile?.role ?? 'tcs';
  const canAccessSettings = userRole !== 'tcs';
  const canEditSettings = userRole === 'super_admin';
  const canAccessAdmin = userRole !== 'tcs';

  const viewState = useAppViewState({
    pathname,
    navigate,
    queryClient,
    activeAgencyId: sessionState.activeAgencyId,
    canAccessAdmin,
    canAccessSettings,
    onSearchOpen: preloadAppSearchOverlay,
    onConvertOpen: preloadConvertClientDialog
  });

  const queries = useAppQueries({
    activeAgencyId: sessionState.activeAgencyId,
    canLoadData: sessionState.canLoadData,
    activeTab: viewState.activeTab,
    isSearchOpen: viewState.isSearchOpen,
    searchQuery: viewState.searchQuery
  });

  const saveInteractionMutation = useSaveInteraction(sessionState.activeAgencyId);

  const mainViewState = useMemo<AppMainViewState>(() => {
    if (!isInteractionTab(viewState.activeTab)) {
      return { kind: 'ready' };
    }

    if (sessionState.isContextLoading && !sessionState.agencyContext) {
      return { kind: 'context-loading' };
    }

    if (sessionState.canLoadData && (queries.configQuery.isLoading || queries.interactionsQuery.isLoading)) {
      return { kind: 'data-loading' };
    }

    if (queries.configQuery.isError || queries.interactionsQuery.isError) {
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
    queries.configQuery.isError,
    queries.configQuery.isLoading,
    queries.interactionsQuery.isError,
    queries.interactionsQuery.isLoading,
    sessionState.activeAgencyId,
    sessionState.agencyContext,
    sessionState.canLoadData,
    sessionState.contextError,
    sessionState.isContextLoading,
    viewState.activeTab
  ]);

  const handleSaveInteraction = useCallback(
    async (draft: InteractionDraft) => {
      try {
        await saveInteractionMutation.mutateAsync(draft);
        notifySuccess('Interaction enregistrée avec succès');
        return true;
      } catch {
        return false;
      }
    },
    [saveInteractionMutation]
  );

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
  if (gate) {
    return gate;
  }

  const navigationTabs = buildNavigationTabs(canAccessAdmin, queries.searchData.pendingCount);
  const config = queries.config ?? EMPTY_CONFIG;

  return (
    <AppLayout
      headerProps={{
        agencyContext: sessionState.agencyContext,
        agencyMemberships: sessionState.agencyMemberships,
        hasMultipleAgencies: sessionState.agencyMemberships.length > 1,
        userRole,
        sessionEmail: sessionState.session?.user?.email ?? 'Utilisateur',
        profileLoading: sessionState.profileLoading,
        isContextRefreshing: sessionState.isContextLoading && Boolean(sessionState.agencyContext),
        activeTab: viewState.activeTab,
        navigationTabs,
        isSettingsDisabled: !canAccessSettings,
        isProfileMenuOpen: viewState.isProfileMenuOpen,
        profileMenuRef: viewState.profileMenuRef,
        hasProfileMenu: true,
        roleLabels: ROLE_LABELS,
        roleBadgeStyles: ROLE_BADGE_STYLES,
        onTabChange: viewState.handleTabChange,
        onAgencyChange: async (agencyId) => {
          if (await sessionActions.changeActiveAgency(agencyId)) {
            notifySuccess('Agence active mise à jour');
          }
        },
        onOpenSearch: viewState.handleOpenSearch,
        onSearchIntent: preloadAppSearchOverlay,
        onToggleProfileMenu: () => viewState.setIsProfileMenuOpen((prev) => !prev),
        onOpenSettings: () => {
          viewState.handleTabChange('settings');
          viewState.setIsProfileMenuOpen(false);
        },
        onSignOut: () => void handleSignOut()
      }}
      mainContentProps={{
        activeTab: viewState.activeTab,
        mainViewState,
        activeAgencyId: sessionState.activeAgencyId,
        config,
        interactions: queries.interactions,
        userId: sessionState.session?.user?.id ?? null,
        userRole,
        recentEntities: queries.searchData.recentEntities,
        entitySearchIndex: queries.entitySearchIndex,
        entitySearchLoading: queries.entitySearchQuery.isLoading,
        canAccessSettings,
        canEditSettings,
        canAccessAdmin,
        focusedClientId: viewState.focusedClientId,
        focusedContactId: viewState.focusedContactId,
        onFocusHandled: () => {
          viewState.setFocusedClientId(null);
          viewState.setFocusedContactId(null);
        },
        onSaveInteraction: handleSaveInteraction,
        onRequestConvert: viewState.handleRequestConvert,
        onOpenGlobalSearch: viewState.handleOpenSearch,
        onReloadData: () => {
          void queries.configQuery.refetch();
          void queries.interactionsQuery.refetch();
        }
      }}
    >
      {viewState.isSearchOpen ? (
        <Suspense fallback={null}>
          <AppSearchOverlay
            open={viewState.isSearchOpen}
            onOpenChange={viewState.handleSearchOpenChange}
            searchQuery={viewState.searchQuery}
            onSearchQueryChange={viewState.setSearchQuery}
            filteredInteractions={queries.searchData.filteredInteractions}
            filteredClients={queries.searchData.filteredClients}
            filteredProspects={queries.searchData.filteredProspects}
            filteredContacts={queries.searchData.filteredContacts}
            hasSearchResults={queries.searchData.hasSearchResults}
            isEntitySearchLoading={queries.entitySearchQuery.isLoading}
            entitySearchError={queries.entitySearchQuery.error}
            onRetrySearch={async () => queries.entitySearchQuery.refetch()}
            entityNameById={queries.searchData.entityNameById}
            onOpenInteraction={() => {
              viewState.handleTabChange('dashboard');
              viewState.handleSearchOpenChange(false);
            }}
            onFocusClient={(clientId, contactId) => {
              viewState.setFocusedClientId(clientId);
              viewState.setFocusedContactId(contactId ?? null);
              viewState.handleTabChange('clients');
              viewState.handleSearchOpenChange(false);
            }}
            onRequestConvert={viewState.handleRequestConvert}
          />
        </Suspense>
      ) : null}
      {viewState.convertTarget ? (
        <Suspense fallback={null}>
          <ConvertClientDialog
            open={Boolean(viewState.convertTarget)}
            onOpenChange={(open) => {
              if (!open) {
                viewState.setConvertTarget(null);
              }
            }}
            entity={viewState.convertTarget}
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
              if (!result) {
                return;
              }
              void invalidateClientsQueries(queryClient, sessionState.activeAgencyId);
              void invalidateEntitySearchIndexQueries(queryClient, sessionState.activeAgencyId);
              viewState.setConvertTarget(null);
              notifySuccess('Prospect converti en client');
            }}
          />
        </Suspense>
      ) : null}
    </AppLayout>
  );
};

export default App;
