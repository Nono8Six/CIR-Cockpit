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
import { handleAdminAgenciesAction } from '../services/adminAgencies.ts';
import { handleAdminUsersAction } from '../services/adminUsers.ts';
import { handleDataConfigAction } from '../services/dataConfig.ts';
import { handleDataEntitiesAction } from '../services/dataEntities.ts';
import { handleDataEntityContactsAction } from '../services/dataEntityContacts.ts';
import { handleDataInteractionsAction } from '../services/dataInteractions.ts';
import { handleDataProfileAction } from '../services/dataProfile.ts';
import type { DbClient } from '../types.ts';
import { authedProcedure, router, superAdminProcedure } from './procedures.ts';
import { withAuthedDualDbHandler, withAuthedHandler, withSuperAdminHandler } from './procedureHelpers.ts';

const isServiceRoleDataEntitiesAction = (
  payload: Pick<DataEntitiesPayload, 'action'>
): boolean => payload.action === 'reassign' || payload.action === 'delete';

export const selectDataEntitiesDb = (
  payload: Pick<DataEntitiesPayload, 'action'>,
  db: DbClient,
  userDb: DbClient
): DbClient => (isServiceRoleDataEntitiesAction(payload) ? db : userDb);

export const appRouter = router({
  data: router({
    entities: authedProcedure
      .input(dataEntitiesPayloadSchema)
      .output(dataEntitiesResponseSchema)
      .mutation(withAuthedDualDbHandler(handleDataEntitiesAction, selectDataEntitiesDb)),
    'entity-contacts': authedProcedure
      .input(dataEntityContactsPayloadSchema)
      .output(dataEntityContactsResponseSchema)
      .mutation(withAuthedHandler(handleDataEntityContactsAction)),
    interactions: authedProcedure
      .input(dataInteractionsPayloadSchema)
      .output(dataInteractionsResponseSchema)
      .mutation(withAuthedHandler(handleDataInteractionsAction)),
    config: authedProcedure
      .input(dataConfigPayloadSchema)
      .output(dataConfigResponseSchema)
      .mutation(withAuthedHandler((db, authContext, requestId, input) => {
        return handleDataConfigAction(db, authContext, requestId, input.agency_id, input);
      })),
    profile: authedProcedure
      .input(dataProfilePayloadSchema)
      .output(dataProfileResponseSchema)
      .mutation(withAuthedHandler(handleDataProfileAction))
  }),
  admin: router({
    users: superAdminProcedure
      .input(adminUsersPayloadSchema)
      .output(adminUsersResponseSchema)
      .mutation(withSuperAdminHandler(handleAdminUsersAction)),
    agencies: superAdminProcedure
      .input(adminAgenciesPayloadSchema)
      .output(adminAgenciesResponseSchema)
      .mutation(withSuperAdminHandler(handleAdminAgenciesAction))
  })
});

export type AppRouter = typeof appRouter;
