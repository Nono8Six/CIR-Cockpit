import type { DataEntitiesRouteResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import type { DataEntitiesPayload } from '../../../../../shared/schemas/system/data.schema.ts';
import type { AuthContext, DbClient } from '../../../types.ts';
import { httpError } from '../../../middleware/errorHandler.ts';
import {
  ensureAgencyAccess,
  ensureDataRateLimit,
  getEntityAccessInfo,
  ensureOptionalAgencyAccess,
  getEntityAgencyId
} from '../../data/dataAccess.ts';
import { getEntitySearchIndex, listEntities } from './dataEntitiesList.ts';
import { loadTierOrganizationsByIds, toTierContactReads } from './tierReadModel.ts';
import { archiveEntity, convertToClient } from '../actions/dataEntitiesMutations.ts';
import {
  deleteEntity,
  ensureDeleteSuperAdmin
} from '../actions/dataEntitiesDelete.ts';
import { reassignEntity, ensureReassignSuperAdmin } from '../actions/dataEntitiesReassign.ts';
import { saveEntity } from '../actions/dataEntitiesSave.ts';

export {
  getEntitySearchIndex,
  listEntities
} from './dataEntitiesList.ts';
export {
  ensureDeleteSuperAdmin,
  deleteEntity
} from '../actions/dataEntitiesDelete.ts';
export {
  ensureReassignSuperAdmin,
  reassignEntity
} from '../actions/dataEntitiesReassign.ts';
export {
  archiveEntity,
  convertToClient
} from '../actions/dataEntitiesMutations.ts';
export { saveEntity } from '../actions/dataEntitiesSave.ts';

export const ensureSupplierWriteAccess = (authContext: AuthContext): void => {
  if (authContext.role === 'super_admin' || authContext.role === 'agency_admin') {
    return;
  }

  throw httpError(403, 'AUTH_FORBIDDEN', 'Creation fournisseur reservee aux administrateurs.');
};

const ENTITY_ACTION_RATE_LIMIT_MAX = 60;
const ENTITY_READ_RATE_LIMIT_MAX = 120;

const withTransaction = async <T>(
  db: DbClient,
  action: (db: DbClient) => Promise<T>
): Promise<T> =>
  await db.transaction(async (tx) => {
    return await action(tx as unknown as DbClient);
  });

export const handleDataEntitiesAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataEntitiesPayload
): Promise<DataEntitiesRouteResponse> => {
  await ensureDataRateLimit(`data_entities:${data.action}`, authContext.userId, {
    max: data.action === 'list' || data.action === 'search_index'
      ? ENTITY_READ_RATE_LIMIT_MAX
      : ENTITY_ACTION_RATE_LIMIT_MAX
  });

  switch (data.action) {
    case 'list': {
      const rows = await listEntities(db, authContext, data);
      const tiers = await loadTierOrganizationsByIds(db, rows.map((row) => row.id));
      return { request_id: requestId, ok: true, entities: rows, tiers };
    }
    case 'search_index': {
      const index = await getEntitySearchIndex(db, authContext, data);
      const tiers = await loadTierOrganizationsByIds(db, index.entities.map((row) => row.id));
      return {
        request_id: requestId,
        ok: true,
        ...index,
        tiers,
        tier_contacts: toTierContactReads(index.contacts)
      };
    }
    case 'save': {
      if (data.entity_type === 'Fournisseur') {
        ensureSupplierWriteAccess(authContext);
        const entity = await withTransaction(db, (tx) =>
          saveEntity(tx, data, null, authContext.userId)
        );
        return { request_id: requestId, ok: true, entity };
      }
      const agencyId = ensureAgencyAccess(authContext, data.agency_id);
      const entity = await withTransaction(db, (tx) =>
        saveEntity(tx, data, agencyId, authContext.userId)
      );
      return { request_id: requestId, ok: true, entity };
    }
    case 'archive': {
      const accessInfo = await getEntityAccessInfo(db, data.entity_id);
      if (accessInfo.entityType === 'Fournisseur') {
        ensureSupplierWriteAccess(authContext);
      } else {
        ensureOptionalAgencyAccess(authContext, accessInfo.agencyId);
      }
      const entity = await withTransaction(db, (tx) =>
        archiveEntity(tx, data.entity_id, data.archived)
      );
      return { request_id: requestId, ok: true, entity };
    }
    case 'delete': {
      ensureDeleteSuperAdmin(authContext);
      const { entity, deletedInteractionsCount } = await withTransaction(db, (tx) =>
        deleteEntity(tx, data)
      );
      return {
        request_id: requestId,
        ok: true,
        entity,
        deleted_interactions_count: deletedInteractionsCount
      };
    }
    case 'convert_to_client': {
      const agencyId = await getEntityAgencyId(db, data.entity_id);
      ensureOptionalAgencyAccess(authContext, agencyId);
      const entity = await withTransaction(db, (tx) =>
        convertToClient(
          tx,
          data.entity_id,
          data.convert.client_number,
          data.convert.account_type
        )
      );
      return { request_id: requestId, ok: true, entity };
    }
    case 'reassign': {
      ensureReassignSuperAdmin(authContext);
      const { entity, propagatedInteractionsCount } = await withTransaction(db, (tx) =>
        reassignEntity(tx, data)
      );
      return {
        request_id: requestId,
        ok: true,
        entity,
        propagated_interactions_count: propagatedInteractionsCount
      };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
