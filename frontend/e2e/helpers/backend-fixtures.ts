import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type SupabaseSession = {
  accessToken: string;
  userId: string;
};

type EnsureE2eUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'super_admin' | 'agency_admin' | 'tcs';
  mustChangePassword: boolean;
};

type EnsureE2eUserResult = {
  email: string;
  password: string;
  userId: string;
  agencyId: string;
};

type TrpcPayload = Record<string, unknown>;

type ProfileRow = {
  id: string;
  archivedAt: string | null;
};

class E2eBackendFixtureError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 500, code = 'REQUEST_FAILED') {
    super(message);
    this.name = 'E2eBackendFixtureError';
    this.status = status;
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown, key: string): string => {
  if (!isRecord(value)) return '';
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : '';
};

const readObject = (value: unknown, key: string): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const candidate = value[key];
  return isRecord(candidate) ? candidate : null;
};

const readUnknown = (value: unknown, key: string): unknown => {
  if (!isRecord(value)) return undefined;
  return value[key];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..', '..');

const readEnvFileValue = (filePath: string, key: string): string => {
  if (!fs.existsSync(filePath)) return '';

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const candidateKey = trimmed.slice(0, separatorIndex).trim();
    if (candidateKey !== key) continue;
    return trimmed.slice(separatorIndex + 1).trim();
  }

  return '';
};

const getEnvValue = (key: string, fallbackKey?: string): string => {
  const direct = process.env[key]?.trim() ?? '';
  if (direct) return direct;

  if (fallbackKey) {
    const fallbackFromProcess = process.env[fallbackKey]?.trim() ?? '';
    if (fallbackFromProcess) return fallbackFromProcess;
  }

  const envFilePath = path.resolve(frontendRoot, '.env');
  if (fallbackKey) {
    const fallbackFromFile = readEnvFileValue(envFilePath, fallbackKey);
    if (fallbackFromFile) return fallbackFromFile;
  }

  const directFromFile = readEnvFileValue(envFilePath, key);
  return directFromFile;
};

const getRequiredConfig = (key: string, fallbackKey?: string): string => {
  const value = getEnvValue(key, fallbackKey);
  if (value) return value;
  throw new E2eBackendFixtureError(`Configuration E2E manquante: ${key}.`, 500, 'CONFIG_MISSING');
};

const parseJsonOrNull = async (response: Response): Promise<unknown | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const unwrapTrpcPayload = (payload: unknown): unknown => {
  const result = readObject(payload, 'result');
  const data = result ? readObject(result, 'data') : null;
  const jsonPayload = data ? readUnknown(data, 'json') : undefined;
  if (jsonPayload !== undefined) {
    return jsonPayload;
  }
  return payload;
};

const extractError = (payload: unknown, status: number): E2eBackendFixtureError => {
  const errorObject = readObject(payload, 'error');
  if (errorObject) {
    const errorData = readObject(errorObject, 'data');
    const appCode = readString(errorData, 'appCode') || readString(errorData, 'code') || 'REQUEST_FAILED';
    const message = readString(errorObject, 'message') || 'Requete backend E2E en echec.';
    return new E2eBackendFixtureError(message, status, appCode);
  }

  if (isRecord(payload)) {
    const appCode = readString(payload, 'code') || 'REQUEST_FAILED';
    const message = readString(payload, 'error') || 'Requete backend E2E en echec.';
    return new E2eBackendFixtureError(message, status, appCode);
  }

  return new E2eBackendFixtureError('Requete backend E2E en echec.', status, 'REQUEST_FAILED');
};

