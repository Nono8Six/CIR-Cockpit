import type { DataEntitiesRouteResponse } from '../../../../shared/schemas/api-responses.ts';
import type { DataEntitiesPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  ensureAgencyAccess,
  ensureDataRateLimit,
  ensureOptionalAgencyAccess,
  getEntityAgencyId
} from './dataAccess.ts';
import { getEntitySearchIndex, listEntities } from './dataEntitiesList.ts';
import { archiveEntity, convertToClient } from './dataEntitiesMutations.ts';
import {
  deleteEntity,
  ensureDeleteSuperAdmin
} from './dataEntitiesDelete.ts';
import { reassignEntity, ensureReassignSuperAdmin } from './dataEntitiesReassign.ts';
import { saveEntity } from './dataEntitiesSave.ts';

export {
  getEntitySearchIndex,
  listEntities
} from './dataEntitiesList.ts';
export {
  ensureDeleteSuperAdmin,
  deleteEntity
} from './dataEntitiesDelete.ts';
export {
  ensureReassignSuperAdmin,
  reassignEntity
} from './dataEntitiesReassign.ts';
export {
  archiveEntity,
  convertToClient
} from './dataEntitiesMutations.ts';
export { saveEntity } from './dataEntitiesSave.ts';

export const handleDataEntitiesAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataEntitiesPayload
): Promise<DataEntitiesRouteResponse> => {
  await ensureDataRateLimit(`data_entities:${data.action}`, authContext.userId);

  switch (data.action) {
    case 'list': {
      const rows = await listEntities(db, authContext, data);
      return { request_id: requestId, ok: true, entities: rows };
    }
    case 'search_index': {
      const index = await getEntitySearchIndex(db, authContext, data);
      return { request_id: requestId, ok: true, ...index };
    }
    case 'save': {
      const agencyId = ensureAgencyAccess(authContext, data.agency_id);
      const entity = await saveEntity(db, data, agencyId, authContext.userId);
      return { request_id: requestId, ok: true, entity };
    }
    case 'archive': {
      const agencyId = await getEntityAgencyId(db, data.entity_id);
      ensureOptionalAgencyAccess(authContext, agencyId);
      const entity = await archiveEntity(db, data.entity_id, data.archived);
      return { request_id: requestId, ok: true, entity };
    }
    case 'delete': {
      ensureDeleteSuperAdmin(authContext);
      const { entity, deletedInteractionsCount } = await deleteEntity(db, data);
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
      const entity = await convertToClient(
        db,
        data.entity_id,
        data.convert.client_number,
        data.convert.account_type
      );
      return { request_id: requestId, ok: true, entity };
    }
    case 'reassign': {
      ensureReassignSuperAdmin(authContext);
      const { entity, propagatedInteractionsCount } = await reassignEntity(db, data);
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
