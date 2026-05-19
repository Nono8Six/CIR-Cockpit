import { and, asc, isNotNull, sql } from "drizzle-orm";

import { entities } from "../../../../../drizzle/schema.ts";
import type {
  DirectoryCitySuggestionsInput,
  DirectorySuggestionOption,
} from '../../../../../../shared/schemas/system/directory.schema.ts';
import type { DirectoryCitySuggestionsResponse } from '../../../../../../shared/schemas/system/api-responses.ts';
import type { AuthContext, DbClient } from "../../../types.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import { ensureDataRateLimit } from '../../data/dataAccess.ts';
import {
  buildBaseWhereClause,
  escapeLikePattern,
  normalizedCitySql,
} from '../core/directoryShared.ts';

export const getDirectoryCitySuggestions = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCitySuggestionsInput,
): Promise<DirectoryCitySuggestionsResponse> => {
  await ensureDataRateLimit("directory:city-suggestions", authContext.userId);

  const normalizedQuery = input.q.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return {
      request_id: requestId,
      ok: true,
      cities: [],
    };
  }

  const baseWhereClause = buildBaseWhereClause(authContext, input);
  const prefixPattern = `${escapeLikePattern(normalizedQuery)}%`;
  const containsPattern = `%${escapeLikePattern(normalizedQuery)}%`;

  try {
    const rows = await db
      .select({
        city: entities.city,
        rank: sql<
          number
        >`case when lower(${entities.city}) like ${prefixPattern} then 0 else 1 end`,
      })
      .from(entities)
      .where(
        and(
          baseWhereClause,
          isNotNull(entities.city),
          sql<boolean>`lower(${entities.city}) like ${containsPattern}`,
        ),
      )
      .groupBy(entities.city)
      .orderBy(
        asc(
          sql`case when lower(${entities.city}) like ${prefixPattern} then 0 else 1 end`,
        ),
        asc(normalizedCitySql),
      )
      .limit(12);

    return {
      request_id: requestId,
      ok: true,
      cities: rows
        .map((row: { city: string | null; rank: number }) => row.city?.trim() ?? "")
        .filter((value: string) => value.length > 0)
        .map((value: string): DirectorySuggestionOption => ({
          value,
          label: value,
        })),
    };
  } catch (error) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de proposer des villes.",
      error instanceof Error ? error.message : undefined,
    );
  }
};
