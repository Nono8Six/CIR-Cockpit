import { assertEquals } from 'std/assert';

const RUN_FLAG = Deno.env.get('RUN_API_INTEGRATION') === '1';
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

type RequiredEnvKey = (typeof REQUIRED_ENV)[number];
type ApiPayload = Record<string, unknown>;
type ProcedurePath =
  | 'admin.users'
  | 'admin.agencies'
  | 'data.entities'
  | 'data.entity-contacts'
  | 'data.interactions'
  | 'data.config'
  | 'data.profile';

type AuthSession = {
  accessToken: string;
  userId: string;
};

type StatusRow = {
  id: string;
  label: string;
  category: string;
};

type IntegrationContext = {
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

const missingEnv = REQUIRED_ENV.filter((key) => !Deno.env.get(key)?.trim());
const ENV_CONFIGURED = missingEnv.length === 0;
const CAN_RUN_NETWORK_INTEGRATION = RUN_FLAG && ENV_CONFIGURED && HAS_NET_PERMISSION;

const baseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim().replace(/\/+$/, '');
const anonKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim();
const adminEmail = (Deno.env.get('API_INT_ADMIN_EMAIL') ?? '').trim();
const adminPassword = (Deno.env.get('API_INT_ADMIN_PASSWORD') ?? '').trim();
const userEmail = (Deno.env.get('API_INT_USER_EMAIL') ?? '').trim();
const userPassword = (Deno.env.get('API_INT_USER_PASSWORD') ?? '').trim();
const corsOrigin = (Deno.env.get('API_INT_ORIGIN') ?? 'http://localhost:3000').trim();

const apiBaseUrl = `${baseUrl}/functions/v1/api`;
const restBaseUrl = `${baseUrl}/rest/v1`;
const authBaseUrl = `${baseUrl}/auth/v1`;

const DATA_ROUTES: ProcedurePath[] = [
  'data.entities',
  'data.entity-contacts',
  'data.interactions',
  'data.config',
  'data.profile'
];

const ADMIN_ROUTES: ProcedurePath[] = ['admin.users', 'admin.agencies'];

const ALL_ROUTES: ProcedurePath[] = [...ADMIN_ROUTES, ...DATA_ROUTES];

const readString = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') return '';
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : '';
};

