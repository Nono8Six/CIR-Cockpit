import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import type { TrpcContext } from './context.ts';
import { handleProcedureError } from './procedures.ts';

type AuthedProcedureContext = TrpcContext & {
  authContext?: AuthContext;
  db?: DbClient;
  userDb?: DbClient;
};

type SuperAdminProcedureContext = TrpcContext & {
  db?: DbClient;
  callerId?: string;
};

type AuthedHandler<TInput, TOutput> = (
  db: DbClient,
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

type DbSelector<TInput> = (input: TInput, db: DbClient, userDb: DbClient) => DbClient;

export const withAuthedHandler = <TInput, TOutput>(handler: AuthedHandler<TInput, TOutput>) => {
  return async (
    { ctx, input }: { ctx: AuthedProcedureContext; input: TInput }
  ): Promise<TOutput> => {
    try {
      if (!ctx.authContext || !ctx.userDb) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
      }

      return await handler(ctx.userDb, ctx.authContext, ctx.requestId, input);
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};

export const withAuthedDualDbHandler = <TInput, TOutput>(
  handler: AuthedHandler<TInput, TOutput>,
  selectDb: DbSelector<TInput>
) => {
  return async (
    { ctx, input }: { ctx: AuthedProcedureContext; input: TInput }
  ): Promise<TOutput> => {
    try {
      if (!ctx.authContext || !ctx.db || !ctx.userDb) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
      }

      const actionDb = selectDb(input, ctx.db, ctx.userDb);
      return await handler(actionDb, ctx.authContext, ctx.requestId, input);
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};

export const withSuperAdminHandler = <TInput, TOutput>(handler: SuperAdminHandler<TInput, TOutput>) => {
  return async (
    { ctx, input }: { ctx: SuperAdminProcedureContext; input: TInput }
  ): Promise<TOutput> => {
    try {
      if (!ctx.db || !ctx.callerId) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
      }

      return await handler(ctx.db, ctx.callerId, ctx.requestId, input);
    } catch (error) {
      return handleProcedureError(error);
    }
  };
};
