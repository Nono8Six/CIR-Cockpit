import { ErrorCode, ErrorDomain, ErrorSeverity, RecoveryAction } from './types.ts';

type ErrorCatalogEntry = {
  code: ErrorCode;
  message: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  recoveryAction: RecoveryAction;
  retryable?: boolean;
};

const makeEntry = (
  code: ErrorCode,
  message: string,
  domain: ErrorDomain,
  severity: ErrorSeverity,
  recoveryAction: RecoveryAction,
  retryable?: boolean
): ErrorCatalogEntry => ({
  code,
  message,
  domain,
  severity,
  recoveryAction,
  retryable
});

export const ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
  AUTH_REQUIRED: makeEntry('AUTH_REQUIRED', 'Veuillez vous reconnecter.', 'auth', 'warning', 'relogin'),
  AUTH_INVALID_CREDENTIALS: makeEntry(
    'AUTH_INVALID_CREDENTIALS',
    'Identifiants invalides ou compte inactif.',
    'auth',
    'warning',
    'relogin'
  ),
  AUTH_SESSION_EXPIRED: makeEntry(
    'AUTH_SESSION_EXPIRED',
    'Votre session a expiré. Veuillez vous reconnecter.',
    'auth',
    'warning',
    'relogin'
  ),
  AUTH_WEAK_PASSWORD: makeEntry(
    'AUTH_WEAK_PASSWORD',
    'Mot de passe trop faible.',
    'auth',
    'warning',
    'retry'
  ),
  AUTH_SAME_PASSWORD: makeEntry(
    'AUTH_SAME_PASSWORD',
    'Le nouveau mot de passe doit être différent.',
    'auth',
    'warning',
    'retry'
  ),
  AUTH_FORBIDDEN: makeEntry('AUTH_FORBIDDEN', 'Accès non autorisé.', 'auth', 'error', 'relogin'),
  AUTH_ERROR: makeEntry('AUTH_ERROR', 'Erreur d’authentification.', 'auth', 'error', 'relogin'),
  CLIENT_NOT_CONFIGURED: makeEntry(
    'CLIENT_NOT_CONFIGURED',
    'Client non configuré.',
    'client',
    'fatal',
    'contact_support'
  ),
  CONFIG_INVALID: makeEntry('CONFIG_INVALID', 'Configuration invalide.', 'client', 'error', 'contact_support'),
  CONFIG_MISSING: makeEntry('CONFIG_MISSING', 'Configuration manquante.', 'client', 'error', 'contact_support'),
  CONFLICT: makeEntry(
    'CONFLICT',
    'Conflit de mise à jour. Rechargez et réessayez.',
    'db',
    'warning',
    'reload'
  ),
  DB_READ_FAILED: makeEntry(
    'DB_READ_FAILED',
    'Impossible de charger les données.',
    'db',
    'error',
    'retry',
    true
  ),
  DB_WRITE_FAILED: makeEntry(
    'DB_WRITE_FAILED',
    'Impossible d’enregistrer les données.',
    'db',
    'error',
    'retry',
    true
  ),
  DRAFT_NOT_FOUND: makeEntry('DRAFT_NOT_FOUND', 'Brouillon introuvable.', 'db', 'warning', 'reload'),
  DRAFT_SAVE_FAILED: makeEntry('DRAFT_SAVE_FAILED', 'Échec de sauvegarde du brouillon.', 'db', 'error', 'retry'),
  EDGE_FUNCTION_ERROR: makeEntry('EDGE_FUNCTION_ERROR', 'Erreur serveur.', 'edge', 'error', 'retry', true),
  EMAIL_REQUIRED: makeEntry('EMAIL_REQUIRED', 'Email requis.', 'validation', 'warning', 'retry'),
  EMAIL_INVALID: makeEntry('EMAIL_INVALID', 'Email invalide.', 'validation', 'warning', 'retry'),
  DISPLAY_NAME_EMPTY: makeEntry('DISPLAY_NAME_EMPTY', 'Nom requis.', 'validation', 'warning', 'retry'),
  DISPLAY_NAME_TOO_LONG: makeEntry('DISPLAY_NAME_TOO_LONG', 'Nom trop long.', 'validation', 'warning', 'retry'),
  AGENCY_IDS_INVALID: makeEntry('AGENCY_IDS_INVALID', 'Agences invalides.', 'validation', 'warning', 'retry'),
  AGENCY_ID_INVALID: makeEntry('AGENCY_ID_INVALID', 'Identifiant agence invalide.', 'validation', 'warning', 'retry'),
  AGENCY_NOT_FOUND: makeEntry('AGENCY_NOT_FOUND', 'Agence introuvable.', 'db', 'warning', 'reload'),
  AGENCY_NAME_REQUIRED: makeEntry('AGENCY_NAME_REQUIRED', 'Nom d’agence requis.', 'validation', 'warning', 'retry'),
  AGENCY_NAME_EMPTY: makeEntry('AGENCY_NAME_EMPTY', 'Nom d’agence requis.', 'validation', 'warning', 'retry'),
  AGENCY_NAME_TOO_LONG: makeEntry('AGENCY_NAME_TOO_LONG', 'Nom d’agence trop long.', 'validation', 'warning', 'retry'),
  AGENCY_NAME_EXISTS: makeEntry('AGENCY_NAME_EXISTS', 'Nom d’agence déjà utilisé.', 'validation', 'warning', 'retry'),
  AGENCY_CREATE_FAILED: makeEntry('AGENCY_CREATE_FAILED', 'Impossible de créer l’agence.', 'db', 'error', 'retry', true),
  AGENCY_UPDATE_FAILED: makeEntry('AGENCY_UPDATE_FAILED', 'Impossible de modifier l’agence.', 'db', 'error', 'retry', true),
  AGENCY_DELETE_FAILED: makeEntry('AGENCY_DELETE_FAILED', 'Impossible de supprimer l’agence.', 'db', 'error', 'retry', true),
  AGENCY_LOOKUP_FAILED: makeEntry('AGENCY_LOOKUP_FAILED', 'Impossible de charger l’agence.', 'db', 'error', 'retry', true),
  ENTITY_DETACH_FAILED: makeEntry('ENTITY_DETACH_FAILED', 'Impossible de détacher les entités.', 'db', 'error', 'retry', true),
  MEMBERSHIP_LOOKUP_FAILED: makeEntry(
    'MEMBERSHIP_LOOKUP_FAILED',
    'Impossible de charger les appartenances.',
    'db',
    'error',
    'retry',
    true
  ),
  MEMBERSHIP_UPSERT_FAILED: makeEntry(
    'MEMBERSHIP_UPSERT_FAILED',
    'Impossible de mettre à jour les appartenances.',
    'db',
    'error',
    'retry',
    true
  ),
  MEMBERSHIP_DELETE_FAILED: makeEntry(
    'MEMBERSHIP_DELETE_FAILED',
    'Impossible de supprimer les appartenances.',
    'db',
    'error',
    'retry',
    true
  ),
  MEMBERSHIP_NOT_FOUND: makeEntry('MEMBERSHIP_NOT_FOUND', 'Appartenance introuvable.', 'db', 'warning', 'reload'),
  METHOD_NOT_ALLOWED: makeEntry('METHOD_NOT_ALLOWED', 'Méthode non autorisée.', 'client', 'error', 'contact_support'),
  NOT_FOUND: makeEntry('NOT_FOUND', 'Ressource introuvable.', 'db', 'warning', 'reload'),
  PROFILE_CREATE_FAILED: makeEntry('PROFILE_CREATE_FAILED', 'Profil non créé.', 'db', 'error', 'retry', true),
  PROFILE_LOOKUP_FAILED: makeEntry('PROFILE_LOOKUP_FAILED', 'Impossible de charger le profil.', 'db', 'error', 'retry', true),
  PROFILE_UPDATE_FAILED: makeEntry('PROFILE_UPDATE_FAILED', 'Impossible de mettre à jour le profil.', 'db', 'error', 'retry', true),
  PROFILE_NOT_FOUND: makeEntry('PROFILE_NOT_FOUND', 'Profil introuvable.', 'db', 'warning', 'reload'),
  PASSWORD_TOO_SHORT: makeEntry(
    'PASSWORD_TOO_SHORT',
    'Le mot de passe doit contenir au moins 8 caractères.',
    'validation',
    'warning',
    'retry'
  ),
  PASSWORD_REQUIRES_DIGIT: makeEntry(
    'PASSWORD_REQUIRES_DIGIT',
    'Le mot de passe doit contenir au moins un chiffre.',
    'validation',
    'warning',
    'retry'
  ),
  PASSWORD_REQUIRES_SYMBOL: makeEntry(
    'PASSWORD_REQUIRES_SYMBOL',
    'Le mot de passe doit contenir au moins un symbole.',
    'validation',
    'warning',
    'retry'
  ),
  PASSWORD_RESET_FAILED: makeEntry('PASSWORD_RESET_FAILED', 'Échec du changement de mot de passe.', 'auth', 'error', 'retry'),
  // RATE_LIMIT: used by frontend mapEdgeError (status 429 → generic rate limit)
  RATE_LIMIT: makeEntry('RATE_LIMIT', 'Trop de requêtes. Réessayez plus tard.', 'edge', 'warning', 'retry', true),
  // RATE_LIMITED: used by backend services (explicit rate limit rejection)
  RATE_LIMITED: makeEntry('RATE_LIMITED', 'Trop de requêtes. Réessayez plus tard.', 'edge', 'warning', 'retry', true),
  RATE_LIMIT_CHECK_FAILED: makeEntry(
    'RATE_LIMIT_CHECK_FAILED',
    'Impossible de vérifier la limite de requêtes.',
    'edge',
    'error',
    'retry',
    true
  ),
  REQUEST_FAILED: makeEntry('REQUEST_FAILED', 'La requête a échoué.', 'edge', 'error', 'retry', true),
  INVALID_JSON: makeEntry('INVALID_JSON', 'Payload JSON invalide.', 'validation', 'warning', 'retry'),
  INVALID_PAYLOAD: makeEntry('INVALID_PAYLOAD', 'Payload invalide.', 'validation', 'warning', 'retry'),
  ACTION_REQUIRED: makeEntry('ACTION_REQUIRED', 'Action requise.', 'validation', 'warning', 'retry'),
  ROLE_INVALID: makeEntry('ROLE_INVALID', 'Rôle invalide.', 'validation', 'warning', 'retry'),
  USER_NOT_FOUND: makeEntry('USER_NOT_FOUND', 'Utilisateur introuvable.', 'db', 'warning', 'reload'),
  USER_CREATE_FAILED: makeEntry('USER_CREATE_FAILED', 'Impossible de créer l’utilisateur.', 'db', 'error', 'retry', true),
  USER_UPDATE_FAILED: makeEntry('USER_UPDATE_FAILED', 'Impossible de modifier l’utilisateur.', 'db', 'error', 'retry', true),
  USER_DELETE_FAILED: makeEntry('USER_DELETE_FAILED', 'Impossible de supprimer l’utilisateur.', 'db', 'error', 'retry', true),
  USER_DELETE_SELF_FORBIDDEN: makeEntry(
    'USER_DELETE_SELF_FORBIDDEN',
    'Impossible de supprimer votre propre compte.',
    'validation',
    'warning',
    'none'
  ),
  USER_DELETE_HAS_INTERACTIONS: makeEntry(
    'USER_DELETE_HAS_INTERACTIONS',
    'Impossible de supprimer cet utilisateur car il a cree des interactions.',
    'db',
    'warning',
    'none'
  ),
  USER_DELETE_REFERENCED: makeEntry(
    'USER_DELETE_REFERENCED',
    'Impossible de supprimer cet utilisateur car des donnees y sont rattachees.',
    'db',
    'warning',
    'none'
  ),
  SYSTEM_USER_PROVISION_FAILED: makeEntry(
    'SYSTEM_USER_PROVISION_FAILED',
    'Impossible de preparer le compte systeme pour la suppression.',
    'db',
    'error',
    'retry',
    true
  ),
  SYSTEM_USER_NOT_FOUND: makeEntry(
    'SYSTEM_USER_NOT_FOUND',
    'Compte systeme introuvable pour finaliser la suppression.',
    'db',
    'error',
    'retry',
    true
  ),
  USER_DELETE_ANONYMIZATION_FAILED: makeEntry(
    'USER_DELETE_ANONYMIZATION_FAILED',
    "Impossible d'anonymiser les interactions avant suppression.",
    'db',
    'error',
    'retry',
    true
  ),
  VALIDATION_ERROR: makeEntry('VALIDATION_ERROR', 'Données invalides.', 'validation', 'warning', 'retry'),
  NETWORK_ERROR: makeEntry(
    'NETWORK_ERROR',
    'Impossible de joindre le serveur. Vérifiez votre connexion.',
    'network',
    'error',
    'retry',
    true
  ),
  UNKNOWN_ERROR: makeEntry('UNKNOWN_ERROR', 'Erreur inattendue.', 'unknown', 'error', 'contact_support')
};

export const getErrorCatalogEntry = (code: ErrorCode): ErrorCatalogEntry | undefined =>
  ERROR_CATALOG[code];
