import type { DirectoryDuplicatesInput } from "../../../../shared/schemas/directory.schema.ts";
import type { DirectoryDuplicatesResponse } from "../../../../shared/schemas/api-responses.ts";
import type { AuthContext, DbClient } from "../types.ts";
import { ensureDataRateLimit } from "./dataAccess.ts";
import { buildBaseWhereClause } from "./directoryShared.ts";
import { getCompanyDuplicateMatches } from "./directoryDuplicatesCompany.ts";
import { getIndividualDuplicateMatches } from "./directoryDuplicatesIndividual.ts";

export { buildCompanyDuplicateReason } from "./directoryDuplicatesCompany.ts";
export { rankIndividualDuplicate } from "./directoryDuplicatesIndividual.ts";
export type { DirectoryDuplicateLookupRow } from "./directoryDuplicateRows.ts";

export const getDirectoryDuplicates = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryDuplicatesInput,
): Promise<DirectoryDuplicatesResponse> => {
  await ensureDataRateLimit(
    `directory:duplicates:${input.kind}`,
    authContext.userId,
  );

  const baseWhereClause = buildBaseWhereClause(authContext, {
    type: "all",
    scope: input.scope,
    includeArchived: input.includeArchived,
  });

  const matches = input.kind === "company"
    ? await getCompanyDuplicateMatches(db, baseWhereClause, input)
    : await getIndividualDuplicateMatches(db, baseWhereClause, input);

  return {
    request_id: requestId,
    ok: true,
    matches,
  };
};
