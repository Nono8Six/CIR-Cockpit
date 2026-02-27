import { lazy, Suspense, type ReactNode } from 'react';

import type { UserProfile } from '@/services/auth/getProfile';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

const ChangePasswordScreen = lazy(() => import('@/components/ChangePasswordScreen'));
const LoginScreen = lazy(() => import('@/components/LoginScreen'));

type AppGateParams = {
  authReady: boolean;
  session: Session | null;
  profileLoading: boolean;
  profile: UserProfile | null;
  profileError: string | null;
  mustChangePassword: boolean;
  onProfileRetry: () => void;
  onSignOut: () => void;
  onPasswordChanged: () => Promise<void>;
};

const LoadingScreen = ({ message }: { message: string }) => (
  <main
    role="main"
    aria-busy="true"
    className="min-h-[100dvh] w-full flex items-center justify-center bg-surface-1/80 text-muted-foreground font-sans"
  >
    <h1 className="sr-only">Chargement de l&apos;application</h1>
    <p>{message}</p>
  </main>
);

const ProfileErrorScreen = ({ profileError, onProfileRetry, onSignOut }: {
  profileError: string;
  onProfileRetry: () => void;
  onSignOut: () => void;
}) => (
  <div className="min-h-[100dvh] w-full flex items-center justify-center bg-surface-1/80 text-muted-foreground font-sans p-6">
    <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Profil indisponible</h1>
      <p className="text-sm text-muted-foreground mt-2">{profileError}</p>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={onProfileRetry}>Reessayer</Button>
        <Button className="flex-1" variant="outline" onClick={onSignOut}>Se deconnecter</Button>
      </div>
    </div>
  </div>
);

const ProfileMissingScreen = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="min-h-[100dvh] w-full flex items-center justify-center bg-surface-1/80 text-muted-foreground font-sans p-6">
    <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Profil introuvable</h1>
      <p className="text-sm text-muted-foreground mt-2">Votre profil n&apos;a pas pu etre charge. Veuillez vous reconnecter.</p>
      <Button className="mt-4 w-full" variant="outline" onClick={onSignOut}>Se deconnecter</Button>
    </div>
  </div>
);

export const getAppGate = ({
  authReady,
  session,
  profileLoading,
  profile,
  profileError,
  mustChangePassword,
  onProfileRetry,
  onSignOut,
  onPasswordChanged
}: AppGateParams): ReactNode | null => {
  if (!authReady) return <LoadingScreen message="Chargement…" />;
  if (!session) {
    return (
      <Suspense fallback={<LoadingScreen message="Chargement de l'ecran de connexion…" />}>
        <LoginScreen />
      </Suspense>
    );
  }
  if (profileLoading && !profile) return <LoadingScreen message="Chargement du profil…" />;
  if (profileError) {
    return <ProfileErrorScreen profileError={profileError} onProfileRetry={onProfileRetry} onSignOut={onSignOut} />;
  }
  if (!profile) return <ProfileMissingScreen onSignOut={onSignOut} />;
  if (mustChangePassword) {
    return (
      <Suspense fallback={<LoadingScreen message="Chargement de l'ecran de securite…" />}>
        <ChangePasswordScreen
          userEmail={profile.email}
          onComplete={onPasswordChanged}
          onSignOut={onSignOut}
        />
      </Suspense>
    );
  }
  return null;
};
