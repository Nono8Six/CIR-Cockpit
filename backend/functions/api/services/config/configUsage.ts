import { asc, eq, sql } from 'drizzle-orm';

import { isSystemReferenceLabel } from '../../../../../shared/reference/systemInteractionValues.ts';
import type { ConfigUsageResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import type {
  ConfigUsageDimension,
  ConfigUsageInput,
  ConfigUsageRow,
  ConfigUsageSnapshot
} from '../../../../../shared/schemas/system/config.schema.ts';
import { configStatusCategorySchema } from '../../../../../shared/schemas/system/config.schema.ts';
import {
  agency_families,
  agency_interaction_types,
  agency_reference_resolutions,
  agency_services,
  agency_statuses,
  interactions
} from '../../../../drizzle/schema.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from '../data/dataAccess.ts';

type ReferenceRow = {
  id: string;
  label: string;
  sort_order: number;
  category: ConfigUsageRow['category'];
  is_active: boolean;
};
type UsageRow = { label: string | null; usage_count: number };
type StatusUsageRow = UsageRow & { reference_id: string | null; entity_type: string };
type ResolutionRow = {
  id: string;
  dimension: ConfigUsageDimension;
  source_label: string;
  target_reference_id: string;
  target_label: string;
};

const key = (value: string): string => value.trim().toLowerCase();
const label = (value: string | null): string => value?.trim() || '<sans valeur>';
const isSystemStatus = (row: StatusUsageRow): boolean =>
  row.reference_id === null
  && ['fournisseur', 'interne', 'sollicitation'].some((value) => key(row.entity_type).includes(value));
const statusCategory = (value: string): ConfigUsageRow['category'] => {
  const parsed = configStatusCategorySchema.safeParse(value);
  if (!parsed.success) throw httpError(500, 'DB_READ_FAILED', "Impossible de charger l'impact des statuts.");
  return parsed.data;
};

const buildRow = (
  dimension: ConfigUsageDimension,
  sourceLabel: string,
  usageCount: number,
  state: ConfigUsageRow['state'],
  reference?: ReferenceRow,
  resolution?: ResolutionRow
): ConfigUsageRow => ({
  dimension,
  label: sourceLabel,
  reference_id: reference?.id ?? null,
  sort_order: reference?.sort_order ?? null,
  category: reference?.category ?? null,
  is_active: reference?.is_active ?? false,
  usage_count: usageCount,
  state,
  resolution_id: resolution?.id ?? null,
  target_reference_id: resolution?.target_reference_id ?? null,
  target_label: resolution?.target_label ?? null
});

const mergeLabels = (
  dimension: Exclude<ConfigUsageDimension, 'statuses'>,
  references: ReferenceRow[],
  usageRows: UsageRow[],
  resolutions: ResolutionRow[]
): ConfigUsageRow[] => {
  const usage = new Map(usageRows.map((row) => [key(label(row.label)), row.usage_count]));
  const referenceKeys = new Set(references.map((row) => key(row.label)));
  const resolutionBySource = new Map(resolutions.map((row) => [key(row.source_label), row]));
  const configured = references.map((reference) => {
    const usageCount = usage.get(key(reference.label)) ?? 0;
    const state = reference.is_active
      ? usageCount > 0 ? 'active_used' : 'active_unused'
      : usageCount > 0 ? 'archived_used' : 'archived_unused';
    return buildRow(dimension, reference.label, usageCount, state, reference);
  });
  const historical = usageRows
    .filter((row) => !referenceKeys.has(key(label(row.label))))
    .map((row) => {
      const sourceLabel = label(row.label);
      const resolution = resolutionBySource.get(key(sourceLabel));
      const state = resolution
        ? 'resolved_historical'
        : isSystemReferenceLabel(dimension, sourceLabel) ? 'system_managed' : 'unresolved';
      return buildRow(dimension, sourceLabel, row.usage_count, state, undefined, resolution);
    });
  return [...configured, ...historical];
};

const mergeStatuses = (
  references: ReferenceRow[],
  usageRows: StatusUsageRow[],
  resolutions: ResolutionRow[]
): ConfigUsageRow[] => {
  const usageById = new Map<string, number>();
  usageRows.forEach((row) => {
    if (row.reference_id) usageById.set(row.reference_id, (usageById.get(row.reference_id) ?? 0) + row.usage_count);
  });
  const referenceIds = new Set(references.map((row) => row.id));
  const resolutionBySource = new Map(resolutions.map((row) => [key(row.source_label), row]));
  const configured = references.map((reference) => {
    const usageCount = usageById.get(reference.id) ?? 0;
    const state = reference.is_active
      ? usageCount > 0 ? 'active_used' : 'active_unused'
      : usageCount > 0 ? 'archived_used' : 'archived_unused';
    return buildRow('statuses', reference.label, usageCount, state, reference);
  });
  const historical = usageRows
    .filter((row) => !row.reference_id || !referenceIds.has(row.reference_id))
    .map((row) => {
      const sourceLabel = label(row.label);
      const resolution = resolutionBySource.get(key(sourceLabel));
      const state = resolution ? 'resolved_historical' : isSystemStatus(row) ? 'system_managed' : 'unresolved';
      return buildRow('statuses', sourceLabel, row.usage_count, state, undefined, resolution);
    });
  return [...configured, ...historical];
};

const totals = (dimensions: Record<ConfigUsageDimension, ConfigUsageRow[]>): ConfigUsageSnapshot['totals'] => {
  const rows = Object.values(dimensions).flat();
  return {
    unresolved: rows.filter((row) => row.state === 'unresolved').length,
    archived: rows.filter((row) => row.state === 'archived_used' || row.state === 'archived_unused').length,
    resolved: rows.filter((row) => row.state === 'resolved_historical').length,
    system_managed: rows.filter((row) => row.state === 'system_managed').length,
    referenced_values: rows.filter((row) => row.reference_id !== null).length,
    used_values: rows.filter((row) => row.usage_count > 0).length
  };
};

const loadUsage = async (db: DbClient, agencyId: string) => {
  const [statuses, services, interactionTypes, families] = await Promise.all([
    db.select({
      reference_id: interactions.status_id,
      label: interactions.status,
      entity_type: interactions.entity_type,
      usage_count: sql<number>`count(*)::int`
    }).from(interactions).where(eq(interactions.agency_id, agencyId))
      .groupBy(interactions.status_id, interactions.status, interactions.entity_type),
    db.select({ label: interactions.contact_service, usage_count: sql<number>`count(*)::int` })
      .from(interactions).where(eq(interactions.agency_id, agencyId)).groupBy(interactions.contact_service),
    db.select({ label: interactions.interaction_type, usage_count: sql<number>`count(*)::int` })
      .from(interactions).where(eq(interactions.agency_id, agencyId)).groupBy(interactions.interaction_type),
    db.execute<UsageRow>(sql`select family::text as label, count(*)::int as usage_count from public.interactions, unnest(mega_families) family where agency_id = ${agencyId} group by family`)
  ]);
  return { statuses, services, families, interaction_types: interactionTypes };
};

const loadReferences = async (db: DbClient, agencyId: string) => {
  const common = { category: sql<null>`null`, is_active: sql<boolean>`archived_at is null` };
  const [statuses, services, families, interactionTypes, resolutions] = await Promise.all([
    db.select({ id: agency_statuses.id, label: agency_statuses.label, sort_order: agency_statuses.sort_order, category: agency_statuses.category, is_active: agency_statuses.is_active })
      .from(agency_statuses).where(eq(agency_statuses.agency_id, agencyId)).orderBy(asc(agency_statuses.sort_order)),
    db.select({ id: agency_services.id, label: agency_services.label, sort_order: agency_services.sort_order, ...common })
      .from(agency_services).where(eq(agency_services.agency_id, agencyId)).orderBy(asc(agency_services.sort_order)),
    db.select({ id: agency_families.id, label: agency_families.label, sort_order: agency_families.sort_order, ...common })
      .from(agency_families).where(eq(agency_families.agency_id, agencyId)).orderBy(asc(agency_families.sort_order)),
    db.select({ id: agency_interaction_types.id, label: agency_interaction_types.label, sort_order: agency_interaction_types.sort_order, ...common })
      .from(agency_interaction_types).where(eq(agency_interaction_types.agency_id, agencyId)).orderBy(asc(agency_interaction_types.sort_order)),
    db.execute<ResolutionRow>(sql`select r.id, r.dimension, r.source_label, coalesce(r.target_status_id, r.target_service_id, r.target_family_id, r.target_interaction_type_id)::text target_reference_id, coalesce(s.label, sv.label, f.label, it.label) target_label from ${agency_reference_resolutions} r left join ${agency_statuses} s on s.id=r.target_status_id left join ${agency_services} sv on sv.id=r.target_service_id left join ${agency_families} f on f.id=r.target_family_id left join ${agency_interaction_types} it on it.id=r.target_interaction_type_id where r.agency_id=${agencyId}`)
  ]);
  return { statuses, services, families, interaction_types: interactionTypes, resolutions };
};

export const getConfigUsage = async (db: DbClient, auth: AuthContext, requestId: string | undefined, input: ConfigUsageInput): Promise<ConfigUsageResponse> => {
  await ensureDataRateLimit('config:usage', auth.userId);
  const agencyId = ensureAgencyAccess(auth, input.agency_id);
  try {
    const [references, usage] = await Promise.all([loadReferences(db, agencyId), loadUsage(db, agencyId)]);
    const byDimension = (dimension: ConfigUsageDimension) => references.resolutions.filter((row) => row.dimension === dimension);
    const dimensions = {
      statuses: mergeStatuses(references.statuses.map((row) => ({ ...row, category: statusCategory(row.category) })), usage.statuses, byDimension('statuses')),
      services: mergeLabels('services', references.services, usage.services, byDimension('services')),
      families: mergeLabels('families', references.families, usage.families, byDimension('families')),
      interaction_types: mergeLabels('interaction_types', references.interaction_types, usage.interaction_types, byDimension('interaction_types'))
    };
    return { request_id: requestId, ok: true, usage: { agency_id: agencyId, dimensions, totals: totals(dimensions) } };
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'DB_READ_FAILED') throw error;
    throw httpError(500, 'DB_READ_FAILED', "Impossible de charger l'impact des parametres.");
  }
};
