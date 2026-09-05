import type { DataEntitiesPayload } from "../../../shared/schemas/system/data.schema.ts";
import type { AuthContext } from "../types.ts";
import { httpError } from "../middleware/errorHandler.ts";

export type DataEntitiesAccessMode = "user" | "privileged";

const isPrivilegedDataEntitiesAction = (
  payload: Pick<DataEntitiesPayload, "action">,
): boolean => payload.action === "reassign" || payload.action === "delete";

export const selectDataEntitiesAccessMode = (
  payload: Pick<DataEntitiesPayload, "action">,
  authContext: AuthContext,
): DataEntitiesAccessMode => {
  if (!isPrivilegedDataEntitiesAction(payload)) {
    return "user";
  }
  if (!authContext.isSuperAdmin) {
    throw httpError(403, "AUTH_FORBIDDEN", "Acces interdit.");
  }
  return "privileged";
};
