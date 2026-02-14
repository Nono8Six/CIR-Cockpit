import type { Database } from '../../../../shared/supabase.types.ts';
import type { AdminUsersPayload } from '../../../../shared/schemas/user.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { getSupabaseAdmin } from '../middleware/auth.ts';
import { checkRateLimit } from './rateLimit.ts';

type UserRole = Database['public']['Enums']['user_role'];

type MembershipMode = 'replace' | 'add' | 'remove';

type ProfileSummary = {
  id: string;
  email: string;
  role: UserRole;
  archived_at: string | null;
};

const PASSWORD_SYMBOLS = '!@#$%^&*';
const PASSWORD_DIGITS = '0123456789';
const PASSWORD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const PASSWORD_DEFAULT_LENGTH = 12;
const BANNED_UNTIL = '9999-12-31T00:00:00.000Z';

export const normalizePersonName = (value?: string): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const buildDisplayName = (lastName?: string, firstName?: string): string | undefined => {
  const normalizedLastName = normalizePersonName(lastName);
  const normalizedFirstName = normalizePersonName(firstName);
  const displayName = [normalizedLastName, normalizedFirstName].filter(Boolean).join(' ').trim();
  return displayName || undefined;
};

export const validatePasswordPolicy = (password: string): void => {
  if (password.length < 8) {
    throw httpError(400, 'PASSWORD_TOO_SHORT', 'Le mot de passe doit contenir au moins 8 caracteres.');
  }
  if (!/\d/.test(password)) {
    throw httpError(400, 'PASSWORD_REQUIRES_DIGIT', 'Le mot de passe doit contenir au moins un chiffre.');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    throw httpError(400, 'PASSWORD_REQUIRES_SYMBOL', 'Le mot de passe doit contenir au moins un symbole.');
  }
};

const randomInt = (max: number): number => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
};

const shuffle = (items: string[]): string[] => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export const generateTempPassword = (length = PASSWORD_DEFAULT_LENGTH): string => {
  const safeLength = Math.max(length, 8);
  const allChars = PASSWORD_LETTERS + PASSWORD_DIGITS + PASSWORD_SYMBOLS;
  const result = [
    PASSWORD_DIGITS[randomInt(PASSWORD_DIGITS.length)],
    PASSWORD_SYMBOLS[randomInt(PASSWORD_SYMBOLS.length)],
    PASSWORD_LETTERS[randomInt(PASSWORD_LETTERS.length)]
  ];

  while (result.length < safeLength) {
    result.push(allChars[randomInt(allChars.length)]);
  }

  return shuffle(result).join('');
};

export const ensurePassword = (raw?: string): { password: string; generated: boolean } => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    const generated = generateTempPassword();
    validatePasswordPolicy(generated);
    return { password: generated, generated: true };
  }
  validatePasswordPolicy(trimmed);
  return { password: trimmed, generated: false };
};

export const normalizeAgencyIds = (value: string[] | undefined): string[] => {
  if (!value || value.length === 0) return [];
  return Array.from(new Set(value.map((entry) => entry.trim()).filter(Boolean)));
};

const ensureAgenciesExist = async (db: DbClient, agencyIds: string[]): Promise<void> => {
  if (agencyIds.length === 0) return;

  const { data, error } = await db
    .from('agencies')
    .select('id')
    .in('id', agencyIds);

  if (error) {
    throw httpError(500, 'AGENCY_LOOKUP_FAILED', 'Impossible de valider les agences.');
  }

  const existing = new Set((data ?? []).map((row) => row.id));
  const missing = agencyIds.filter((id) => !existing.has(id));

  if (missing.length > 0) {
    throw httpError(400, 'AGENCY_NOT_FOUND', `Agence introuvable: ${missing.join(', ')}`);
  }
};

const getProfileByEmail = async (db: DbClient, email: string): Promise<ProfileSummary | null> => {
  const { data, error } = await db
    .from('profiles')
    .select('id, email, role, archived_at')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'PROFILE_LOOKUP_FAILED', 'Impossible de charger le profil.');
  }

  return data ?? null;
};

const getProfileById = async (db: DbClient, userId: string): Promise<ProfileSummary | null> => {
  const { data, error } = await db
    .from('profiles')
    .select('id, email, role, archived_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'PROFILE_LOOKUP_FAILED', 'Impossible de charger le profil.');
  }

  return data ?? null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureProfileAvailable = async (db: DbClient, userId: string): Promise<ProfileSummary> => {
  const attempts = 5;
  for (let i = 0; i < attempts; i += 1) {
    const profile = await getProfileById(db, userId);
    if (profile) return profile;
    await wait(150);
  }
  throw httpError(500, 'PROFILE_CREATE_FAILED', "Le profil n'a pas ete cree apres la creation utilisateur.");
};

const updateProfile = async (
  db: DbClient,
  userId: string,
  updates: Partial<Database['public']['Tables']['profiles']['Update']>
): Promise<void> => {
  const cleaned = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );
  if (Object.keys(cleaned).length === 0) return;

  const { error } = await db
    .from('profiles')
    .update(cleaned)
    .eq('id', userId);

  if (error) {
    throw httpError(500, 'PROFILE_UPDATE_FAILED', error.message);
  }
};

const listMemberships = async (db: DbClient, userId: string): Promise<string[]> => {
  const { data, error } = await db
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId);

  if (error) {
    throw httpError(500, 'MEMBERSHIP_LOOKUP_FAILED', 'Impossible de charger les appartenances.');
  }

  return (data ?? []).map((row) => row.agency_id);
};

