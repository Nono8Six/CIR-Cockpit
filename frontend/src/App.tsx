import { Suspense, lazy, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';

import {
  APP_SHELL_SECTION_LABELS,
  EMPTY_CONFIG,
  ROLE_LABELS,
  buildShellNavigation
} from '@/app/appConstants';
import { getAppGate } from '@/app/getAppGate';
import { getPathForTab, isInteractionTab } from '@/app/appRoutes';
import AppLayout from '@/components/AppLayout';
import type { AppMainViewState } from '@/components/app-main/AppMainContent.types';
import { useAppQueries } from '@/hooks/useAppQueries';
import { useAppSessionActions, useAppSessionStateContext } from '@/hooks/useAppSession';
import { useAppViewState } from '@/hooks/useAppViewState';
import { useSaveInteraction } from '@/hooks/useSaveInteraction';
import type { UserProfile } from '@/services/auth/getProfile';
import { notifySuccess } from '@/services/errors/notify';
import type { InteractionDraft } from '@/types';

const loadAppSearchOverlay = () => import('@/components/AppSearchOverlay');
const loadUiPocPage = () => import('@/components/poc/UiPocPage');

const AppSearchOverlay = lazy(loadAppSearchOverlay);
const UiPocPage = lazy(loadUiPocPage);

let appSearchOverlayPreloadPromise: Promise<unknown> | null = null;
let uiPocPagePreloadPromise: Promise<unknown> | null = null;

const preloadAppSearchOverlay = (): void => {
  appSearchOverlayPreloadPromise ??= loadAppSearchOverlay();
};

const preloadUiPocPage = (): void => {
  uiPocPagePreloadPromise ??= loadUiPocPage();
};

const getBestUserLabel = (profile: UserProfile | null, userEmail: string): string => {
  const firstName = profile?.first_name?.trim() ?? '';
  const lastName = profile?.last_name?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  if (fullName) return fullName;

  const displayName = profile?.display_name?.trim() ?? '';
  if (displayName) return displayName;

  return userEmail;
};

const getUserInitials = (profile: UserProfile | null, fullName: string, userEmail: string): string => {
  const firstName = profile?.first_name?.trim() ?? '';
  const lastName = profile?.last_name?.trim() ?? '';
  if (firstName || lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  }

  const words = fullName
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]?.charAt(0)}${words[1]?.charAt(0)}`.toUpperCase();
  }
  if (words.length === 1) {
    const firstWord = words[0] ?? '';
    return firstWord.slice(0, 2).toUpperCase() || 'U';
  }

  return userEmail.slice(0, 2).toUpperCase() || 'U';
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
  const normalizedPathname = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  const isUiPocRoute = normalizedPathname === '/ui-poc';

  const viewState = useAppViewState({
    pathname,
    navigate,
    queryClient,
    activeAgencyId: sessionState.activeAgencyId,
    canAccessAdmin,
    canAccessSettings,
    onSearchOpen: preloadAppSearchOverlay,
  });
  const queries = useAppQueries({
    activeAgencyId: sessionState.activeAgencyId,
    canLoadData: sessionState.canLoadData,
    activeTab: viewState.activeTab,
    isSearchOpen: viewState.isSearchOpen,
    searchQuery: viewState.searchQuery
  });

  useEffect(() => {
    if (!isUiPocRoute) return;
    preloadUiPocPage();
  }, [isUiPocRoute]);

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

  const handleAgencyChange = useCallback(
    async (agencyId: string) => {
      if (await sessionActions.changeActiveAgency(agencyId)) {
        notifySuccess('Agence active mise à jour');
      }
    },
    [sessionActions]
  );

  const shellSections = useMemo(
    () => buildShellNavigation(canAccessAdmin, queries.searchData.pendingCount),
    [canAccessAdmin, queries.searchData.pendingCount]
  );
  const activeShellItem = useMemo(() => {
    const flattened = shellSections.flatMap((section) => section.items);
    return flattened.find((item) => item.id === viewState.activeTab) ?? flattened[0];
  }, [shellSections, viewState.activeTab]);
  const activeSectionLabel = activeShellItem
    ? APP_SHELL_SECTION_LABELS[activeShellItem.sectionId]
    : APP_SHELL_SECTION_LABELS.clients;
  const activeItemLabel = activeShellItem?.label ?? 'Clients';
  const sessionEmail = sessionState.session?.user?.email ?? 'Utilisateur';
  const userFullName = getBestUserLabel(sessionState.profile, sessionEmail);
  const userInitials = getUserInitials(sessionState.profile, userFullName, sessionEmail);
  const config = queries.config ?? EMPTY_CONFIG;

  if (isUiPocRoute) {
    const hasUiPocSearchResults =
      queries.searchData.filteredInteractions.length > 0
      || queries.searchData.filteredClients.length > 0
      || queries.searchData.filteredContacts.length > 0;

    return (
      <Suspense fallback={null}>
        <UiPocPage
          userEmail={sessionState.session?.user?.email ?? 'Utilisateur'}
          userProfile={sessionState.profile}
          userRole={userRole}
          activeAgencyId={sessionState.activeAgencyId}
          agencyMemberships={sessionState.agencyMemberships}
          authReady={sessionState.authReady}
          isAuthenticated={Boolean(sessionState.session)}
          onAgencyChange={handleAgencyChange}
          onOpenSearch={viewState.handleOpenSearch}
          onSearchIntent={preloadAppSearchOverlay}
          onSignOut={() => void handleSignOut()}
          onBackToCockpit={() => {
            void navigate({ to: getPathForTab('cockpit') });
          }}
        />
        {viewState.isSearchOpen ? (
          <AppSearchOverlay
            open={viewState.isSearchOpen}
            onOpenChange={viewState.handleSearchOpenChange}
            searchQuery={viewState.searchQuery}
            onSearchQueryChange={viewState.setSearchQuery}
            filteredInteractions={queries.searchData.filteredInteractions}
            filteredClients={queries.searchData.filteredClients}
            filteredProspects={[]}
            filteredContacts={queries.searchData.filteredContacts}
            hasSearchResults={hasUiPocSearchResults}
            isEntitySearchLoading={queries.entitySearchQuery.isLoading}
            entitySearchError={queries.entitySearchQuery.error}
            onRetrySearch={async () => queries.entitySearchQuery.refetch()}
            entityNameById={queries.searchData.entityNameById}
            onOpenInteraction={() => {
              void navigate({
                to: '/ui-poc',
                search: (previous) => ({
                  ...previous,
                  nav: 'dashboard'
                })
              });
              viewState.handleSearchOpenChange(false);
            }}
            onFocusClient={() => {
              void navigate({
                to: '/ui-poc',
                search: (previous) => ({
                  ...previous,
                  nav: 'clients'
                })
              });
              viewState.handleSearchOpenChange(false);
            }}
            onRequestConvert={() => {
              viewState.handleSearchOpenChange(false);
            }}
          />
        ) : null}
      </Suspense>
    );
  }

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

  return (
    <AppLayout
      headerProps={{
        sections: shellSections,
        activeTab: viewState.activeTab,
        activeSectionLabel,
        activeItemLabel,
        agencyContext: sessionState.agencyContext,
        agencyMemberships: sessionState.agencyMemberships,
        hasMultipleAgencies: sessionState.agencyMemberships.length > 1,
        sessionEmail,
        userFullName,
        userInitials,
        userRoleLabel: ROLE_LABELS[userRole],
        profileLoading: sessionState.profileLoading,
        isContextRefreshing: sessionState.isContextLoading && Boolean(sessionState.agencyContext),
        isSettingsDisabled: !canAccessSettings,
        isProfileMenuOpen: viewState.isProfileMenuOpen,
        profileMenuRef: viewState.profileMenuRef,
        onAgencyChange: handleAgencyChange,
        onOpenSearch: viewState.handleOpenSearch,
        onSearchIntent: preloadAppSearchOverlay,
        onProfileMenuOpenChange: viewState.setIsProfileMenuOpen,
        onOpenSettings: () => {
          viewState.handleTabChange('settings');
          viewState.setIsProfileMenuOpen(false);
        },
        onOpenAccountPanel: () => undefined,
        onSignOut: () => void handleSignOut(),
        onBackToCockpit: () => {
          viewState.handleTabChange('cockpit');
        },
        onOpenMobileMenu: () => undefined
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
            onFocusClient={(clientId) => {
              const targetEntity = queries.entitySearchIndex.entities.find((entity) => entity.id === clientId);
              if (targetEntity?.client_number) {
                void navigate({
                  to: '/clients/$clientNumber',
                  params: { clientNumber: targetEntity.client_number }
                });
              } else {
                viewState.handleTabChange('clients');
              }
              viewState.handleSearchOpenChange(false);
            }}
            onRequestConvert={viewState.handleRequestConvert}
          />
        </Suspense>
      ) : null}
    </AppLayout>
  );
};

export default App;
