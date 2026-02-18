import type { Database } from '../../../../shared/supabase.types.ts';
import type { AdminUsersResponse } from '../../../../shared/schemas/api-responses.ts';
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

type UserDeleteAnonymizationSummary = {
  reassignedCount: number;
  reassignedAgencyIds: string[];
  orphanReassignedCount: number;
};

const PASSWORD_SYMBOLS = '!@#$%^&*';
const PASSWORD_DIGITS = '0123456789';
const PASSWORD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const PASSWORD_DEFAULT_LENGTH = 12;
const BANNED_UNTIL = '9999-12-31T00:00:00.000Z';
const SYSTEM_LAST_NAME = 'SYSTEME';
const SYSTEM_DEFAULT_FIRST_NAME = 'Agence';
const SYSTEM_ORPHAN_FIRST_NAME = 'Orpheline';
const SYSTEM_EMAIL_DOMAIN = 'cir.invalid';

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

const getErrorDetails = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
};

const buildAgencySystemEmail = (agencyId: string): string => {
  const normalizedId = agencyId.replaceAll('-', '');
  return `system+agency-${normalizedId}@${SYSTEM_EMAIL_DOMAIN}`;
};

const buildOrphanSystemEmail = (): string => {
  return `system+orphan@${SYSTEM_EMAIL_DOMAIN}`;
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

const ensureEmailAvailableForUser = async (
  db: DbClient,
  userId: string,
  email: string
): Promise<void> => {
  const existing = await getProfileByEmail(db, email);
  if (existing && existing.id !== userId) {
    throw httpError(409, 'CONFLICT', 'Cet email est deja utilise.');
  }
};

const updateAuthIdentity = async (
  userId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<void> => {
  const displayName = buildDisplayName(lastName, firstName);
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: displayName
    }
  });

  if (!error) return;

  const errorStatus = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  const message = error.message.toLowerCase();

  if (errorStatus === 404 || message.includes('not found')) {
    throw httpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }
  if (errorStatus === 409 || message.includes('already')) {
    throw httpError(409, 'CONFLICT', 'Cet email est deja utilise.');
  }
  throw httpError(400, 'USER_UPDATE_FAILED', error.message);
};

const ensureSystemAuthUser = async (
  db: DbClient,
  email: string,
  firstName: string,
  lastName: string
): Promise<string> => {
  const existing = await getProfileByEmail(db, email);
  if (existing) return existing.id;

  const displayName = buildDisplayName(lastName, firstName);
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password: generateTempPassword(20),
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: displayName
    }
  });

  if (error || !data?.user) {
    const message = error?.message ?? 'Erreur inconnue.';
    const normalized = message.toLowerCase();
    if (normalized.includes('already') || normalized.includes('registered')) {
      const conflicted = await getProfileByEmail(db, email);
      if (conflicted) return conflicted.id;
    }
    throw httpError(500, 'SYSTEM_USER_PROVISION_FAILED', 'Impossible de creer le compte systeme.', message);
  }

  try {
    const profile = await ensureProfileAvailable(db, data.user.id);
    return profile.id;
  } catch (errorProfile) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      'Impossible de finaliser la creation du compte systeme.',
      getErrorDetails(errorProfile)
    );
  }
};

const ensureSystemProfileState = async (
  db: DbClient,
  userId: string,
  firstName: string,
  lastName: string,
  agencyId?: string
): Promise<void> => {
  try {
    await updateProfile(db, userId, {
      first_name: firstName,
      last_name: lastName,
      display_name: buildDisplayName(lastName, firstName),
      role: 'tcs',
      archived_at: null,
      must_change_password: false,
      is_system: true
    });

    if (agencyId) {
      await applyMemberships(db, userId, [agencyId], 'add');
    }

    await updateAuthBan(userId, BANNED_UNTIL);
  } catch (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      'Impossible de preparer le compte systeme.',
      getErrorDetails(error)
    );
  }
};