const applyMemberships = async (
  db: DbClient,
  userId: string,
  agencyIds: string[],
  mode: MembershipMode
): Promise<string[]> => {
  if (mode === 'remove') {
    if (agencyIds.length === 0) return listMemberships(db, userId);
    const { error } = await db
      .from('agency_members')
      .delete()
      .eq('user_id', userId)
      .in('agency_id', agencyIds);

    if (error) {
      throw httpError(500, 'MEMBERSHIP_DELETE_FAILED', error.message);
    }
    return listMemberships(db, userId);
  }

  if (agencyIds.length > 0) {
    const rows = agencyIds.map((agencyId) => ({ agency_id: agencyId, user_id: userId }));
    const { error } = await db
      .from('agency_members')
      .upsert(rows, { onConflict: 'agency_id,user_id', ignoreDuplicates: true });

    if (error) {
      throw httpError(500, 'MEMBERSHIP_UPSERT_FAILED', error.message);
    }
  }

  if (mode === 'replace') {
    if (agencyIds.length === 0) {
      const { error } = await db
        .from('agency_members')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw httpError(500, 'MEMBERSHIP_DELETE_FAILED', error.message);
      }
      return [];
    }

    const currentIds = await listMemberships(db, userId);
    const toDelete = currentIds.filter((id) => !agencyIds.includes(id));
    if (toDelete.length > 0) {
      const { error } = await db
        .from('agency_members')
        .delete()
        .eq('user_id', userId)
        .in('agency_id', toDelete);

      if (error) {
        throw httpError(500, 'MEMBERSHIP_DELETE_FAILED', error.message);
      }
    }
  }

  return listMemberships(db, userId);
};

const ensureUserExists = async (db: DbClient, userId: string): Promise<ProfileSummary> => {
  const profile = await getProfileById(db, userId);
  if (!profile) {
    throw httpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }
  return profile;
};

const createUserAccount = async (
  db: DbClient,
  email: string,
  firstName: string,
  lastName: string,
  password?: string
): Promise<{ userId: string; state: 'created' | 'existing' }> => {
  const existing = await getProfileByEmail(db, email);
  if (existing) {
    return { userId: existing.id, state: 'existing' };
  }

  const displayName = buildDisplayName(lastName, firstName);
  const userMetadata = {
    first_name: firstName,
    last_name: lastName,
    full_name: displayName
  };
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata
  });

  if (error || !data?.user) {
    throw httpError(400, 'USER_CREATE_FAILED', error?.message ?? "Impossible de creer l'utilisateur.");
  }

  const profile = await ensureProfileAvailable(db, data.user.id);
  return { userId: profile.id, state: 'created' };
};

const updateAuthPassword = async (userId: string, password: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, { password });
  if (error) {
    throw httpError(400, 'PASSWORD_RESET_FAILED', error.message);
  }
};

const updateAuthBan = async (userId: string, bannedUntil: string | null): Promise<void> => {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(
    userId,
    { banned_until: bannedUntil } as Record<string, unknown>
  );

  if (error) {
    throw httpError(400, 'USER_UPDATE_FAILED', error.message);
  }
};

export const handleAdminUsersAction = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  data: AdminUsersPayload
): Promise<Record<string, unknown>> => {
  const allowed = await checkRateLimit('admin-users', callerId);
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes. Reessayez plus tard.');
  }

  switch (data.action) {
    case 'create': {
      const email = data.email;
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

      const { userId, state } = await createUserAccount(db, email, firstName, lastName, password);

      const updates: Partial<Database['public']['Tables']['profiles']['Update']> = {
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        must_change_password: state === 'created' ? true : undefined
      };

      if (state === 'created') {
        updates.role = roleForCreate;
      } else if (data.role) {
        updates.role = data.role;
      }

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
      const { user_id: userId, role } = data;
      await ensureUserExists(db, userId);
      await updateProfile(db, userId, { role });
      return { request_id: requestId, ok: true, user_id: userId, role };
    }
    case 'set_memberships': {
      const { user_id: userId, mode } = data;
      const agencyIds = normalizeAgencyIds(data.agency_ids);
      await ensureUserExists(db, userId);
      await ensureAgenciesExist(db, agencyIds);

      const memberships = await applyMemberships(db, userId, agencyIds, mode ?? 'replace');
      return {
        request_id: requestId,
        ok: true,
        user_id: userId,
        agency_ids: memberships,
        membership_mode: mode ?? 'replace'
      };
    }
    case 'reset_password': {
      const { user_id: userId } = data;
      await ensureUserExists(db, userId);
      const { password } = ensurePassword(data.password);

      await updateAuthPassword(userId, password);
      await updateProfile(db, userId, { must_change_password: true });

      return { request_id: requestId, ok: true, user_id: userId, temporary_password: password };
    }
    case 'archive': {
      const { user_id: userId } = data;
      await ensureUserExists(db, userId);
      await updateAuthBan(userId, BANNED_UNTIL);
      await updateProfile(db, userId, { archived_at: new Date().toISOString() });

      return { request_id: requestId, ok: true, user_id: userId, archived: true };
    }
    case 'unarchive': {
      const { user_id: userId } = data;
      await ensureUserExists(db, userId);
      await updateAuthBan(userId, null);
      await updateProfile(db, userId, { archived_at: null });

      return { request_id: requestId, ok: true, user_id: userId, archived: false };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
