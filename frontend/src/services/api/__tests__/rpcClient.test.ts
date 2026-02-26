import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildRpcRequestInit, rpcClient } from '@/services/api/rpcClient';
import { callTrpcMutation } from '@/services/api/trpcClient';

vi.mock('../trpcClient', () => ({
  buildRpcRequestInit: vi.fn(async (init?: RequestInit) => ({
    ...init,
    headers: new Headers(init?.headers)
  })),
  callTrpcMutation: vi.fn(async () => ({ ok: true }))
}));

const mockBuildRpcRequestInit = vi.mocked(buildRpcRequestInit);
const mockCallTrpcMutation = vi.mocked(callTrpcMutation);

describe('rpcClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('buildRpcRequestInit preserves headers and content type', async () => {
    const init = await buildRpcRequestInit({
      headers: {
        'x-request-id': 'req-1',
        'Content-Type': 'application/json'
      }
    });

    const headers = new Headers(init.headers);
    expect(headers.get('x-request-id')).toBe('req-1');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('routes entities payloads to data.entities trpc path', async () => {
    const payload = {
      action: 'save',
      agency_id: 'agency-1'
    };

    await rpcClient.data.entities.$post(
      { json: payload },
      { headers: { 'x-request-id': 'req-2' } }
    );

    expect(mockBuildRpcRequestInit).toHaveBeenCalledTimes(1);
    expect(mockCallTrpcMutation).toHaveBeenCalledWith(
      'data.entities',
      payload,
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
  });

  it('routes admin payloads to admin.users trpc path', async () => {
    const payload = {
      action: 'set_role',
      user_id: 'user-1',
      role: 'tcs'
    };

    await rpcClient.admin.users.$post({ json: payload });

    expect(mockCallTrpcMutation).toHaveBeenCalledWith(
      'admin.users',
      payload,
      expect.any(Object)
    );
  });
});