const getAgencySystemUserId = async (db: DbClient, agencyId: string): Promise<string | null> => {
  const { data, error } = await db
    .from('agency_system_users')
    .select('user_id')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      "Impossible de charger le compte systeme de l'agence.",
      error.message
    );
  }

  return data?.user_id ?? null;
};

const upsertAgencySystemUser = async (db: DbClient, agencyId: string, userId: string): Promise<void> => {
  const { error } = await db
    .from('agency_system_users')
    .upsert(
      { agency_id: agencyId, user_id: userId },
      { onConflict: 'agency_id', ignoreDuplicates: true }
    );

  if (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      "Impossible d'associer le compte systeme a l'agence.",
      error.message
    );
  }
};

const loadAgencyNames = async (db: DbClient, agencyIds: string[]): Promise<Map<string, string>> => {
  if (agencyIds.length === 0) return new Map();

  const { data, error } = await db
    .from('agencies')
    .select('id, name')
    .in('id', agencyIds);

  if (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      'Impossible de charger les agences pour la suppression utilisateur.',
      error.message
    );
  }

  const byId = new Map<string, string>();
  for (const agency of data ?? []) {
    byId.set(agency.id, agency.name);
  }
  return byId;
};

const ensureAgencySystemUser = async (
  db: DbClient,
  agencyId: string,
  agencyName?: string
): Promise<string> => {
  const firstName = normalizePersonName(agencyName) ?? SYSTEM_DEFAULT_FIRST_NAME;
  const email = buildAgencySystemEmail(agencyId);
  const existingUserId = await getAgencySystemUserId(db, agencyId);
  if (existingUserId) {
    await ensureSystemProfileState(db, existingUserId, firstName, SYSTEM_LAST_NAME, agencyId);
    return existingUserId;
  }

  const provisionedUserId = await ensureSystemAuthUser(db, email, firstName, SYSTEM_LAST_NAME);

  await ensureSystemProfileState(db, provisionedUserId, firstName, SYSTEM_LAST_NAME, agencyId);
  await upsertAgencySystemUser(db, agencyId, provisionedUserId);

  const resolvedUserId = await getAgencySystemUserId(db, agencyId);
  if (!resolvedUserId) {
    throw httpError(
      500,
      'SYSTEM_USER_NOT_FOUND',
      "Compte systeme introuvable pour l'agence."
    );
  }
  return resolvedUserId;
};

const ensureOrphanSystemUser = async (db: DbClient): Promise<string> => {
  const email = buildOrphanSystemEmail();
  const userId = await ensureSystemAuthUser(db, email, SYSTEM_ORPHAN_FIRST_NAME, SYSTEM_LAST_NAME);
  await ensureSystemProfileState(db, userId, SYSTEM_ORPHAN_FIRST_NAME, SYSTEM_LAST_NAME);
  return userId;
};

const listUserInteractionOwnership = async (
  db: DbClient,
  userId: string
): Promise<{ agencyIds: string[]; hasOrphanInteractions: boolean }> => {
  const { data, error } = await db
    .from('interactions')
    .select('agency_id')
    .eq('created_by', userId);

  if (error) {
    throw httpError(
      500,
      'USER_DELETE_ANONYMIZATION_FAILED',
      "Impossible d'analyser les interactions de l'utilisateur.",
      error.message
    );
  }

  const agencyIds = new Set<string>();
  let hasOrphanInteractions = false;

  for (const row of data ?? []) {
    if (row.agency_id) {
      agencyIds.add(row.agency_id);
    } else {
      hasOrphanInteractions = true;
    }
  }

  return {
    agencyIds: [...agencyIds],
    hasOrphanInteractions
  };
};

const countUserInteractions = async (
  db: DbClient,
  userId: string,
  agencyId: string | null
): Promise<number> => {
  let query = db
    .from('interactions')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId);

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  } else {
    query = query.is('agency_id', null);
  }

  const { count, error } = await query;
  if (error) {
    throw httpError(
      500,
      'USER_DELETE_ANONYMIZATION_FAILED',
      "Impossible de compter les interactions a anonymiser.",
      error.message
    );
  }
  return count ?? 0;
};

