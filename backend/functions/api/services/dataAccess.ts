import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { checkRateLimit } from './rateLimit.ts';

const FORBIDDEN_MESSAGE = 'Acces interdit.';
const RATE_LIMIT_MESSAGE = 'Trop de requetes. Reessayez plus tard.';

export const ensureDataRateLimit = async (
  scope: string,
  callerId: string
): Promise<void> => {
  const allowed = await checkRateLimit(scope, callerId);
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', RATE_LIMIT_MESSAGE);
  }
};

export const ensureAgencyAccess = (
  authContext: AuthContext,
  agencyId: string | null | undefined
): string => {
  const normalizedAgencyId = (agencyId ?? '').trim();
  if (!normalizedAgencyId) {
    throw httpError(400, 'AGENCY_ID_INVALID', 'Identifiant agence invalide.');
  }

  if (authContext.isSuperAdmin || authContext.agencyIds.includes(normalizedAgencyId)) {
    return normalizedAgencyId;
  }

  throw httpError(403, 'AUTH_FORBIDDEN', FORBIDDEN_MESSAGE);
};

export const ensureOptionalAgencyAccess = (
  authContext: AuthContext,
  agencyId: string | null | undefined
): string | null => {
  const normalizedAgencyId = (agencyId ?? '').trim();
  if (!normalizedAgencyId) {
    if (authContext.isSuperAdmin) {
      return null;
    }
    throw httpError(403, 'AUTH_FORBIDDEN', FORBIDDEN_MESSAGE);
  }

  return ensureAgencyAccess(authContext, normalizedAgencyId);
};

export const getEntityAgencyId = async (
  db: DbClient,
  entityId: string
): Promise<string | null> => {
  const { data, error } = await db
    .from('entities')
    .select('agency_id')
    .eq('id', entityId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de charger l'entite.");
  }
  if (!data) {
    throw httpError(404, 'NOT_FOUND', 'Entite introuvable.');
  }
  return data.agency_id;
};

export const getContactEntityId = async (
  db: DbClient,
  contactId: string
): Promise<string> => {
  const { data, error } = await db
    .from('entity_contacts')
    .select('entity_id')
    .eq('id', contactId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger le contact.');
  }
  if (!data?.entity_id) {
    throw httpError(404, 'NOT_FOUND', 'Contact introuvable.');
  }
  return data.entity_id;
};
