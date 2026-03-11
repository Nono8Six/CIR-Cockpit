import type { Session } from '@supabase/supabase-js';

import { useLoginScreenForm } from '@/hooks/useLoginScreenForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader
} from '@/components/ui/card';
import LoginScreenBrand from './login/LoginScreenBrand';
import LoginScreenForm from './login/LoginScreenForm';

type LoginScreenProps = {
  onSignIn?: (session: Session) => void;
};

const LoginScreen = ({ onSignIn }: LoginScreenProps) => {
  const {
    email,
    setEmail,
    handleEmailBlur,
    password,
    setPassword,
    handlePasswordBlur,
    isSubmitting,
    submitState,
    error,
    fieldError,
    handleSubmit
  } = useLoginScreenForm({ onSignIn });

  return (
    <main
      role="main"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-slate-100 text-foreground font-sans"
      data-testid="login-screen-root"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))'
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(241,245,249,0.4)_0%,rgba(226,232,240,0.65)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(200,30,30,0.16),transparent_68%)]" />
      <div className="w-full max-w-5xl">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-300/90 bg-[linear-gradient(135deg,rgba(226,232,240,0.85)_0%,rgba(203,213,225,0.82)_60%,rgba(186,199,214,0.78)_100%)] shadow-[0_34px_70px_-48px_rgba(15,23,42,0.75)] backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(50%_70%_at_78%_12%,rgba(200,30,30,0.2),transparent_72%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(71,85,105,0.08)_1px,transparent_1px)] bg-[size:100%_26px] opacity-55" />
          <div className="absolute left-[14%] top-0 h-full w-px bg-slate-400/35" />

          <div className="relative grid items-stretch gap-6 p-4 sm:p-6 md:p-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-10">
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-300/80 bg-white/60 px-4 py-3 text-slate-900 lg:hidden">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                  CIR Cockpit
                </p>
                <p className="mt-1 text-lg font-semibold leading-tight">Poste de pilotage commercial</p>
              </div>

              <Card className="w-full border-slate-300 bg-white shadow-[0_24px_45px_-35px_rgba(15,23,42,0.72)]">
                <CardHeader className="space-y-3 pb-5">
                  <LoginScreenBrand />
                  <CardDescription className="text-sm leading-relaxed text-slate-600">
                    Accès réservé aux collaborateurs CIR autorisés.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <LoginScreenForm
                    email={email}
                    onEmailChange={setEmail}
                    onEmailBlur={handleEmailBlur}
                    password={password}
                    onPasswordChange={setPassword}
                    onPasswordBlur={handlePasswordBlur}
                    submitState={submitState}
                    fieldError={fieldError}
                    error={error}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                  />
                </CardContent>
                <CardFooter className="border-t border-slate-200/90 pt-4">
                  <p className="text-xs leading-relaxed text-slate-500">
                    <span className="sm:hidden">
                      Compte créé par un administrateur. Support interne CIR.
                    </span>
                    <span className="hidden sm:inline">
                      Comptes créés par un administrateur. Pas d&apos;inscription publique. Support
                      interne CIR uniquement.
                    </span>
                  </p>
                </CardFooter>
              </Card>
            </div>

            <div className="relative hidden flex-col justify-between rounded-2xl border border-slate-500/35 bg-slate-800/72 p-7 text-slate-100 lg:flex">
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300/95">
                  CIR Cockpit
                </p>
                <h2 className="text-[2.15rem] font-semibold leading-tight tracking-tight">
                  Pilotage commercial haute fiabilité
                </h2>
                <p className="max-w-md text-base leading-relaxed text-slate-200">
                  Gestion centralisée des conditions tarifaires, de la marge et des décisions
                  multi-agence CIR.
                </p>
              </div>

              <div className="space-y-3 border-t border-slate-400/35 pt-5 text-sm text-slate-200">
                <p className="font-semibold text-white">Sécurité opérationnelle</p>
                <p>Authentification interne, journalisation complète et contrôle d&apos;accès.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginScreen;
