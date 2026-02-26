// GENERATED FILE - DO NOT EDIT
// Source of truth: backend/functions/api/app.ts

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
    "users": "/trpc/admin.users",
    "agencies": "/trpc/admin.agencies"
  },
  "data": {
    "entities": "/trpc/data.entities",
    "entity-contacts": "/trpc/data.entity-contacts",
    "interactions": "/trpc/data.interactions",
    "config": "/trpc/data.config",
    "profile": "/trpc/data.profile"
  }
} as const satisfies RpcPathTree;

export type AppType = RpcTreeToClient<typeof RPC_POST_PATHS>;
