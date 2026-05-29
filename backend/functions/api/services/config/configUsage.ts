import { asc, eq, sql } from 'drizzle-orm';

import {
  agency_families,
  agency_interaction_types,
  agency_services,
  agency_statuses,
  interactions
} from '../../../../drizzle/schema.ts';
import type { ConfigUsageResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import type {
  ConfigUsageDimension,
  ConfigUsageInput,
  ConfigUsageRow,
  ConfigUsageSnapshot
} from '../../../../../shared/schemas/system/config.schema.ts';
import { configStatusCategorySchema } from '../../../../../shared/schemas/system/config.schema.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from '../data/dataAccess.ts';

type ReferenceRow = {
  id: string | null;
  label: string;
  sort_order: number | null;
  category: ConfigUsageRow['category'];
  is_active: boolean;
};

type UsageCountRow = {
  label: string | null;
  usage_count: number;
};

type UsageByIdRow = {
  reference_id: string | null;
  label: string | null;
  usage_count: number;
};

const EMPTY_DIMENSIONS: Record<ConfigUsageDimension, ConfigUsageRow[]> = {
  statuses: [],
  services: [],
  families: [],
  interaction_types: []
};

const normalizeKey = (value: string): string => value.trim().toLowerCase();

const cleanUsageLabel = (value: string | null): string => {
  const label = (value ?? '').trim();
  return label.length > 0 ? label : '<sans valeur>';
};

const parseStatusCategory = (value: string): ConfigUsageRow['category'] => {
  const parsed = configStatusCategorySchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  throw httpError(500, 'DB_READ_FAILED', "Impossible de charger l'impact des statuts.");
};

const mergeLabelUsage = (
  references: ReferenceRow[],
  usageRows: UsageCountRow[]
): ConfigUsageRow[] => {
  const usageByLabel = new Map(
    usageRows.map((row) => [normalizeKey(cleanUsageLabel(row.label)), row.usage_count])
  );
  const referenceKeys = new Set(references.map((row) => normalizeKey(row.label)));
  const referenceRows = references.map((row) => {
    const usageCount = usageByLabel.get(normalizeKey(row.label)) ?? 0;
    return {
      label: row.label,
      reference_id: row.id,
      sort_order: row.sort_order,
      category: row.category,
      is_active: row.is_active,
      usage_count: usageCount,
      state: usageCount > 0 ? 'reference_used' : 'reference_unused'
    } satisfies ConfigUsageRow;
  });
  const orphanRows = usageRows
    .map((row) => ({
      label: cleanUsageLabel(row.label),
      usage_count: row.usage_count
    }))
    .filter((row) => !referenceKeys.has(normalizeKey(row.label)))
    .map((row) => ({
      label: row.label,
      reference_id: null,
      sort_order: null,
      category: null,
      is_active: true,
      usage_count: row.usage_count,
      state: 'used_not_in_reference'
    }) satisfies ConfigUsageRow);

  return [...referenceRows, ...orphanRows];
};

const mergeStatusUsage = (
  references: ReferenceRow[],
  usageRows: UsageByIdRow[]
): ConfigUsageRow[] => {
  const usageById = new Map<string, number>();
  usageRows
    .filter((row): row is UsageByIdRow & { reference_id: string } => row.reference_id !== null)
    .forEach((row) => {
      usageById.set(row.reference_id, (usageById.get(row.reference_id) ?? 0) + row.usage_count);
    });
  const referenceIds = new Set(references.map((row) => row.id).filter((id): id is string => id !== null));
  const referenceRows = references.map((row) => {
    const usageCount = row.id ? usageById.get(row.id) ?? 0 : 0;
    return {
      label: row.label,
      reference_id: row.id,
      sort_order: row.sort_order,
      category: row.category,
      is_active: row.is_active,
      usage_count: usageCount,
      state: row.is_active
        ? usageCount > 0 ? 'reference_used' : 'reference_unused'
        : 'historical_used'
    } satisfies ConfigUsageRow;
  }).filter((row) => row.is_active || row.usage_count > 0);
  const orphanRows = usageRows
    .filter((row) => !row.reference_id || !referenceIds.has(row.reference_id))
    .map((row) => ({
      label: cleanUsageLabel(row.label),
      reference_id: null,
      sort_order: null,
      category: null,
      is_active: true,
      usage_count: row.usage_count,
      state: 'used_not_in_reference'
    }) satisfies ConfigUsageRow);

  return [...referenceRows, ...orphanRows];
};

const computeTotals = (
  dimensions: Record<ConfigUsageDimension, ConfigUsageRow[]>
): ConfigUsageSnapshot['totals'] => {
  const rows = Object.values(dimensions).flat();
  return {
    used_not_in_reference: rows.filter((row) => row.state === 'used_not_in_reference').length,
    referenced_values: rows.filter((row) => row.reference_id !== null).length,
    used_values: rows.filter((row) => row.usage_count > 0).length
  };
};

const loadLabelReferences = async (
  db: DbClient,
  agencyId: string
): Promise<{
  services: ReferenceRow[];
  families: ReferenceRow[];
  interaction_types: ReferenceRow[];
}> => {
  const [services, families, interactionTypes] = await Promise.all([
    db
      .select({
        id: agency_services.id,
        label: agency_services.label,
        sort_order: agency_services.sort_order,
        category: sql<null>`null`,
        is_active: sql<boolean>`true`
      })
      .from(agency_services)
      .where(eq(agency_services.agency_id, agencyId))
      .orderBy(asc(agency_services.sort_order)),
    db
      .select({
        id: agency_families.id,
        label: agency_families.label,
        sort_order: agency_families.sort_order,
        category: sql<null>`null`,
        is_active: sql<boolean>`true`
      })
      .from(agency_families)
      .where(eq(agency_families.agency_id, agencyId))
      .orderBy(asc(agency_families.sort_order)),
    db
      .select({
        id: agency_interaction_types.id,
        label: agency_interaction_types.label,
        sort_order: agency_interaction_types.sort_order,
        category: sql<null>`null`,
        is_active: sql<boolean>`true`
      })
      .from(agency_interaction_types)
      .where(eq(agency_interaction_types.agency_id, agencyId))
      .orderBy(asc(agency_interaction_types.sort_order))
  ]);

  return { services, families, interaction_types: interactionTypes };
};

const loadUsageCounts = async (
  db: DbClient,
  agencyId: string
): Promise<{
  statuses: UsageByIdRow[];
  services: UsageCountRow[];
  families: UsageCountRow[];
  interaction_types: UsageCountRow[];
}> => {
  const [statuses, services, interactionTypes] = await Promise.all([
    db
      .select({
        reference_id: interactions.status_id,
        label: sql<string | null>`case when ${interactions.status_id} is null then '<sans statut ref>' else ${interactions.status} end`,
        usage_count: sql<number>`count(*)::int`
      })
      .from(interactions)
      .where(eq(interactions.agency_id, agencyId))
      .groupBy(interactions.status_id, interactions.status),
    db
      .select({ label: interactions.contact_service, usage_count: sql<number>`count(*)::int` })
      .from(interactions)
      .where(eq(interactions.agency_id, agencyId))
      .groupBy(interactions.contact_service),
    db
      .select({ label: interactions.interaction_type, usage_count: sql<number>`count(*)::int` })
      .from(interactions)
      .where(eq(interactions.agency_id, agencyId))
      .groupBy(interactions.interaction_type)
  ]);

  const familyRows = await db.execute<UsageCountRow>(sql`
    select family::text as label, count(*)::int as usage_count
    from public.interactions, unnest(mega_families) as family
    where agency_id = ${agencyId}
    group by family
  `);

  return { statuses, services, families: familyRows, interaction_types: interactionTypes };
};

export const getConfigUsage = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: ConfigUsageInput
): Promise<ConfigUsageResponse> => {
  await ensureDataRateLimit('config:usage', authContext.userId);
  const agencyId = ensureAgencyAccess(authContext, input.agency_id);

  try {
    const [references, usage] = await Promise.all([
      loadLabelReferences(db, agencyId),
      loadUsageCounts(db, agencyId)
    ]);
    const statusReferences = await db
      .select({
        id: agency_statuses.id,
        label: agency_statuses.label,
        sort_order: agency_statuses.sort_order,
        category: agency_statuses.category,
        is_active: agency_statuses.is_active
      })
      .from(agency_statuses)
      .where(eq(agency_statuses.agency_id, agencyId))
      .orderBy(asc(agency_statuses.sort_order));
    const statusReferenceRows: ReferenceRow[] = statusReferences.map((row) => ({
      ...row,
      category: parseStatusCategory(row.category)
    }));
    const dimensions = {
      ...EMPTY_DIMENSIONS,
      statuses: mergeStatusUsage(statusReferenceRows, usage.statuses),
      services: mergeLabelUsage(references.services, usage.services),
      families: mergeLabelUsage(references.families, usage.families),
      interaction_types: mergeLabelUsage(references.interaction_types, usage.interaction_types)
    };

    return {
      request_id: requestId,
      ok: true,
      usage: {
        agency_id: agencyId,
        dimensions,
        totals: computeTotals(dimensions)
      }
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'DB_READ_FAILED') {
      throw error;
    }
    throw httpError(500, 'DB_READ_FAILED', "Impossible de charger l'impact des parametres.");
  }
};
