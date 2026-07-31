import { TRPCError, initTRPC } from '@trpc/server';
import { ZodError } from 'zod/v4';

import type { ErrorCode } from '../../../../shared/errors/types.ts';
import { getErrorCatalogEntry } from '../../../../shared/errors/catalog.ts';
import {
  publicErrorDetails,
  publicTrpcErrorDataSchema,
  type PublicTrpcErrorData
} from '../../../../shared/schemas/system/edge-error.schema.ts';
import { authenticateAccessToken, authenticateSuperAdminAccessToken, getAccessTokenFromHeaders } from '../middleware/auth/auth.ts';
import { httpError, type HttpError } from '../middleware/errorHandler.ts';
import type { TrpcContext } from './context.ts';

type PublicTrpcShapeData = Record<string, unknown>;

const toPublicShapeData = (data: PublicTrpcShapeData): PublicTrpcShapeData => {
  const publicData: PublicTrpcShapeData = {};

  for (const key of ['code', 'path'] as const) {
    if (data[key] !== undefined) publicData[key] = data[key];
  }

  return publicData;
};

const formatIssuePath = (path: PropertyKey[]): string =>
  path.length === 0 ? 'payload' : path.map(String).join('.');

const formatZodDetailsFr = (
  issues: Array<{ code: string; path: PropertyKey[]; message: string; keys?: string[] }>
): string =>
  issues
    .map((issue) => {
      const location = formatIssuePath(issue.path);
      if (issue.code === 'unrecognized_keys' && Array.isArray(issue.keys) && issue.keys.length > 0) {
        return `${location}: champs non autorises (${issue.keys.join(', ')}).`;
      }
      return `${location}: ${issue.message}`;
    })
    .join(' | ');

const toHttpError = (error: unknown): HttpError => {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof ZodError) {
    return httpError(400, 'INVALID_PAYLOAD', 'Payload invalide.', formatZodDetailsFr(error.issues));
  }

  if (error instanceof Error) {
    const maybeHttpError = error as HttpError;
    if (typeof maybeHttpError.status === 'number' && typeof maybeHttpError.code === 'string') {
      return maybeHttpError;
    }
    return httpError(500, 'REQUEST_FAILED', maybeHttpError.message || 'La requete a echoue.');
  }

  return httpError(500, 'REQUEST_FAILED', 'La requete a echoue.');
};

const toTrpcCode = (status: number): TRPCError['code'] => {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  return 'INTERNAL_SERVER_ERROR';
};

const toStatusFromTrpcCode = (code: TRPCError['code']): number => {
  if (code === 'BAD_REQUEST') return 400;
  if (code === 'UNAUTHORIZED') return 401;
  if (code === 'FORBIDDEN') return 403;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'CONFLICT') return 409;
  if (code === 'TOO_MANY_REQUESTS') return 429;
  if (code === 'PAYLOAD_TOO_LARGE') return 413;
  return 500;
};

const toAppCodeFromTrpcCode = (code: TRPCError['code']): ErrorCode => {
  if (code === 'BAD_REQUEST') return 'INVALID_PAYLOAD';
  if (code === 'UNAUTHORIZED') return 'AUTH_REQUIRED';
  if (code === 'FORBIDDEN') return 'AUTH_FORBIDDEN';
  if (code === 'NOT_FOUND') return 'NOT_FOUND';
  if (code === 'CONFLICT') return 'CONFLICT';
  if (code === 'TOO_MANY_REQUESTS') return 'RATE_LIMITED';
  if (code === 'PAYLOAD_TOO_LARGE') return 'PAYLOAD_TOO_LARGE';
  return 'REQUEST_FAILED';
};

const toFormattedErrorData = (
  error: TRPCError,
  requestId: string | undefined,
  path: string | undefined
): PublicTrpcErrorData => {
  const zodCause = error.cause instanceof ZodError ? error.cause : undefined;
  const validationCause = zodCause && error.code === 'BAD_REQUEST'
    ? httpError(
      400,
      'INVALID_PAYLOAD',
      'Payload invalide.',
      formatZodDetailsFr(zodCause.issues)
    )
    : zodCause && error.code === 'INTERNAL_SERVER_ERROR'
      && path?.startsWith('configurator.motor.')
    ? httpError(
      500,
      'CONFIGURATOR_OUTPUT_INVALID',
      'Resultat technique invalide.'
    )
    : undefined;
  const cause = validationCause ?? error.cause as HttpError | undefined;
  const status = typeof cause?.status === 'number'
    ? cause.status
    : toStatusFromTrpcCode(error.code);
  const appCode = typeof cause?.code === 'string'
    ? cause.code
    : toAppCodeFromTrpcCode(error.code);

  const catalogEntry = getErrorCatalogEntry(appCode);
  const candidate = {
    appCode,
    details: publicErrorDetails(appCode, cause?.details),
    httpStatus: status,
    requestId: requestId ?? crypto.randomUUID(),
    retryable: catalogEntry?.retryable ?? false,
    recoveryAction: catalogEntry?.recoveryAction ?? 'none',
    retryAfterMs: cause?.retryAfterMs
  };
  const parsed = publicTrpcErrorDataSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  return {
    appCode: 'REQUEST_FAILED',
    httpStatus: 500,
    requestId: requestId ?? crypto.randomUUID(),
    retryable: false,
    recoveryAction: 'none'
  };
};

export const formatPublicTrpcErrorData = (
  error: TRPCError,
  requestId: string | undefined,
  path: string | undefined
): PublicTrpcErrorData => toFormattedErrorData(error, requestId, path);

const t = initTRPC.context<TrpcContext>().create({
  errorFormatter({ error, shape, ctx, path }) {
    const publicData = toFormattedErrorData(error, ctx?.requestId, path);
    const publicMessage = getErrorCatalogEntry(publicData.appCode)?.message
      ?? 'La requete a echoue.';
    return {
      ...shape,
      message: publicMessage,
      data: {
        ...toPublicShapeData(shape.data),
        ...publicData
      }
    };
  }
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  try {
    const token = getAccessTokenFromHeaders(ctx.req.headers.get('Authorization'));
    const authenticatedContext = await authenticateAccessToken(token);

    return next({
      ctx: {
        ...ctx,
        callerId: authenticatedContext.callerId,
        authContext: authenticatedContext.authContext,
        db: authenticatedContext.db,
        userDb: authenticatedContext.userDb
      }
    });
  } catch (error) {
    const normalizedError = toHttpError(error);
    throw new TRPCError({
      code: toTrpcCode(normalizedError.status ?? 500),
      message: normalizedError.message,
      cause: normalizedError
    });
  }
});

export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  try {
    const token = getAccessTokenFromHeaders(ctx.req.headers.get('Authorization'));
    const authenticatedContext = await authenticateSuperAdminAccessToken(token);

    return next({
      ctx: {
        ...ctx,
        callerId: authenticatedContext.callerId,
        authContext: authenticatedContext.authContext,
        db: authenticatedContext.db
      }
    });
  } catch (error) {
    const normalizedError = toHttpError(error);
    throw new TRPCError({
      code: toTrpcCode(normalizedError.status ?? 500),
      message: normalizedError.message,
      cause: normalizedError
    });
  }
});

export const handleProcedureError = (error: unknown): never => {
  const normalizedError = toHttpError(error);
  throw new TRPCError({
    code: toTrpcCode(normalizedError.status ?? 500),
    message: normalizedError.message,
    cause: normalizedError
  });
};
