import { buildRpcRequestInit, callTrpcMutation } from './trpcClient';

export type RpcJsonRequest = { json: unknown };
export type RpcPost = (request: RpcJsonRequest, init?: RequestInit) => Promise<unknown>;

type RpcLeaf = {
  $post: RpcPost;
};

export type RpcClient = {
  data: {
    profile: RpcLeaf;
    config: RpcLeaf;
    entities: RpcLeaf;
    'entity-contacts': RpcLeaf;
    interactions: RpcLeaf;
  };
  admin: {
    users: RpcLeaf;
    agencies: RpcLeaf;
  };
};

const createRpcPost = (path: string): RpcPost =>
  async (request, init) => {
    const requestInit = await buildRpcRequestInit(init);
    return callTrpcMutation(path, request.json, requestInit);
  };

export const rpcClient: RpcClient = {
  data: {
    profile: { $post: createRpcPost('data.profile') },
    config: { $post: createRpcPost('data.config') },
    entities: { $post: createRpcPost('data.entities') },
    'entity-contacts': { $post: createRpcPost('data.entity-contacts') },
    interactions: { $post: createRpcPost('data.interactions') }
  },
  admin: {
    users: { $post: createRpcPost('admin.users') },
    agencies: { $post: createRpcPost('admin.agencies') }
  }
};

export { buildRpcRequestInit } from './trpcClient';
