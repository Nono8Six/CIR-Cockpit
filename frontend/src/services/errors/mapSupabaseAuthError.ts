import { AuthError } from '@supabase/supabase-js';

import { AppError, createAppError } from './AppError';

const AUTH_CODE_MESSAGES: Record<string, { code: AppError['code']; message: string }> = {
  invalid_credentials: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Identifiants invalides ou compte inactif.'
  },
  weak_password: {
    code: 'AUTH_WEAK_PASSWORD',
    message: 'Mot de passe trop faible. Respectez les exigences de sécurité.'
  },
  same_password: {
    code: 'AUTH_SAME_PASSWORD',
    message: 'Le nouveau mot de passe doit être différent de l’ancien.'
  },
  session_expired: {
    code: 'AUTH_SESSION_EXPIRED',
    message: 'Votre session a expiré. Veuillez vous reconnecter.'
  },
  session_not_found: {
    code: 'AUTH_SESSION_EXPIRED',
    message: 'Votre session a expiré. Veuillez vous reconnecter.'
  },
  jwt_expired: {
    code: 'AUTH_SESSION_EXPIRED',
    message: 'Votre session a expiré. Veuillez vous reconnecter.'
  },
  user_not_found: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Identifiants invalides ou compte inactif.'
  },
  email_not_confirmed: {
    code: 'AUTH_FORBIDDEN',
    message: 'Compte non confirmé.'
  },
  signup_disabled: {
    code: 'AUTH_FORBIDDEN',
    message: 'Inscription désactivée.'
  }
};

const normalizeMessage = (message: string | undefined): string => (message ?? '').trim().toLowerCase();

export const mapSupabaseAuthError = (error: AuthError, fallbackMessage = 'Erreur d’authentification.'): AppError => {
  const entry = error.code ? AUTH_CODE_MESSAGES[error.code] : undefined;
  const status = error.status ?? undefined;
  const message = normalizeMessage(error.message);

  if (entry) {
    return createAppError({
      code: entry.code,
      message: entry.message,
      status,
      source: 'auth',
      details: error.message,
      cause: error
    });
  }

  if (
    message.includes('invalid login credentials')
    || message.includes('invalid credentials')
    || message.includes('email or password')
  ) {
    return createAppError({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Identifiants invalides ou compte inactif.',
      status,
      source: 'auth',
      details: error.message,
      cause: error
    });
  }

  if (status === 429 || message.includes('too many requests')) {
    return createAppError({
      code: 'RATE_LIMIT',
      message: 'Trop de tentatives de connexion. Réessayez dans quelques instants.',
      status,
      source: 'auth',
      details: error.message,
      cause: error
    });
  }

  if (status === 401 || status === 403) {
    return createAppError({
      code: 'AUTH_FORBIDDEN',
      message: 'Accès non autorisé. Veuillez vous reconnecter.',
      status,
      source: 'auth',
      details: error.message,
      cause: error
    });
  }

  return createAppError({
    code: 'AUTH_ERROR',
    message: fallbackMessage,
    status,
    source: 'auth',
    details: error.message,
    cause: error
  });
};
