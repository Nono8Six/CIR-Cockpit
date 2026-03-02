import { assertEquals } from 'std/assert';

import {
  ADMIN_ROUTES,
  ALL_ROUTES,
  CAN_RUN_NETWORK_INTEGRATION,
  DATA_ROUTES,
  RUN_FLAG,
  corsOrigin,
  getContext,
  missingEnv,
  postApi,
  readString
} from './helpers.ts';

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
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim().replace(/\/+$/, '');
    for (const path of ALL_ROUTES) {
      const response = await fetch(`${supabaseUrl}/functions/v1/api/trpc/${path}`, {
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
