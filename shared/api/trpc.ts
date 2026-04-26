import { initTRPC, type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';

import { adminAgenciesPayloadSchema } from '../schemas/agency.schema.ts';
import {
  configGetResponseSchema,
  configSaveAgencyResponseSchema,
  configSaveProductResponseSchema,
  adminAgenciesResponseSchema,
  adminAuditLogsResponseSchema,
  adminUsersListResponseSchema,
  adminUsersResponseSchema,
  dataConfigResponseSchema,
  dataEntitiesRouteResponseSchema,
  dataEntityContactsResponseSchema,
  dataInteractionsResponseSchema,
  dataProfileResponseSchema,
  directoryCitySuggestionsResponseSchema,
  directoryCompanyDetailsResponseSchema,
  directoryCompanySearchResponseSchema,
  directoryDuplicatesResponseSchema,
  directoryListResponseSchema,
  directoryOptionsResponseSchema,
  directoryRecordResponseSchema,
  directorySavedViewDeleteResponseSchema,
  directorySavedViewResponseSchema,
  directorySavedViewsListResponseSchema
} from '../schemas/api-responses.ts';
import {
  cockpitAgencyMembersInputSchema,
  cockpitAgencyMembersResponseSchema,
  cockpitPhoneLookupInputSchema,
  cockpitPhoneLookupResponseSchema
} from '../schemas/cockpit.schema.ts';
import {
  configGetInputSchema,
  configSaveAgencyInputSchema,
  configSaveProductInputSchema
} from '../schemas/config.schema.ts';
import {
  dataConfigPayloadSchema,
  dataEntitiesPayloadSchema,
  dataEntityContactsPayloadSchema,
  dataInteractionsPayloadSchema,
  dataProfilePayloadSchema
} from '../schemas/data.schema.ts';
import {
  directoryCitySuggestionsInputSchema,
  directoryCompanyDetailsInputSchema,
  directoryCompanySearchInputSchema,
  directoryDuplicatesInputSchema,
  directoryListInputSchema,
  directoryOptionsInputSchema,
  directoryRouteRefSchema,
  directorySavedViewDeleteInputSchema,
  directorySavedViewSaveInputSchema,
  directorySavedViewSetDefaultInputSchema,
  directorySavedViewsListInputSchema
} from '../schemas/directory.schema.ts';
import {
  adminAuditLogsInputSchema,
  adminUsersListInputSchema,
  adminUsersPayloadSchema
} from '../schemas/user.schema.ts';

const t = initTRPC.create();

const appRouterType = t.router({
  data: t.router({
    entities: t.procedure
      .input(dataEntitiesPayloadSchema)
      .output(dataEntitiesRouteResponseSchema)
      .mutation(() => undefined as never),
    'entity-contacts': t.procedure
      .input(dataEntityContactsPayloadSchema)
      .output(dataEntityContactsResponseSchema)
      .mutation(() => undefined as never),
    interactions: t.procedure
      .input(dataInteractionsPayloadSchema)
      .output(dataInteractionsResponseSchema)
      .mutation(() => undefined as never),
    config: t.procedure
      .input(dataConfigPayloadSchema)
      .output(dataConfigResponseSchema)
      .mutation(() => undefined as never),
    profile: t.procedure
      .input(dataProfilePayloadSchema)
      .output(dataProfileResponseSchema)
      .mutation(() => undefined as never)
  }),
  cockpit: t.router({
    'agency-members': t.procedure
      .input(cockpitAgencyMembersInputSchema)
      .output(cockpitAgencyMembersResponseSchema)
      .query(() => undefined as never),
    'phone-lookup': t.procedure
      .input(cockpitPhoneLookupInputSchema)
      .output(cockpitPhoneLookupResponseSchema)
      .query(() => undefined as never)
  }),
  admin: t.router({
    'users-list': t.procedure
      .input(adminUsersListInputSchema)
      .output(adminUsersListResponseSchema)
      .query(() => undefined as never),
    'audit-logs': t.procedure
      .input(adminAuditLogsInputSchema)
      .output(adminAuditLogsResponseSchema)
      .query(() => undefined as never),
    users: t.procedure
      .input(adminUsersPayloadSchema)
      .output(adminUsersResponseSchema)
      .mutation(() => undefined as never),
    agencies: t.procedure
      .input(adminAgenciesPayloadSchema)
      .output(adminAgenciesResponseSchema)
      .mutation(() => undefined as never)
  }),
  config: t.router({
    get: t.procedure
      .input(configGetInputSchema)
      .output(configGetResponseSchema)
      .query(() => undefined as never),
    'save-agency': t.procedure
      .input(configSaveAgencyInputSchema)
      .output(configSaveAgencyResponseSchema)
      .mutation(() => undefined as never),
    'save-product': t.procedure
      .input(configSaveProductInputSchema)
      .output(configSaveProductResponseSchema)
      .mutation(() => undefined as never)
  }),
  directory: t.router({
    list: t.procedure
      .input(directoryListInputSchema)
      .output(directoryListResponseSchema)
      .query(() => undefined as never),
    options: t.procedure
      .input(directoryOptionsInputSchema)
      .output(directoryOptionsResponseSchema)
      .query(() => undefined as never),
    'city-suggestions': t.procedure
      .input(directoryCitySuggestionsInputSchema)
      .output(directoryCitySuggestionsResponseSchema)
      .query(() => undefined as never),
    'company-search': t.procedure
      .input(directoryCompanySearchInputSchema)
      .output(directoryCompanySearchResponseSchema)
      .query(() => undefined as never),
    'company-details': t.procedure
      .input(directoryCompanyDetailsInputSchema)
      .output(directoryCompanyDetailsResponseSchema)
      .query(() => undefined as never),
    duplicates: t.procedure
      .input(directoryDuplicatesInputSchema)
      .output(directoryDuplicatesResponseSchema)
      .query(() => undefined as never),
    record: t.procedure
      .input(directoryRouteRefSchema)
      .output(directoryRecordResponseSchema)
      .query(() => undefined as never),
    'saved-views': t.router({
      list: t.procedure
        .input(directorySavedViewsListInputSchema)
        .output(directorySavedViewsListResponseSchema)
        .query(() => undefined as never),
      save: t.procedure
        .input(directorySavedViewSaveInputSchema)
        .output(directorySavedViewResponseSchema)
        .mutation(() => undefined as never),
      delete: t.procedure
        .input(directorySavedViewDeleteInputSchema)
        .output(directorySavedViewDeleteResponseSchema)
        .mutation(() => undefined as never),
      'set-default': t.procedure
        .input(directorySavedViewSetDefaultInputSchema)
        .output(directorySavedViewResponseSchema)
        .mutation(() => undefined as never)
    })
  })
});

export type AppRouter = typeof appRouterType;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