const readBoolean = (value: unknown, key: string): boolean | null => {
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

const readValue = (value: unknown, key: string): unknown => {
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

const postApi = async (
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
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(`REST request failed on ${pathAndQuery} (status ${response.status}).`);
  }

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
  if (!response.ok) {
    throw new Error(`Unable to sign in ${email} (status ${response.status}).`);
  }

  const accessToken = readString(payload, 'access_token');
  const user = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>).user
    : null;
  const userId = readString(user, 'id');

  if (!accessToken || !userId) {
    throw new Error(`Invalid auth payload for ${email}.`);
  }

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
  if (!agencyId) {
    throw new Error('No agency membership found for API_INT_USER_EMAIL.');
  }

  const statuses = await fetchRows<StatusRow>(
    `/agency_statuses?select=id,label,category&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  if (statuses.length === 0) {
    throw new Error(`No status found for agency ${agencyId}.`);
  }

  const interactionTypeRows = await fetchRows<{ label: string }>(
    `/agency_interaction_types?select=label&agency_id=eq.${agencyId}&order=sort_order.asc`,
    userSession.accessToken
  );
  const interactionType = interactionTypeRows[0]?.label?.trim() ?? '';
  if (!interactionType) {
    throw new Error(`No interaction type found for agency ${agencyId}.`);
  }

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
const getContext = (): Promise<IntegrationContext> => {
  if (!contextPromise) {
    contextPromise = buildContext();
  }
  return contextPromise;
};

Deno.test({
  name: 'integration env is configured when RUN_API_INTEGRATION=1',
  ignore: !RUN_FLAG,
  fn: () => {
    assertEquals(
      missingEnv.length,
      0,
      `Missing env variables: ${missingEnv.join(', ')}`
    );
  }
});

Deno.test({
  name: 'OPTIONS returns 200 with CORS headers on all API routes',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    for (const path of ALL_ROUTES) {
      const response = await fetch(`${apiBaseUrl}/trpc/${path}`, {
        method: 'OPTIONS',
        headers: {
          Origin: corsOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization, content-type, apikey'
        }
      });

      assertEquals(response.status, 200, `Unexpected OPTIONS status for ${path}`);
      assertEquals(response.headers.get('Access-Control-Allow-Origin') !== null, true);
      assertEquals(response.headers.get('Access-Control-Allow-Methods')?.includes('POST') ?? false, true);
      const allowedHeaders = response.headers.get('Access-Control-Allow-Headers')?.toLowerCase() ?? '';
      assertEquals(allowedHeaders.includes('authorization'), true);
      assertEquals(allowedHeaders.includes('x-client-authorization'), false);
      await response.text();
    }
  }
});

Deno.test({
  name: 'POST without token returns 401 AUTH_REQUIRED on all API routes',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    for (const path of ALL_ROUTES) {
      const { status, payload } = await postApi(path, '', {});
      assertEquals(status, 401, `Unexpected unauth status for ${path}`);
      assertEquals(readString(payload, 'code'), 'AUTH_REQUIRED');
    }
  }
});

Deno.test({
  name: 'POST with x-client-authorization only returns 401 AUTH_REQUIRED on all API routes',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();
    const clientAuthHeader = `Bearer ${context.userToken}`;

    for (const path of ALL_ROUTES) {
      const { status, payload } = await postApi(path, '', {}, {
        'x-client-authorization': clientAuthHeader
      });
      assertEquals(status, 401, `Unexpected x-client-authorization status for ${path}`);
      assertEquals(readString(payload, 'code'), 'AUTH_REQUIRED');
    }
  }
});

Deno.test({
  name: 'POST with user token on admin routes returns 403 AUTH_FORBIDDEN',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();
    for (const path of ADMIN_ROUTES) {
      const { status, payload } = await postApi(path, context.userToken, {});
      assertEquals(status, 403, `Unexpected admin forbidden status for ${path}`);
      assertEquals(readString(payload, 'code'), 'AUTH_FORBIDDEN');
    }
  }
});

Deno.test({
  name: 'POST with valid token and invalid payload returns 400 INVALID_PAYLOAD',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();

    for (const path of ADMIN_ROUTES) {
      const { status, payload } = await postApi(path, context.adminToken, {});
      assertEquals(status, 400, `Unexpected admin invalid payload status for ${path}`);
      assertEquals(readString(payload, 'code'), 'INVALID_PAYLOAD');
    }

    for (const path of DATA_ROUTES) {
      const { status, payload } = await postApi(path, context.userToken, {});
      assertEquals(status, 400, `Unexpected data invalid payload status for ${path}`);
      assertEquals(readString(payload, 'code'), 'INVALID_PAYLOAD');
    }
  }
});

Deno.test({
  name: 'admin routes reach service layer and return domain errors on unknown targets',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();

    const missingUser = await postApi('admin.users', context.adminToken, {
      action: 'set_role',
      user_id: crypto.randomUUID(),
      role: 'tcs'
    });
    assertEquals(missingUser.status, 404);
    assertEquals(readString(missingUser.payload, 'code'), 'USER_NOT_FOUND');

    const missingAgency = await postApi('admin.agencies', context.adminToken, {
      action: 'hard_delete',
      agency_id: crypto.randomUUID()
    });
    assertEquals(missingAgency.status, 404);
    assertEquals(readString(missingAgency.payload, 'code'), 'AGENCY_NOT_FOUND');
  }
});

Deno.test({
  name: 'POST data routes forbid cross-agency mutations for non super-admin users',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();
    const foreignAgencyId = crypto.randomUUID();

    const entitiesForbidden = await postApi('data.entities', context.userToken, {
      action: 'save',
      agency_id: foreignAgencyId,
      entity_type: 'Prospect',
      entity: {
        name: 'P3 cross agency blocked',
        address: '2 rue de Test',
        postal_code: '75001',
        department: '75',
        city: 'Paris',
        siret: '',
        notes: '',
        agency_id: foreignAgencyId
      }
    });
    assertEquals(entitiesForbidden.status, 403);
    assertEquals(readString(entitiesForbidden.payload, 'code'), 'AUTH_FORBIDDEN');

    const configForbidden = await postApi('data.config', context.userToken, {
      agency_id: foreignAgencyId,
      statuses: context.configStatuses,
      services: context.configServices,
      entities: context.configEntities,
      families: context.configFamilies,
      interactionTypes: context.configInteractionTypes
    });
    assertEquals(configForbidden.status, 403);
    assertEquals(readString(configForbidden.payload, 'code'), 'AUTH_FORBIDDEN');
  }
});

Deno.test({
  name: 'data routes execute service + DB with valid payloads',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();

    const profileUpdate = await postApi('data.profile', context.userToken, {
      action: 'password_changed'
    });
    assertEquals(profileUpdate.status, 200);
    assertEquals(readBoolean(profileUpdate.payload, 'ok'), true);

    const entityName = `P2 integration prospect ${Date.now()}`;
    const createdEntity = await postApi('data.entities', context.userToken, {
      action: 'save',
      agency_id: context.agencyId,
      entity_type: 'Prospect',
      entity: {
        name: entityName,
        address: '1 rue de Test',
        postal_code: '75001',
        department: '75',
        city: 'Paris',
        siret: '',
        notes: '',
        agency_id: context.agencyId
      }
    });
    assertEquals(createdEntity.status, 200);
    const entity = createdEntity.payload && typeof createdEntity.payload === 'object'
      ? (createdEntity.payload as ApiPayload).entity
      : null;
    const entityId = readString(entity, 'id');
    assertEquals(Boolean(entityId), true);

    const archivedEntity = await postApi('data.entities', context.userToken, {
      action: 'archive',
      entity_id: entityId,
      archived: true
    });
    assertEquals(archivedEntity.status, 200);
    assertEquals(readBoolean(archivedEntity.payload, 'ok'), true);

    const restoredEntity = await postApi('data.entities', context.userToken, {
      action: 'archive',
      entity_id: entityId,
      archived: false
    });
    assertEquals(restoredEntity.status, 200);
    assertEquals(readBoolean(restoredEntity.payload, 'ok'), true);

    const convertedEntity = await postApi('data.entities', context.userToken, {
      action: 'convert_to_client',
      entity_id: entityId,
      convert: {
        client_number: String(Date.now()).slice(-10),
        account_type: 'term'
      }
    });
    assertEquals(convertedEntity.status, 200);
    assertEquals(readBoolean(convertedEntity.payload, 'ok'), true);

    const createdContact = await postApi('data.entity-contacts', context.userToken, {
      action: 'save',
      entity_id: entityId,
      contact: {
        first_name: 'P2',
        last_name: 'Integration',
        email: '',
        phone: '0102030405',
        position: '',
        notes: ''
      }
    });
    assertEquals(createdContact.status, 200);
    const contact = createdContact.payload && typeof createdContact.payload === 'object'
      ? (createdContact.payload as ApiPayload).contact
      : null;
    const contactId = readString(contact, 'id');
    assertEquals(Boolean(contactId), true);

    const deletedContact = await postApi('data.entity-contacts', context.userToken, {
      action: 'delete',
      contact_id: contactId
    });
    assertEquals(deletedContact.status, 200);
    assertEquals(readBoolean(deletedContact.payload, 'ok'), true);

    const savedInteraction = await postApi('data.interactions', context.userToken, {
      action: 'save',
      agency_id: context.agencyId,
      interaction: {
        id: crypto.randomUUID(),
        channel: 'Téléphone',
        entity_type: 'Client',
        contact_service: 'Accueil',
        company_name: '',
        contact_name: '',
        contact_phone: '0102030405',
        contact_email: '',
        subject: 'Integration P2',
        mega_families: [],
        status_id: context.statusId,
        interaction_type: context.interactionType,
        order_ref: '',
        reminder_at: new Date().toISOString(),
        notes: '',
        entity_id: entityId
      }
    });
    assertEquals(savedInteraction.status, 200);
    assertEquals(readBoolean(savedInteraction.payload, 'ok'), true);
    const savedInteractionPayload = readValue(savedInteraction.payload, 'interaction');
    const interactionId = readString(savedInteractionPayload, 'id');
    const interactionUpdatedAt = readString(savedInteractionPayload, 'updated_at');
    assertEquals(Boolean(interactionId), true);
    assertEquals(Boolean(interactionUpdatedAt), true);

    const updatedInteraction = await postApi('data.interactions', context.userToken, {
      action: 'add_timeline_event',
      interaction_id: interactionId,
      expected_updated_at: interactionUpdatedAt,
      event: {
        id: crypto.randomUUID(),
        type: 'note',
        content: 'Evenement integration P3',
        author: 'integration',
        date: new Date().toISOString()
      },
      updates: {
        notes: 'note integration p3'
      }
    });
    assertEquals(updatedInteraction.status, 200);
    assertEquals(readBoolean(updatedInteraction.payload, 'ok'), true);

    const savedConfig = await postApi('data.config', context.userToken, {
      agency_id: context.agencyId,
      statuses: context.configStatuses,
      services: context.configServices,
      entities: context.configEntities,
      families: context.configFamilies,
      interactionTypes: context.configInteractionTypes
    });
    assertEquals(savedConfig.status, 200);
    assertEquals(readBoolean(savedConfig.payload, 'ok'), true);

    const invalidConfig = await postApi('data.config', context.userToken, {
      agency_id: context.agencyId,
      statuses: [{ id: context.statusId, label: 'invalid status', category: 'invalid' }],
      services: context.configServices,
      entities: context.configEntities,
      families: context.configFamilies,
      interactionTypes: context.configInteractionTypes
    });
    assertEquals(invalidConfig.status, 400);
    assertEquals(readString(invalidConfig.payload, 'code'), 'CONFIG_INVALID');
  }
});
