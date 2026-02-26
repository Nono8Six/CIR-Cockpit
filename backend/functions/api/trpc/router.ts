import {
  adminAgenciesResponseSchema,
  adminUsersResponseSchema,
  dataConfigResponseSchema,
  dataEntitiesResponseSchema,
  dataEntityContactsResponseSchema,
  dataInteractionsResponseSchema,
  dataProfileResponseSchema
} from '../../../../shared/schemas/api-responses.ts';
import { adminAgenciesPayloadSchema } from '../../../../shared/schemas/agency.schema.ts';
import {
  dataConfigPayloadSchema,
  dataEntitiesPayloadSchema,
  dataEntityContactsPayloadSchema,
  dataInteractionsPayloadSchema,
  dataProfilePayloadSchema,
  type DataEntitiesPayload
} from '../../../../shared/schemas/data.schema.ts';
import { adminUsersPayloadSchema } from '../../../../shared/schemas/user.schema.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { handleAdminAgenciesAction } from '../services/adminAgencies.ts';
import { handleAdminUsersAction } from '../services/adminUsers.ts';
import { handleDataConfigAction } from '../services/dataConfig.ts';
import { handleDataEntitiesAction } from '../services/dataEntities.ts';
import { handleDataEntityContactsAction } from '../services/dataEntityContacts.ts';
import { handleDataInteractionsAction } from '../services/dataInteractions.ts';
import { handleDataProfileAction } from '../services/dataProfile.ts';
import type { DbClient } from '../types.ts';
import { authedProcedure, handleProcedureError, router, superAdminProcedure } from './procedures.ts';

const isReassignAction = (payload: Pick<DataEntitiesPayload, 'action'>): boolean => payload.action === 'reassign';

export const selectDataEntitiesDb = (
  payload: Pick<DataEntitiesPayload, 'action'>,
  db: DbClient,
  userDb: DbClient
): DbClient => (isReassignAction(payload) ? db : userDb);

export const appRouter = router({
  data: router({
    entities: authedProcedure
      .input(dataEntitiesPayloadSchema)
      .output(dataEntitiesResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.authContext || !ctx.db || !ctx.userDb) {
            throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
          }

          const actionDb = selectDataEntitiesDb(input, ctx.db, ctx.userDb);
          return await handleDataEntitiesAction(actionDb, ctx.authContext, ctx.requestId, input);
        } catch (error) {
          return handleProcedureError(error);
        }
      }),
    'entity-contacts': authedProcedure
      .input(dataEntityContactsPayloadSchema)
      .output(dataEntityContactsResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.authContext || !ctx.userDb) {
            throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
          }

          return await handleDataEntityContactsAction(ctx.userDb, ctx.authContext, ctx.requestId, input);
        } catch (error) {
          return handleProcedureError(error);
        }
      }),
    interactions: authedProcedure
      .input(dataInteractionsPayloadSchema)
      .output(dataInteractionsResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.authContext || !ctx.userDb) {
            throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
          }

          return await handleDataInteractionsAction(ctx.userDb, ctx.authContext, ctx.requestId, input);
        } catch (error) {
          return handleProcedureError(error);
        }
      }),
    config: authedProcedure
      .input(dataConfigPayloadSchema)
      .output(dataConfigResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.authContext || !ctx.userDb) {
            throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
          }

          return await handleDataConfigAction(
            ctx.userDb,
            ctx.authContext,
            ctx.requestId,
            input.agency_id,
            input
          );
        } catch (error) {
          return handleProcedureError(error);
        }
      }),
    profile: authedProcedure
      .input(dataProfilePayloadSchema)
      .output(dataProfileResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.authContext || !ctx.userDb) {
            throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
          }

          return await handleDataProfileAction(ctx.userDb, ctx.authContext, ctx.requestId, input);
        } catch (error) {
          return handleProcedureError(error);
        }
      })
  }),
  admin: router({
    users: superAdminProcedure
      .input(adminUsersPayloadSchema)
      .output(adminUsersResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.db || !ctx.callerId) {
            throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
          }

          return await handleAdminUsersAction(ctx.db, ctx.callerId, ctx.requestId, input);
        } catch (error) {
          return handleProcedureError(error);
        }
      }),
    agencies: superAdminProcedure
      .input(adminAgenciesPayloadSchema)
      .output(adminAgenciesResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.db || !ctx.callerId) {
            throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
          }

          return await handleAdminAgenciesAction(ctx.db, ctx.callerId, ctx.requestId, input);
        } catch (error) {
          return handleProcedureError(error);
        }
      })
  })
});

export type AppRouter = typeof appRouter;
