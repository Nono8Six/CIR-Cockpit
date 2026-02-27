
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
    password,
    setPassword,
    isSubmitting,
    submitState,
    error,
    fieldError,
    handleSubmit
  } = useLoginScreenForm({ onSignIn });

  return (
    <main
      role="main"
      className="min-h-[100dvh] bg-muted/90 text-foreground flex items-center justify-center p-4 sm:p-6 font-sans"
      data-testid="login-screen-root"
    >
      <Card className="w-full max-w-md border-border/80 shadow-xl shadow-slate-900/5">
        <CardHeader className="space-y-3 pb-4">
          <LoginScreenBrand />
          <CardDescription className="text-sm text-muted-foreground">
            Connectez-vous pour accéder au cockpit CIR et poursuivre vos actions en toute sécurité.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <LoginScreenForm
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            submitState={submitState}
            fieldError={fieldError}
            error={error}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </CardContent>
        <CardFooter className="border-t border-border/70 pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Comptes créés par un administrateur. Pas d&apos;inscription publique. Support interne
            uniquement.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
};

export default LoginScreen;