const getSupabaseUrl = (): string => getRequiredConfig('E2E_SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/+$/, '');
const getAnonKey = (): string => getRequiredConfig('E2E_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
const getAdminEmail = (): string => getRequiredConfig('E2E_ADMIN_EMAIL');
const getAdminPassword = (): string => getRequiredConfig('E2E_ADMIN_PASSWORD');

const signIn = async (email: string, password: string): Promise<SupabaseSession> => {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: getAnonKey()
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await parseJsonOrNull(response);
  if (!response.ok) {
    throw extractError(payload, response.status);
  }

  const accessToken = readString(payload, 'access_token');
  const user = readObject(payload, 'user');
  const userId = readString(user, 'id');
  if (!accessToken || !userId) {
    throw new E2eBackendFixtureError('Session Supabase invalide pour les fixtures E2E.', 500, 'AUTH_REQUIRED');
  }

  return { accessToken, userId };
};

const fetchRestRows = async (pathAndQuery: string, token: string): Promise<unknown[]> => {
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/${pathAndQuery}`, {
    method: 'GET',
    headers: {
      apikey: getAnonKey(),
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await parseJsonOrNull(response);
  if (!response.ok) {
    throw extractError(payload, response.status);
  }
  if (!Array.isArray(payload)) {
    throw new E2eBackendFixtureError('Payload REST E2E invalide.', 500, 'EDGE_INVALID_RESPONSE');
  }

  return payload;
};

const postTrpc = async (pathName: string, token: string, body: TrpcPayload): Promise<unknown> => {
  const response = await fetch(`${getSupabaseUrl()}/functions/v1/api/trpc/${pathName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: getAnonKey(),
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const rawPayload = await parseJsonOrNull(response);
  const payload = unwrapTrpcPayload(rawPayload);
  if (!response.ok) {
    throw extractError(rawPayload ?? payload, response.status);
  }

  const okValue = isRecord(payload) ? payload.ok : undefined;
  if (okValue === false) {
    throw extractError(payload, 500);
  }

  return payload;
};

const getDefaultAgencyId = async (adminSession: SupabaseSession): Promise<string> => {
  const rows = await fetchRestRows(
    `agency_members?select=agency_id&user_id=eq.${adminSession.userId}&limit=1`,
    adminSession.accessToken
  );
  const first = rows[0];
  const agencyId = readString(first, 'agency_id');
  if (!agencyId) {
    throw new E2eBackendFixtureError('Aucune agence disponible pour les fixtures E2E.', 404, 'AGENCY_NOT_FOUND');
  }
  return agencyId;
};

const getProfileByEmail = async (adminToken: string, email: string): Promise<ProfileRow | null> => {
  const rows = await fetchRestRows(
    `profiles?select=id,archived_at&email=eq.${encodeURIComponent(email)}&limit=1`,
    adminToken
  );
  const first = rows[0];
  const id = readString(first, 'id');
  if (!id) return null;
  const archivedAtValue = isRecord(first) ? first.archived_at : null;
  const archivedAt = typeof archivedAtValue === 'string' ? archivedAtValue : null;
  return { id, archivedAt };
};

const setPasswordChanged = async (email: string, password: string): Promise<void> => {
  const userSession = await signIn(email, password);
  await postTrpc('data.profile', userSession.accessToken, { action: 'password_changed' });
};

export const ensureE2eUser = async (input: EnsureE2eUserInput): Promise<EnsureE2eUserResult> => {
  const adminSession = await signIn(getAdminEmail(), getAdminPassword());
  const agencyId = await getDefaultAgencyId(adminSession);
  const role = input.role ?? 'tcs';

  let userId = '';
  try {
    const createPayload = await postTrpc('admin.users', adminSession.accessToken, {
      action: 'create',
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      role,
      agency_ids: role === 'tcs' ? [agencyId] : [],
      password: input.password
    });
    userId = readString(createPayload, 'user_id');
  } catch (error) {
    if (!(error instanceof E2eBackendFixtureError) || error.code !== 'CONFLICT') {
      throw error;
    }
  }

  if (!userId) {
    const profile = await getProfileByEmail(adminSession.accessToken, input.email);
    if (!profile) {
      throw new E2eBackendFixtureError('Utilisateur E2E introuvable apres creation.', 404, 'USER_NOT_FOUND');
    }

    userId = profile.id;
    if (profile.archivedAt) {
      await postTrpc('admin.users', adminSession.accessToken, {
        action: 'unarchive',
        user_id: userId
      });
    }

    await postTrpc('admin.users', adminSession.accessToken, {
      action: 'set_role',
      user_id: userId,
      role
    });

    if (role === 'tcs') {
      await postTrpc('admin.users', adminSession.accessToken, {
        action: 'set_memberships',
        user_id: userId,
        mode: 'replace',
        agency_ids: [agencyId]
      });
    }

    await postTrpc('admin.users', adminSession.accessToken, {
      action: 'update_identity',
      user_id: userId,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName
    });

    await postTrpc('admin.users', adminSession.accessToken, {
      action: 'reset_password',
      user_id: userId,
      password: input.password
    });
  }

  if (!input.mustChangePassword) {
    await setPasswordChanged(input.email, input.password);
  }

  return {
    email: input.email,
    password: input.password,
    userId,
    agencyId
  };
};

export const deleteE2eUserByEmail = async (email: string): Promise<void> => {
  const adminSession = await signIn(getAdminEmail(), getAdminPassword());
  const profile = await getProfileByEmail(adminSession.accessToken, email);
  if (!profile) return;

  await postTrpc('admin.users', adminSession.accessToken, {
    action: 'delete',
    user_id: profile.id
  });
};
