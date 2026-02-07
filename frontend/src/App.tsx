import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import AppHeader from './components/AppHeader';
import AppMainContent from './components/AppMainContent';
import AppSearchOverlay from './components/AppSearchOverlay';
import ConvertClientDialog, { type ConvertClientEntity } from './components/ConvertClientDialog';
import { useAgencyConfig } from './hooks/useAgencyConfig';
import { useAppSession } from './hooks/useAppSession';
import { useEntitySearchIndex } from './hooks/useEntitySearchIndex';
import { useInteractions } from './hooks/useInteractions';
import { useRealtimeInteractions } from './hooks/useRealtimeInteractions';
import { useSaveInteraction } from './hooks/useSaveInteraction';
import { getAppGate } from './app/getAppGate';
import { EMPTY_CONFIG, ROLE_BADGE_STYLES, ROLE_LABELS, buildNavigationTabs } from './app/appConstants';
import { getDefaultStatusId, useAppSearchData } from './app/useAppSearchData';
import { useAppShortcuts } from './app/useAppShortcuts';
import { useProfileMenuDismiss } from './app/useProfileMenuDismiss';
import { convertEntityToClient, type ConvertClientPayload } from './services/entities/convertEntityToClient';
import { handleUiError } from './services/errors/handleUiError';
import { notifySuccess } from './services/errors/notify';
import { clientsKey, entitySearchIndexKey } from './services/query/queryKeys';
import type { AppTab, InteractionDraft } from './types';

const App = () => {
  const sessionState = useAppSession();
  const [activeTab, setActiveTab] = useState<AppTab>('cockpit');
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

  useAppShortcuts({ canAccessAdmin, canAccessSettings, setActiveTab, setIsSearchOpen });
  useProfileMenuDismiss(profileMenuRef, isProfileMenuOpen, setIsProfileMenuOpen);

  useEffect(() => {
    if ((activeTab === 'settings' && !canAccessSettings) || (activeTab === 'admin' && !canAccessAdmin)) setActiveTab('cockpit');
  }, [activeTab, canAccessAdmin, canAccessSettings]);

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
    if (await sessionState.signOutUser()) setActiveTab('cockpit');
  }, [sessionState]);

  const gate = getAppGate({
    authReady: sessionState.authReady,
    session: sessionState.session,
    profileLoading: sessionState.profileLoading,
    profile: sessionState.profile,
    profileError: sessionState.profileError,
    mustChangePassword: sessionState.mustChangePassword,
    onProfileRetry: sessionState.retryProfile,
    onSignOut: () => void handleSignOut(),
    onPasswordChanged: sessionState.refreshProfile
  });
  if (gate) return gate;

  const navigationTabs = buildNavigationTabs(canAccessAdmin, searchData.pendingCount);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50/50 overflow-hidden text-slate-900 font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-slate-700 focus:shadow-md">Passer au contenu</a>
      <AppHeader agencyContext={sessionState.agencyContext} agencyMemberships={sessionState.agencyMemberships} hasMultipleAgencies={sessionState.agencyMemberships.length > 1} userRole={userRole} sessionEmail={sessionState.session?.user?.email ?? 'Utilisateur'} profileLoading={sessionState.profileLoading} isContextRefreshing={sessionState.isContextLoading && Boolean(sessionState.agencyContext)} activeTab={activeTab} navigationTabs={navigationTabs} isSettingsDisabled={!canAccessSettings} isProfileMenuOpen={isProfileMenuOpen} profileMenuRef={profileMenuRef} hasProfileMenu roleLabels={ROLE_LABELS} roleBadgeStyles={ROLE_BADGE_STYLES} onTabChange={setActiveTab} onAgencyChange={async agencyId => { if (await sessionState.changeActiveAgency(agencyId)) notifySuccess('Agence active mise à jour'); }} onOpenSearch={() => setIsSearchOpen(true)} onToggleProfileMenu={() => setIsProfileMenuOpen(prev => !prev)} onOpenSettings={() => { setActiveTab('settings'); setIsProfileMenuOpen(false); }} onSignOut={() => void handleSignOut()} />
      <AppMainContent activeTab={activeTab} isInteractionTab={activeTab === 'cockpit' || activeTab === 'dashboard' || activeTab === 'settings'} isContextBlocking={sessionState.isContextLoading && !sessionState.agencyContext} isDataLoading={sessionState.canLoadData && (configQuery.isLoading || interactionsQuery.isLoading)} hasDataError={configQuery.isError || interactionsQuery.isError} activeAgencyId={sessionState.activeAgencyId} contextError={sessionState.contextError} config={config} interactions={interactions} userId={sessionState.session?.user?.id ?? null} userRole={userRole} recentEntities={searchData.recentEntities} entitySearchIndex={entitySearchIndex} entitySearchLoading={entitySearchQuery.isLoading} canAccessSettings={canAccessSettings} canEditSettings={canEditSettings} canAccessAdmin={canAccessAdmin} focusedClientId={focusedClientId} focusedContactId={focusedContactId} onFocusHandled={() => { setFocusedClientId(null); setFocusedContactId(null); }} onSaveInteraction={handleSaveInteraction} onRequestConvert={entity => { setConvertTarget(entity); setIsSearchOpen(false); setSearchQuery(''); }} onOpenGlobalSearch={() => setIsSearchOpen(true)} onReloadData={() => { void configQuery.refetch(); void interactionsQuery.refetch(); }} />
      {isSearchOpen && <AppSearchOverlay searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onClose={() => setIsSearchOpen(false)} filteredInteractions={searchData.filteredInteractions} filteredClients={searchData.filteredClients} filteredProspects={searchData.filteredProspects} filteredContacts={searchData.filteredContacts} hasSearchResults={searchData.hasSearchResults} entityNameById={searchData.entityNameById} onFocusClient={(clientId, contactId) => { setFocusedClientId(clientId); setFocusedContactId(contactId ?? null); setActiveTab('clients'); setIsSearchOpen(false); }} onRequestConvert={entity => { setConvertTarget(entity); setIsSearchOpen(false); setSearchQuery(''); }} />}
      <ConvertClientDialog open={Boolean(convertTarget)} onOpenChange={open => { if (!open) setConvertTarget(null); }} entity={convertTarget} onConvert={async (payload: ConvertClientPayload) => {
        const result = await convertEntityToClient(payload).match(updated => updated, error => { handleUiError(error, 'Impossible de convertir en client.', { source: 'App.convertEntityToClient' }); return null; });
        if (!result) return;
        void queryClient.invalidateQueries({ queryKey: clientsKey(sessionState.activeAgencyId, false) });
        void queryClient.invalidateQueries({ queryKey: clientsKey(sessionState.activeAgencyId, true) });
        void queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(sessionState.activeAgencyId, false) });
        void queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(sessionState.activeAgencyId, true) });
        setConvertTarget(null);
        notifySuccess('Prospect converti en client');
      }} />
    </div>
  );
};

export default App;


