import type { DataEntitiesPayload } from "../../../../shared/schemas/system/data.schema.ts";
import type { DbClient } from "../types.ts";

const isServiceRoleDataEntitiesAction = (
  payload: Pick<DataEntitiesPayload, "action">,
): boolean => payload.action === "reassign" || payload.action === "delete";

export const selectDataEntitiesDb = (
  payload: Pick<DataEntitiesPayload, "action">,
  db: DbClient,
  userDb: DbClient,
): DbClient => (isServiceRoleDataEntitiesAction(payload) ? db : userDb);
