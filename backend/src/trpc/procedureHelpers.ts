import { sql } from 'drizzle-orm';

import { getDbClient } from '../../drizzle/index.ts';
import type { AuthContext, AuthenticatedDbAccess, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import type { TrpcContext } from './context.ts';
import { handleProcedureError } from './procedures.ts';

type AuthedProcedureContext = TrpcContext & { authContext?: AuthContext };
type SuperAdminProcedureContext = TrpcContext & {
  authContext?: AuthContext;
  callerId?: string;
};

type AuthedHandler<TInput, TOutput> = (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: TInput
) => Promise<TOutput>;

type AuthedNoDbHandler<TInput, TOutput> = (
  authContext: AuthContext,
  requestId: string,
  input: TInput
) => Promise<TOutput>;

type AuthedPhasedHandler<TInput, TOutput> = (
  dbAccess: AuthenticatedDbAccess,
  authContext: AuthContext,
  requestId: string,
  input: TInput
) => Promise<TOutput>;

type SuperAdminHandler<TInput, TOutput> = (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: TInput
) => Promise<TOutput>;

type SuperAdminPhasedHandler<TInput, TOutput> = (
  dbAccess: AuthenticatedDbAccess,
  callerId: string,
  requestId: string,
  input: TInput
) => Promise<TOutput>;

const requireRootDb = (): DbClient => {
  const db = getDbClient();
  if (!db) {
    throw httpError(500, 'CONFIG_MISSING', 'Configuration Supabase manquante.');
  }
  return db;
};

export const runUserTransaction = async <T>(
  db: DbClient,
  actorId: string,
  action: (db: DbClient) => Promise<T>
): Promise<T> =>
  await db.transaction(async (tx) => {
    await tx.execute(sql`select private.set_audit_actor(${actorId}::uuid)`);
    await tx.execute(sql.raw('set local role authenticated'));
    await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify({
      sub: actorId,
      role: 'authenticated'
    })}, true)`);
    return await action(tx as unknown as DbClient);
  });

export const runPrivilegedTransaction = async <T>(
  db: DbClient,
  actorId: string,
  action: (db: DbClient) => Promise<T>
): Promise<T> =>
  await db.transaction(async (tx) => {
    await tx.execute(sql`select private.set_audit_actor(${actorId}::uuid)`);
    return await action(tx as unknown as DbClient);
  });

const createDbAccess = (authContext: AuthContext): AuthenticatedDbAccess => ({
  withUserTransaction: <T>(action: (db: DbClient) => Promise<T>) =>
    runUserTransaction(requireRootDb(), authContext.userId, action),
  withPrivilegedTransaction: <T>(action: (db: DbClient) => Promise<T>) =>
    runPrivilegedTransaction(requireRootDb(), authContext.userId, action)
});

const requireAuthContext = (ctx: AuthedProcedureContext): AuthContext => {
  if (!ctx.authContext) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
  return ctx.authContext;
};

export const withAuthedHandler = <TInput, TOutput>(handler: AuthedHandler<TInput, TOutput>) => {
  return async ({ ctx, input }: { ctx: AuthedProcedureContext; input: TInput }): Promise<TOutput> => {
    try {
      const authContext = requireAuthContext(ctx);
      return await runUserTransaction(requireRootDb(), authContext.userId, (db) =>
        handler(db, authContext, ctx.requestId, input));
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};

export const withAuthedPrivilegedHandler = <TInput, TOutput>(handler: AuthedHandler<TInput, TOutput>) => {
  return async ({ ctx, input }: { ctx: AuthedProcedureContext; input: TInput }): Promise<TOutput> => {
    try {
      const authContext = requireAuthContext(ctx);
      return await runPrivilegedTransaction(requireRootDb(), authContext.userId, (db) =>
        handler(db, authContext, ctx.requestId, input));
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};

export const withAuthedNoDbHandler = <TInput, TOutput>(handler: AuthedNoDbHandler<TInput, TOutput>) => {
  return async ({ ctx, input }: { ctx: AuthedProcedureContext; input: TInput }): Promise<TOutput> => {
    try {
      const authContext = requireAuthContext(ctx);
      return await handler(authContext, ctx.requestId, input);
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};

export const withAuthedPhasedHandler = <TInput, TOutput>(handler: AuthedPhasedHandler<TInput, TOutput>) => {
  return async ({ ctx, input }: { ctx: AuthedProcedureContext; input: TInput }): Promise<TOutput> => {
    try {
      const authContext = requireAuthContext(ctx);
      return await handler(createDbAccess(authContext), authContext, ctx.requestId, input);
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};

export const withSuperAdminHandler = <TInput, TOutput>(handler: SuperAdminHandler<TInput, TOutput>) => {
  return async ({ ctx, input }: { ctx: SuperAdminProcedureContext; input: TInput }): Promise<TOutput> => {
    try {
      if (!ctx.authContext || !ctx.callerId) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
      }
      return await runPrivilegedTransaction(requireRootDb(), ctx.callerId, (db) =>
        handler(db, ctx.callerId as string, ctx.requestId, input));
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};

export const withSuperAdminPhasedHandler = <TInput, TOutput>(
  handler: SuperAdminPhasedHandler<TInput, TOutput>
) => {
  return async ({ ctx, input }: { ctx: SuperAdminProcedureContext; input: TInput }): Promise<TOutput> => {
    try {
      if (!ctx.authContext || !ctx.callerId) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
      }
      return await handler(createDbAccess(ctx.authContext), ctx.callerId, ctx.requestId, input);
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};
