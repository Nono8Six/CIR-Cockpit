import { assert } from 'std/assert';

import { integrationEnv, missingIntegrationEnv } from './env.ts';

export const RUN_FLAG = integrationEnv.runFlag;
const NET_PERMISSION = await Deno.permissions.query({ name: 'net' });
const HAS_NET_PERMISSION = NET_PERMISSION.state === 'granted';

export type ProcedurePath =
  | 'admin.users'
  | 'admin.agencies'
  | 'data.entities'
  | 'data.searchEntitiesUnified'
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

export const missingEnv = missingIntegrationEnv;
const ENV_CONFIGURED = missingEnv.length === 0;
export const CAN_RUN_NETWORK_INTEGRATION = RUN_FLAG && ENV_CONFIGURED && HAS_NET_PERMISSION;

const baseUrl = integrationEnv.supabaseUrl;
const anonKey = integrationEnv.anonKey;
const adminEmail = integrationEnv.adminEmail;
const adminPassword = integrationEnv.adminPassword;
const userEmail = integrationEnv.userEmail;
const userPassword = integrationEnv.userPassword;
export const corsOrigin = integrationEnv.corsOrigin;

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

export const QUERY_ROUTES: ProcedurePath[] = ['data.searchEntitiesUnified'];
export const ADMIN_ROUTES: ProcedurePath[] = ['admin.users', 'admin.agencies'];
export const ALL_ROUTES: ProcedurePath[] = [...ADMIN_ROUTES, ...DATA_ROUTES, ...QUERY_ROUTES];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readRecordField = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] ?? null : null;

export const readString = (value: unknown, key: string): string => {
  const candidate = readRecordField(value, key);
  return typeof candidate === 'string' ? candidate : '';
};

export const readBoolean = (value: unknown, key: string): boolean | null => {
  const candidate = readRecordField(value, key);
  return typeof candidate === 'boolean' ? candidate : null;
};

const readObject = (value: unknown, key: string): Record<string, unknown> | null => {
  const candidate = readRecordField(value, key);
  return isRecord(candidate) ? candidate : null;
};

export const readValue = (value: unknown, key: string): unknown =>
  readRecordField(value, key);

const parseJsonOrNull = async (response: Response): Promise<unknown | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const parseTrpcPayload = (payload: unknown): unknown | null => {
  if (!isRecord(payload)) {
    return payload;
  }

  const result = readObject(payload, 'result');
  const resultData = result ? readObject(result, 'data') : null;
  const jsonData = resultData ? readValue(resultData, 'json') : null;
  if (jsonData !== null && jsonData !== undefined) {
    return jsonData;
  }
  if (resultData) {
    return resultData;
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

export const getApi = async (
  path: ProcedurePath,
  token: string,
  input: unknown,
  extraHeaders?: Record<string, string>
): Promise<{ status: number; payload: unknown | null }> => {
  const headers: HeadersInit = { apikey: anonKey };

  if (token.trim()) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value;
    }
  }

  const encodedInput = encodeURIComponent(JSON.stringify(input));
  const response = await fetch(`${apiBaseUrl}/trpc/${path}?input=${encodedInput}`, {
    method: 'GET',
    headers
  });

  const payload = parseTrpcPayload(await parseJsonOrNull(response));
  return {
    status: response.status,
    payload
  };
};

const fetchRows = async (pathAndQuery: string, token: string): Promise<unknown[]> => {
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

  return payload;
};

const requireString = (value: unknown, key: string, resource: string): string => {
  const candidate = readString(value, key).trim();
  assert(candidate.length > 0, `${resource}: ${key} manquant.`);
  return candidate;
};

const toStatusRow = (value: unknown, index: number): StatusRow => ({
  id: requireString(value, 'id', `agency_statuses[${index}]`),
  label: requireString(value, 'label', `agency_statuses[${index}]`),
  category: requireString(value, 'category', `agency_statuses[${index}]`)
});

const toLabel = (value: unknown, resource: string, index: number): string =>
  requireString(value, 'label', `${resource}[${index}]`);

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
  const user = readObject(payload, 'user');
  const userId = readString(user, 'id');

  assert(accessToken.length > 0, `Access token missing for ${email}.`);
  assert(userId.length > 0, `User id missing for ${email}.`);

  return { accessToken, userId };
};

const buildContext = async (): Promise<IntegrationContext> => {
  const adminSession = await signIn(adminEmail, adminPassword);
  const userSession = await signIn(userEmail, userPassword);

  const memberships = await fetchRows(
    `/agency_members?select=agency_id&user_id=eq.${userSession.userId}&limit=1`,
    userSession.accessToken
  );
  const agencyId = memberships
    .map((value) => readString(value, 'agency_id').trim())
    .find((value) => value.length > 0) ?? '';
  assert(agencyId.length > 0, 'No agency membership found for API_INT_USER_EMAIL.');

  const statuses = (await fetchRows(
    `/agency_statuses?select=id,label,category&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  )).map(toStatusRow);
  assert(statuses.length > 0, `No status found for agency ${agencyId}.`);

  const interactionTypeRows = await fetchRows(
    `/agency_interaction_types?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  const interactionType = interactionTypeRows
    .map((row, index) => toLabel(row, 'agency_interaction_types', index))
    .find((value) => value.length > 0) ?? '';
  assert(interactionType.length > 0, `No interaction type found for agency ${agencyId}.`);

  const serviceRows = await fetchRows(
    `/agency_services?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  const entityRows = await fetchRows(
    `/agency_entities?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  const familyRows = await fetchRows(
    `/agency_families?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );

  return {
    adminToken: adminSession.accessToken,
    userToken: userSession.accessToken,
    agencyId,
    statusId: statuses[0]?.id ?? '',
    interactionType,
    configStatuses: statuses.map((status) => ({
      id: status.id,
      label: status.label,
      category: status.category
    })),
    configServices: serviceRows.map((row, index) => toLabel(row, 'agency_services', index)),
    configEntities: entityRows.map((row, index) => toLabel(row, 'agency_entities', index)),
    configFamilies: familyRows.map((row, index) => toLabel(row, 'agency_families', index)),
    configInteractionTypes: interactionTypeRows.map((row, index) =>
      toLabel(row, 'agency_interaction_types', index)
    )
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
  return isRecord(candidate) ? candidate : null;
};

export const readContactFromPayload = (payload: unknown): ApiPayload | null => {
  const candidate = readValue(payload, 'contact');
  return isRecord(candidate) ? candidate : null;
};
