import type { Database } from '../../../../shared/supabase.types.ts';
import type { AdminUsersResponse } from '../../../../shared/schemas/api-responses.ts';
import type { AdminUsersPayload } from '../../../../shared/schemas/user.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { checkRateLimit } from './rateLimit.ts';
import { createUserAccount } from './adminUsers/createUser.ts';
import { anonymizeUserInteractionsBeforeDelete, deleteAuthUser } from './adminUsers/deleteUser.ts';
import {
  ensureAgenciesExist,
  ensureUserExists,
  getProfileById,
  listMemberships
} from './adminUsers/queryUsers.ts';
import {
  applyMemberships,
  ensureEmailAvailableForUser,
  updateAuthBan,
  updateAuthIdentity,
  updateAuthPassword,
  updateProfile
} from './adminUsers/updateUser.ts';
import {
  BANNED_UNTIL,
  buildDisplayName,
  ensurePassword,
  normalizeAgencyIds,
  normalizePersonName
} from './adminUsers/validators.ts';

type UserRole = Database['public']['Enums']['user_role'];

export const handleAdminUsersAction = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  data: AdminUsersPayload
): Promise<AdminUsersResponse> => {
  const allowed = await checkRateLimit('admin-users', callerId);
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes. Reessayez plus tard.');
  }

  switch (data.action) {
    case 'create': {
      const firstName = normalizePersonName(data.first_name);
      const lastName = normalizePersonName(data.last_name);
      if (!firstName || !lastName) {
        throw httpError(400, 'INVALID_PAYLOAD', 'Nom et prenom requis.');
      }

      const displayName = buildDisplayName(lastName, firstName);
      const roleForCreate: UserRole = data.role ?? 'tcs';
      const agencyIds = normalizeAgencyIds(data.agency_ids);
      const { password, generated } = ensurePassword(data.password);

      if (agencyIds.length > 0) {
        await ensureAgenciesExist(db, agencyIds);
      }

      const { userId, state } = await createUserAccount(db, data.email, firstName, lastName, password);
      if (state === 'existing') {
        throw httpError(409, 'CONFLICT', 'Cet email est deja utilise.');
      }

      const updates: Partial<Database['public']['Tables']['profiles']['Update']> = {
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        must_change_password: true
      };

      updates.role = roleForCreate;

      await updateProfile(db, userId, updates);

      const memberships = agencyIds.length > 0
        ? await applyMemberships(db, userId, agencyIds, 'add')
        : await listMemberships(db, userId);

      const currentProfile = await getProfileById(db, userId);

      return {
        request_id: requestId,
        ok: true,
        user_id: userId,
        account_state: state,
        role: currentProfile?.role ?? roleForCreate,
        agency_ids: memberships,
        temporary_password: generated && state === 'created' ? password : undefined
      };
    }
    case 'set_role': {
      await ensureUserExists(db, data.user_id);
      await updateProfile(db, data.user_id, { role: data.role });
      return { request_id: requestId, ok: true, user_id: data.user_id, role: data.role };
    }
    case 'update_identity': {
      const firstName = normalizePersonName(data.first_name);
      const lastName = normalizePersonName(data.last_name);
      if (!firstName || !lastName) {
        throw httpError(400, 'INVALID_PAYLOAD', 'Nom et prenom requis.');
      }

      const displayName = buildDisplayName(lastName, firstName);
      if (!displayName) {
        throw httpError(400, 'INVALID_PAYLOAD', 'Nom et prenom requis.');
      }

      await ensureUserExists(db, data.user_id);
      await ensureEmailAvailableForUser(db, data.user_id, data.email);
      await updateAuthIdentity(data.user_id, data.email, firstName, lastName);
      await updateProfile(db, data.user_id, {
        email: data.email,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName
      });

      return {
        request_id: requestId,
        ok: true,
        user_id: data.user_id,
        email: data.email,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName
      };
    }
    case 'set_memberships': {
      const agencyIds = normalizeAgencyIds(data.agency_ids);
      await ensureUserExists(db, data.user_id);
      await ensureAgenciesExist(db, agencyIds);

      const mode = data.mode ?? 'replace';
      const memberships = await applyMemberships(db, data.user_id, agencyIds, mode);
      return {
        request_id: requestId,
        ok: true,
        user_id: data.user_id,
        agency_ids: memberships,
        membership_mode: mode
      };
    }
    case 'reset_password': {
      await ensureUserExists(db, data.user_id);
      const { password } = ensurePassword(data.password);

      await updateAuthPassword(data.user_id, password);
      await updateProfile(db, data.user_id, { must_change_password: true });

      return {
        request_id: requestId,
        ok: true,
        user_id: data.user_id,
        temporary_password: password
      };
    }
    case 'archive': {
      await ensureUserExists(db, data.user_id);
      await updateAuthBan(data.user_id, BANNED_UNTIL);
      await updateProfile(db, data.user_id, { archived_at: new Date().toISOString() });

      return { request_id: requestId, ok: true, user_id: data.user_id, archived: true };
    }
    case 'unarchive': {
      await ensureUserExists(db, data.user_id);
      await updateAuthBan(data.user_id, null);
      await updateProfile(db, data.user_id, { archived_at: null });

      return { request_id: requestId, ok: true, user_id: data.user_id, archived: false };
    }
    case 'delete': {
      if (data.user_id === callerId) {
        throw httpError(409, 'USER_DELETE_SELF_FORBIDDEN', 'Impossible de supprimer votre propre compte.');
      }

      await ensureUserExists(db, data.user_id);
      const anonymization = await anonymizeUserInteractionsBeforeDelete(db, data.user_id);
      await deleteAuthUser(data.user_id);

      return {
        request_id: requestId,
        ok: true,
        user_id: data.user_id,
        deleted: true,
        anonymized_interactions: anonymization.reassignedCount,
        anonymized_agency_ids: anonymization.reassignedAgencyIds,
        anonymized_orphan_interactions: anonymization.orphanReassignedCount
      };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