const reassignUserInteractions = async (
  db: DbClient,
  userId: string,
  agencyId: string | null,
  targetUserId: string
): Promise<number> => {
  const interactionCount = await countUserInteractions(db, userId, agencyId);
  if (interactionCount === 0) return 0;

  let query = db
    .from('interactions')
    .update({ created_by: targetUserId })
    .eq('created_by', userId);

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  } else {
    query = query.is('agency_id', null);
  }

  const { error } = await query;
  if (error) {
    throw httpError(
      500,
      'USER_DELETE_ANONYMIZATION_FAILED',
      "Impossible de reattribuer les interactions de l'utilisateur.",
      error.message
    );
  }

  return interactionCount;
};

const anonymizeUserInteractionsBeforeDelete = async (
  db: DbClient,
  userId: string
): Promise<UserDeleteAnonymizationSummary> => {
  const ownership = await listUserInteractionOwnership(db, userId);
  if (ownership.agencyIds.length === 0 && !ownership.hasOrphanInteractions) {
    return {
      reassignedCount: 0,
      reassignedAgencyIds: [],
      orphanReassignedCount: 0
    };
  }

  const agencyNames = await loadAgencyNames(db, ownership.agencyIds);
  let reassignedCount = 0;

  for (const agencyId of ownership.agencyIds) {
    const systemUserId = await ensureAgencySystemUser(db, agencyId, agencyNames.get(agencyId));
    reassignedCount += await reassignUserInteractions(db, userId, agencyId, systemUserId);
  }

  let orphanReassignedCount = 0;
  if (ownership.hasOrphanInteractions) {
    const orphanSystemUserId = await ensureOrphanSystemUser(db);
    orphanReassignedCount = await reassignUserInteractions(db, userId, null, orphanSystemUserId);
    reassignedCount += orphanReassignedCount;
  }

  return {
    reassignedCount,
    reassignedAgencyIds: ownership.agencyIds,
    orphanReassignedCount
  };
};

const deleteAuthUser = async (userId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
  if (!error) return;

  const errorStatus = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  const message = error.message.toLowerCase();
  if (errorStatus === 404 || message.includes('not found')) {
    throw httpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }
  if (
    message.includes('foreign key')
    || message.includes('constraint')
    || message.includes('violates')
  ) {
    throw httpError(
      409,
      'USER_DELETE_REFERENCED',
      "Impossible de supprimer cet utilisateur car des donnees y sont rattachees."
    );
  }
  throw httpError(400, 'USER_DELETE_FAILED', error.message);
};

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
    case 'update_identity': {
      const { user_id: userId, email } = data;
      const firstName = normalizePersonName(data.first_name);
      const lastName = normalizePersonName(data.last_name);
      if (!firstName || !lastName) {
        throw httpError(400, 'INVALID_PAYLOAD', 'Nom et prenom requis.');
      }

      const displayName = buildDisplayName(lastName, firstName);
      if (!displayName) {
        throw httpError(400, 'INVALID_PAYLOAD', 'Nom et prenom requis.');
      }

      await ensureUserExists(db, userId);
      await ensureEmailAvailableForUser(db, userId, email);
      await updateAuthIdentity(userId, email, firstName, lastName);
      await updateProfile(db, userId, {
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName
      });

      return {
        request_id: requestId,
        ok: true,
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName
      };
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
    case 'delete': {
      const { user_id: userId } = data;
      if (userId === callerId) {
        throw httpError(409, 'USER_DELETE_SELF_FORBIDDEN', 'Impossible de supprimer votre propre compte.');
      }

      await ensureUserExists(db, userId);
      const anonymization = await anonymizeUserInteractionsBeforeDelete(db, userId);
      await deleteAuthUser(userId);

      return {
        request_id: requestId,
        ok: true,
        user_id: userId,
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
