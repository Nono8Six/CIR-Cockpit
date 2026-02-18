// GENERATED FILE - DO NOT EDIT
// Source of truth: backend/functions/api/app.ts and backend/functions/api/routes/*.ts

export type RpcJsonRequest = { json: unknown };
export type RpcPost = (request: RpcJsonRequest, init?: RequestInit) => Promise<Response>;

type RpcPathTree = {
  readonly [key: string]: string | RpcPathTree;
};

type RpcLeaf = {
  $post: RpcPost;
};

type RpcTreeToClient<T extends RpcPathTree> = {
  [K in keyof T]: T[K] extends string
    ? RpcLeaf
    : RpcTreeToClient<Extract<T[K], RpcPathTree>>;
};

export const RPC_POST_PATHS = {
  "admin": {
    "users": "/admin/users",
    "agencies": "/admin/agencies"
  },
  "data": {
    "entities": "/data/entities",
    "entity-contacts": "/data/entity-contacts",
    "interactions": "/data/interactions",
    "config": "/data/config",
    "profile": "/data/profile"
  }
} as const satisfies RpcPathTree;

export type AppType = RpcTreeToClient<typeof RPC_POST_PATHS>;
