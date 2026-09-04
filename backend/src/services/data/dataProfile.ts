import { eq } from 'drizzle-orm';

import { profiles } from '../../../drizzle/schema.ts';
import type { DataProfileResponse } from '../../../../shared/schemas/system/api-responses.ts';
import type { ChangePasswordInput, DataProfilePayload } from '../../../../shared/schemas/system/data.schema.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from './dataAccess.ts';
import type { RateLimitOptions } from '../rate-limiting/rateLimit.ts';
import { updateAuthPassword } from '../adminUsers/core/updateUser.ts';

type DataProfileDependencies = {
  ensureRateLimit: (scope: string, callerId: string, options?: RateLimitOptions) => Promise<void>;
};

const DATA_PROFILE_RATE_LIMIT_MAX = 60;

const defaultDependencies: DataProfileDependencies = {
  ensureRateLimit: ensureDataRateLimit
};

type ChangePasswordDependencies = {
  updatePassword: (userId: string, password: string) => Promise<void>;
};

const defaultChangePasswordDependencies: ChangePasswordDependencies = {
  updatePassword: updateAuthPassword
};

const setActiveAgencyId = async (
  db: DbClient,
  authContext: AuthContext,
  agencyId: string | null
): Promise<void> => {
  const activeAgencyId = agencyId === null ? null : ensureAgencyAccess(authContext, agencyId);

  try {
    await db
      .update(profiles)
      .set({ active_agency_id: activeAgencyId })
      .where(eq(profiles.id, authContext.userId));
  } catch {
    throw httpError(500, 'PROFILE_UPDATE_FAILED', "Impossible de changer d'agence.");
  }
};

export const handleDataProfileAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataProfilePayload,
  dependencies: DataProfileDependencies = defaultDependencies
): Promise<DataProfileResponse> => {
  await dependencies.ensureRateLimit(`data_profile:${data.action}`, authContext.userId, {
    max: DATA_PROFILE_RATE_LIMIT_MAX
  });

  await setActiveAgencyId(db, authContext, data.agency_id);
  return { request_id: requestId, ok: true };
};

export const changePassword = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: ChangePasswordInput,
  dependencies: ChangePasswordDependencies = defaultChangePasswordDependencies
): Promise<DataProfileResponse> => {
  await dependencies.updatePassword(authContext.userId, data.password);

  try {
    const rows = await db
      .update(profiles)
      .set({ must_change_password: false })
      .where(eq(profiles.id, authContext.userId))
      .returning({ id: profiles.id });
    if (!rows[0]) {
      throw httpError(500, 'PROFILE_UPDATE_FAILED', 'Impossible de mettre a jour le profil.');
    }
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'PROFILE_UPDATE_FAILED'
    ) {
      throw error;
    }
    throw httpError(500, 'PROFILE_UPDATE_FAILED', 'Impossible de mettre a jour le profil.');
  }

  return { request_id: requestId, ok: true };
};
