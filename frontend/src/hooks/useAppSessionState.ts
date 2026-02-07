import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

import type { AgencyContext, AgencyMembershipSummary } from '@/types';
import { getSession } from '@/services/auth/getSession';
import { onAuthStateChange } from '@/services/auth/onAuthStateChange';
import { signOut } from '@/services/auth/signOut';
import { getProfile, type UserProfile } from '@/services/auth/getProfile';
import { getAgencyMemberships } from '@/services/agency/getAgencyMemberships';
import { getProfileActiveAgencyId } from '@/services/agency/getProfileActiveAgencyId';
import { setProfileActiveAgencyId } from '@/services/agency/setProfileActiveAgencyId';
import { setActiveAgencyId } from '@/services/agency/getActiveAgencyContext';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import type { AppSessionContextValue } from '@/types/app-session';

export const useAppSessionState = (): AppSessionContextValue => {
  const [session, setSession] = useState<Session | null>(null); const [authReady, setAuthReady] = useState(false); const [profile, setProfile] = useState<UserProfile | null>(null); const [profileLoading, setProfileLoading] = useState(false); const [profileError, setProfileError] = useState<string | null>(null); const [profileReloadToken, setProfileReloadToken] = useState(0);
  const [agencyContext, setAgencyContext] = useState<AgencyContext | null>(null); const [agencyMemberships, setAgencyMemberships] = useState<AgencyMembershipSummary[]>([]); const [contextLoading, setContextLoading] = useState(false); const [contextError, setContextError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null); const queryClient = useQueryClient(); const handleAppError = useCallback((error: unknown, fallbackMessage: string, context?: Record<string, unknown>) => handleUiError(error, fallbackMessage, context), []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const currentSession = await getSession();
        if (!mounted) return;
        setSession(currentSession); sessionRef.current = currentSession; setAuthReady(true);
      } catch (error) {
        handleAppError(error, 'Impossible de verifier la session.', { source: 'AppSession.initSession' });
        if (!mounted) return;
        setSession(null); sessionRef.current = null; setAuthReady(true);
      }
    })();

    const subscription = onAuthStateChange((event, nextSession) => {
      const previousUserId = sessionRef.current?.user?.id ?? null; const nextUserId = nextSession?.user?.id ?? null; sessionRef.current = nextSession;
      if (event === 'TOKEN_REFRESHED' && previousUserId && previousUserId === nextUserId) return;
      setSession(nextSession);
    });

    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [handleAppError]);

  useEffect(() => {
    if (!session) { setProfile(null); setProfileError(null); setProfileLoading(false); return; }
    let mounted = true;
    void (async () => {
      setProfileLoading(true); setProfileError(null);
      try { const data = await getProfile(); if (mounted) setProfile(data); }
      catch (error) {
        handleAppError(error, 'Impossible de charger votre profil. Verifiez votre connexion.', { source: 'AppSession.loadProfile' });
        if (mounted) { setProfile(null); setProfileError('Impossible de charger votre profil. Verifiez votre connexion.'); }
      } finally { if (mounted) setProfileLoading(false); }
    })();
    return () => { mounted = false; };
  }, [handleAppError, profileReloadToken, session]);

  useEffect(() => {
    if (!session || !profile || profile.must_change_password) { setAgencyContext(null); setAgencyMemberships([]); setActiveAgencyId(null); setContextLoading(false); setContextError(null); return; }
    let mounted = true;
    void (async () => {
      setContextLoading(true); setContextError(null);
      try {
        const [memberships, preferredAgencyId] = await Promise.all([getAgencyMemberships(profile.role !== 'tcs'), getProfileActiveAgencyId()]);
        const selected = (preferredAgencyId ? memberships.find(member => member.agency_id === preferredAgencyId) : null) ?? memberships[0] ?? null;
        if (!selected) {
          if (profile.role === 'tcs') throw createAppError({ code: 'MEMBERSHIP_NOT_FOUND', message: 'Aucune agence associee a cet utilisateur.', source: 'auth' });
          if (mounted) { setAgencyMemberships([]); setAgencyContext(null); setActiveAgencyId(null); setContextError(null); }
          return;
        }
        if (!preferredAgencyId || preferredAgencyId !== selected.agency_id) {
          const result = await setProfileActiveAgencyId(selected.agency_id);
          if (result.isErr()) throw result.error;
        }
        setActiveAgencyId(selected.agency_id);
        if (mounted) { setAgencyMemberships(memberships); setAgencyContext({ agency_id: selected.agency_id, agency_name: selected.agency_name }); }
      } catch (error) {
        if (mounted) { setAgencyContext(null); setAgencyMemberships([]); setContextError('Aucune agence associee a cet utilisateur.'); }
        handleAppError(error, "Impossible de charger le contexte agence", { source: 'AppSession.loadContext' });
      } finally { if (mounted) setContextLoading(false); }
    })();
    return () => { mounted = false; };
  }, [handleAppError, profile, session]);

  const refreshProfile = useCallback(async () => { try { setProfile(await getProfile()); } catch (error) { handleAppError(error, 'Impossible de rafraichir le profil.', { source: 'AppSession.refreshProfile' }); } }, [handleAppError]);
  const retryProfile = useCallback(() => setProfileReloadToken(previous => previous + 1), []);
  const changeActiveAgency = useCallback(async (nextAgencyId: string): Promise<boolean> => {
    const nextMembership = agencyMemberships.find(member => member.agency_id === nextAgencyId);
    if (!nextMembership) { handleAppError(createAppError({ code: 'AGENCY_NOT_FOUND', message: 'Agence introuvable.', source: 'validation' }), "Impossible de changer d'agence", { source: 'AppSession.changeAgency' }); return false; }
    try {
      const result = await setProfileActiveAgencyId(nextAgencyId);
      if (result.isErr()) throw result.error;
      setActiveAgencyId(nextAgencyId); setAgencyContext({ agency_id: nextMembership.agency_id, agency_name: nextMembership.agency_name });
      return true;
    } catch (error) { handleAppError(error, "Impossible de changer d'agence", { source: 'AppSession.changeAgency' }); return false; }
  }, [agencyMemberships, handleAppError]);

  const signOutUser = useCallback(async (): Promise<boolean> => {
    try { await signOut(); setSession(null); sessionRef.current = null; setProfile(null); setAgencyContext(null); setAgencyMemberships([]); setActiveAgencyId(null); queryClient.clear(); return true; }
    catch (error) { handleAppError(error, "Impossible de se deconnecter", { source: 'AppSession.signOut' }); return false; }
  }, [handleAppError, queryClient]);

  const mustChangePassword = Boolean(profile?.must_change_password); const activeAgencyId = agencyContext?.agency_id ?? null; const isContextLoading = contextLoading; const canLoadData = Boolean(session && profile && !mustChangePassword && activeAgencyId);
  return useMemo<AppSessionContextValue>(() => ({ authReady, session, profile, profileLoading, profileError, agencyContext, agencyMemberships, activeAgencyId, mustChangePassword, isContextLoading, contextError, canLoadData, refreshProfile, retryProfile, changeActiveAgency, signOutUser }), [activeAgencyId, agencyContext, agencyMemberships, authReady, canLoadData, changeActiveAgency, contextError, isContextLoading, mustChangePassword, profile, profileError, profileLoading, refreshProfile, retryProfile, session, signOutUser]);
};
