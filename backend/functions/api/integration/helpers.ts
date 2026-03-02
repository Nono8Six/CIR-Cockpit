import { assert } from 'std/assert';

export const RUN_FLAG = Deno.env.get('RUN_API_INTEGRATION') === '1';
const NET_PERMISSION = await Deno.permissions.query({ name: 'net' });
const HAS_NET_PERMISSION = NET_PERMISSION.state === 'granted';

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'API_INT_ADMIN_EMAIL',
  'API_INT_ADMIN_PASSWORD',
  'API_INT_USER_EMAIL',
  'API_INT_USER_PASSWORD'
] as const;

export type ProcedurePath =
  | 'admin.users'
  | 'admin.agencies'
  | 'data.entities'
  | 'data.entity-contacts'
  | 'data.interactions'
  | 'data.config'
  | 'data.profile';

type ApiPayload = Record<string, unknown>;

type AuthSession = {
  accessToken: string;
  userId: string;
};

type StatusRow = {
  id: string;
  label: string;
  category: string;
};

export type IntegrationContext = {
  adminToken: string;
  userToken: string;
  agencyId: string;
  statusId: string;
  interactionType: string;
  configStatuses: Array<Pick<StatusRow, 'id' | 'label' | 'category'>>;
  configServices: string[];
  configEntities: string[];
  configFamilies: string[];
  configInteractionTypes: string[];
};

export const missingEnv = REQUIRED_ENV.filter((key) => !Deno.env.get(key)?.trim());
const ENV_CONFIGURED = missingEnv.length === 0;
export const CAN_RUN_NETWORK_INTEGRATION = RUN_FLAG && ENV_CONFIGURED && HAS_NET_PERMISSION;

const baseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim().replace(/\/+$/, '');
const anonKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim();
const adminEmail = (Deno.env.get('API_INT_ADMIN_EMAIL') ?? '').trim();
const adminPassword = (Deno.env.get('API_INT_ADMIN_PASSWORD') ?? '').trim();
const userEmail = (Deno.env.get('API_INT_USER_EMAIL') ?? '').trim();
const userPassword = (Deno.env.get('API_INT_USER_PASSWORD') ?? '').trim();
export const corsOrigin = (Deno.env.get('API_INT_ORIGIN') ?? 'http://localhost:3000').trim();

const apiBaseUrl = `${baseUrl}/functions/v1/api`;
const restBaseUrl = `${baseUrl}/rest/v1`;
const authBaseUrl = `${baseUrl}/auth/v1`;

export const DATA_ROUTES: ProcedurePath[] = [
  'data.entities',
  'data.entity-contacts',
  'data.interactions',
  'data.config',
  'data.profile'
];

export const ADMIN_ROUTES: ProcedurePath[] = ['admin.users', 'admin.agencies'];
export const ALL_ROUTES: ProcedurePath[] = [...ADMIN_ROUTES, ...DATA_ROUTES];

export const readString = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') return '';
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : '';
};

export const readBoolean = (value: unknown, key: string): boolean | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'boolean' ? candidate : null;
};

const readObject = (value: unknown, key: string): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as Record<string, unknown>)[key];
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as Record<string, unknown>
    : null;
};

export const readValue = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== 'object') return null;
  return (value as Record<string, unknown>)[key] ?? null;
};

const parseJsonOrNull = async (response: Response): Promise<unknown | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const parseTrpcPayload = (payload: unknown): unknown | null => {
  if (!payload || typeof payload !== 'object') return payload;
  const result = readObject(payload, 'result');
  const resultData = result ? readObject(result, 'data') : null;
  const jsonData = resultData ? readValue(resultData, 'json') : null;
  if (jsonData !== null && jsonData !== undefined) {
    return jsonData;
  }

  const error = readObject(payload, 'error');
  if (!error) {
    return payload;
  }

  const errorData = readObject(error, 'data');
  return {
    code: readString(errorData, 'appCode') || readString(errorData, 'code'),
    error: readString(error, 'message'),
    details: readString(errorData, 'details'),
    request_id: readString(errorData, 'requestId')
  };
};

export const postApi = async (
  path: ProcedurePath,
  token: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<{ status: number; payload: unknown | null }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    apikey: anonKey
  };

  if (token.trim()) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value;
    }
  }

  const response = await fetch(`${apiBaseUrl}/trpc/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const payload = parseTrpcPayload(await parseJsonOrNull(response));
  return {
    status: response.status,
    payload
  };
};

const fetchRows = async <TRow>(pathAndQuery: string, token: string): Promise<TRow[]> => {
  const response = await fetch(`${restBaseUrl}${pathAndQuery}`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await parseJsonOrNull(response);
  assert(response.ok, `REST request failed on ${pathAndQuery} (status ${response.status}).`);
  assert(Array.isArray(payload), `REST payload invalide sur ${pathAndQuery}.`);

  return payload as TRow[];
};

const signIn = async (email: string, password: string): Promise<AuthSession> => {
  const response = await fetch(`${authBaseUrl}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await parseJsonOrNull(response);
  assert(response.ok, `Unable to sign in ${email} (status ${response.status}).`);

  const accessToken = readString(payload, 'access_token');
  const user = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>).user
    : null;
  const userId = readString(user, 'id');

  assert(accessToken.length > 0, `Access token missing for ${email}.`);
  assert(userId.length > 0, `User id missing for ${email}.`);

  return { accessToken, userId };
};

const buildContext = async (): Promise<IntegrationContext> => {
  const adminSession = await signIn(adminEmail, adminPassword);
  const userSession = await signIn(userEmail, userPassword);

  const memberships = await fetchRows<{ agency_id: string }>(
    `/agency_members?select=agency_id&user_id=eq.${userSession.userId}&limit=1`,
    userSession.accessToken
  );
  const agencyId = memberships[0]?.agency_id ?? '';
  assert(agencyId.length > 0, 'No agency membership found for API_INT_USER_EMAIL.');

  const statuses = await fetchRows<StatusRow>(
    `/agency_statuses?select=id,label,category&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  assert(statuses.length > 0, `No status found for agency ${agencyId}.`);

  const interactionTypeRows = await fetchRows<{ label: string }>(
    `/agency_interaction_types?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  const interactionType = interactionTypeRows[0]?.label?.trim() ?? '';
  assert(interactionType.length > 0, `No interaction type found for agency ${agencyId}.`);

  const serviceRows = await fetchRows<{ label: string }>(
    `/agency_services?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  const entityRows = await fetchRows<{ label: string }>(
    `/agency_entities?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  const familyRows = await fetchRows<{ label: string }>(
    `/agency_families?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );

  return {
    adminToken: adminSession.accessToken,
    userToken: userSession.accessToken,
    agencyId,
    statusId: statuses[0].id,
    interactionType,
    configStatuses: statuses.map((status) => ({
      id: status.id,
      label: status.label,
      category: status.category
    })),
    configServices: serviceRows.map((row) => row.label),
    configEntities: entityRows.map((row) => row.label),
    configFamilies: familyRows.map((row) => row.label),
    configInteractionTypes: interactionTypeRows.map((row) => row.label)
  };
};

let contextPromise: Promise<IntegrationContext> | null = null;

export const getContext = (): Promise<IntegrationContext> => {
  if (!contextPromise) {
    contextPromise = buildContext();
  }
  return contextPromise;
};

export const readEntityFromPayload = (payload: unknown): ApiPayload | null => {
  const candidate = readValue(payload, 'entity');
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as ApiPayload
    : null;
};

export const readContactFromPayload = (payload: unknown): ApiPayload | null => {
  const candidate = readValue(payload, 'contact');
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as ApiPayload
    : null;
};
