import {
  type PricingReferenceDiffObjectType,
  type PricingReferenceDiffRow,
  type PricingReferenceDiffsListInput,
  type PricingReferenceDiffsListResponse,
  type PricingReferenceDiffsSummaryGetInput,
  type PricingReferenceDiffsSummaryResponse,
  type PricingReferenceFileKind,
  pricingReferenceDiffsListInputSchema,
  pricingReferenceDiffRunSelectorSchema,
} from "../../../../../shared/schemas/pricing/references.schema.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import type { AuthContext, DbClient } from "../../../types.ts";
import {
  getPricingReferenceDiffSummary,
  listPricingReferenceDiffs,
} from "./referenceDiffs.ts";
import {
  type ReferenceWatchAmbiguous,
  type ReferenceWatchFact,
  type ReferenceWatchFacts,
  type ReferenceWatchMissing,
  type ReferenceWatchSource,
  referenceWatchFactsSchema,
} from "./referenceWatchFacts.schema.ts";

export const REFERENCE_WATCH_TOP_CHANGES = 20;
export const REFERENCE_WATCH_MAX_BYTES = 48_000;

const SEVERITY_WEIGHT: Record<string, number> = {
  bloquante: 4,
  haute: 3,
  moyenne: 2,
  faible: 1,
};

const SKIPPED_FILE_EXPECTED_OBJECTS: Record<
  PricingReferenceFileKind,
  readonly PricingReferenceDiffObjectType[]
> = {
  classification: ["classification"],
  segments_grids: ["segment", "liaison", "grille"],
};

export type ProjectReferenceWatchFactsOptions = {
  top_changes?: number;
  max_bytes?: number;
};

export type ReferenceWatchFactSources = {
  getSummary: (
    db: DbClient,
    callerId: string,
    requestId: string,
    input: PricingReferenceDiffsSummaryGetInput,
  ) => Promise<PricingReferenceDiffsSummaryResponse>;
  listDiffs: (
    db: DbClient,
    callerId: string,
    requestId: string,
    input: PricingReferenceDiffsListInput,
  ) => Promise<PricingReferenceDiffsListResponse>;
};

const defaultSources: ReferenceWatchFactSources = {
  getSummary: getPricingReferenceDiffSummary,
  listDiffs: listPricingReferenceDiffs,
};

const encoder = new TextEncoder();

export const measureReferenceWatchFactsBytes = (
  pack: ReferenceWatchFacts,
): number => encoder.encode(JSON.stringify(pack)).byteLength;

const finalizePack = (
  pack: ReferenceWatchFacts,
  maxBytes: number,
  truncatedBySelection: boolean,
): ReferenceWatchFacts => {
  let current = referenceWatchFactsSchema.parse(pack);
  for (let attempt = 0; attempt < 8; attempt++) {
    const usedBytes = measureReferenceWatchFactsBytes(current);
    const truncated = truncatedBySelection || usedBytes > maxBytes;
    if (
      current.bounds.used_bytes === usedBytes &&
      current.bounds.truncated === truncated
    ) {
      return current;
    }
    current = referenceWatchFactsSchema.parse({
      ...current,
      bounds: {
        ...current.bounds,
        used_bytes: usedBytes,
        truncated,
      },
    });
  }
  throw httpError(
    500,
    "REQUEST_FAILED",
    "Impossible de stabiliser used_bytes du paquet de faits.",
  );
};

const runSource = (
  summary: PricingReferenceDiffsSummaryResponse,
  field: string,
): ReferenceWatchSource => ({
  origin: "run_summary",
  run_id: summary.run_id,
  base_snapshot_id: summary.base_snapshot_id,
  target_snapshot_id: summary.target_snapshot_id,
  field,
});

const diffSource = (
  summary: PricingReferenceDiffsSummaryResponse,
  row: PricingReferenceDiffRow,
  field?: string,
): ReferenceWatchSource => ({
  origin: "diff_row",
  run_id: summary.run_id,
  base_snapshot_id: row.base_snapshot_id,
  target_snapshot_id: row.target_snapshot_id,
  diff_id: row.id,
  object_type: row.object_type,
  ...(field ? { field } : {}),
});

const fact = (
  id: string,
  value: unknown,
  source: ReferenceWatchSource,
  trust: ReferenceWatchFact["trust"],
): ReferenceWatchFact => ({ kind: "fact", id, value, source, trust });

const missing = (
  id: string,
  expected: string,
  reason: string,
  source: ReferenceWatchSource,
): ReferenceWatchMissing => ({ kind: "missing", id, expected, reason, source });

const ambiguous = (
  id: string,
  candidates: unknown[],
  reason: string,
  source: ReferenceWatchSource,
): ReferenceWatchAmbiguous => ({
  kind: "ambiguous",
  id,
  candidates,
  reason,
  source,
  trust: "untrusted_source_text",
});

const compareDiffRows = (
  left: PricingReferenceDiffRow,
  right: PricingReferenceDiffRow,
): number => {
  const weightDelta =
    (SEVERITY_WEIGHT[right.severity] ?? 0) -
    (SEVERITY_WEIGHT[left.severity] ?? 0);
  if (weightDelta !== 0) return weightDelta;
  const objectTypeDelta = left.object_type.localeCompare(right.object_type);
  if (objectTypeDelta !== 0) return objectTypeDelta;
  const objectKeyDelta = left.object_key.localeCompare(right.object_key);
  if (objectKeyDelta !== 0) return objectKeyDelta;
  return left.id.localeCompare(right.id);
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const anomalyTypeOf = (value: unknown): string | null => {
  const record = asRecord(value);
  return typeof record?.type === "string" ? record.type : null;
};

const ambiguousLinkCandidates = (row: PricingReferenceDiffRow): unknown[] => {
  const sides = [row.payload.after, row.payload.before]
    .map(asRecord)
    .filter((side): side is Record<string, unknown> => side !== null);
  for (const side of sides) {
    const details = asRecord(side.details);
    if (Array.isArray(details?.cir_keys) && details.cir_keys.length > 0) {
      return details.cir_keys;
    }
  }
  return sides;
};

const isAmbiguousLinkRow = (row: PricingReferenceDiffRow): boolean =>
  anomalyTypeOf(row.payload.after) === "segment_ambiguous_link" ||
  anomalyTypeOf(row.payload.before) === "segment_ambiguous_link" ||
  anomalyTypeOf(row.payload.labels) === "segment_ambiguous_link";

const projectSummaryEntries = (
  summary: PricingReferenceDiffsSummaryResponse,
): {
  facts: ReferenceWatchFact[];
  missing: ReferenceWatchMissing[];
} => {
  const facts: ReferenceWatchFact[] = [
    fact(
      "summary.total",
      summary.total,
      runSource(summary, "total"),
      "trusted_computed",
    ),
    fact(
      "summary.initial_import",
      summary.initial_import,
      runSource(summary, "initial_import"),
      "trusted_computed",
    ),
    fact(
      "summary.skipped_file_kinds",
      summary.skipped_file_kinds,
      runSource(summary, "skipped_file_kinds"),
      "trusted_computed",
    ),
  ];
  const missingEntries: ReferenceWatchMissing[] = [];

  if (summary.snapshot_counters.base === null) {
    if (summary.initial_import) {
      facts.push(fact(
        "summary.snapshot_counters.base",
        null,
        runSource(summary, "snapshot_counters.base"),
        "trusted_computed",
      ));
    } else {
      missingEntries.push(missing(
        "summary.snapshot_counters.base",
        "snapshot_counters.base",
        "Compteurs de base absents alors que le run n est pas un import initial.",
        runSource(summary, "snapshot_counters.base"),
      ));
    }
  } else {
    facts.push(fact(
      "summary.snapshot_counters.base",
      summary.snapshot_counters.base,
      runSource(summary, "snapshot_counters.base"),
      "trusted_computed",
    ));
  }

  facts.push(
    fact(
      "summary.snapshot_counters.target",
      summary.snapshot_counters.target,
      runSource(summary, "snapshot_counters.target"),
      "trusted_computed",
    ),
    fact(
      "summary.financial_changes_count",
      summary.financial_changes_count,
      runSource(summary, "financial_changes_count"),
      "trusted_computed",
    ),
    fact(
      "summary.deviation_alerts",
      summary.deviation_alerts,
      runSource(summary, "deviation_alerts"),
      "trusted_computed",
    ),
  );

  const typeCells = [...summary.counts_by_type].sort((left, right) => {
    const objectDelta = left.object_type.localeCompare(right.object_type);
    return objectDelta !== 0
      ? objectDelta
      : left.diff_type.localeCompare(right.diff_type);
  });
  for (const cell of typeCells) {
    const field = `counts_by_type.${cell.object_type}.${cell.diff_type}`;
    facts.push(fact(
      `summary.${field}`,
      cell.count,
      runSource(summary, field),
      "trusted_computed",
    ));
  }

  const objectSummaries = [...summary.counts_by_object_type].sort((left, right) =>
    left.object_type.localeCompare(right.object_type)
  );
  for (const item of objectSummaries) {
    const field = `counts_by_object_type.${item.object_type}`;
    facts.push(fact(
      `summary.${field}`,
      { total: item.total, by_severity: item.by_severity },
      runSource(summary, field),
      "trusted_computed",
    ));
  }

  const columns = [...summary.changed_columns].sort((left, right) =>
    left.column.localeCompare(right.column)
  );
  for (const column of columns) {
    const field = `changed_columns.${column.column}`;
    facts.push(fact(
      `summary.${field}`,
      column.count,
      runSource(summary, field),
      "trusted_computed",
    ));
  }

  for (const fileKind of summary.skipped_file_kinds) {
    const expectedObjects = SKIPPED_FILE_EXPECTED_OBJECTS[fileKind];
    const present = expectedObjects.some((objectType) =>
      (summary.counts_by_object_type.find((item) =>
        item.object_type === objectType
      )?.total ?? 0) > 0
    );
    if (!present) {
      missingEntries.push(missing(
        `summary.skipped_file_kinds.${fileKind}`,
        expectedObjects.join(","),
        "Fichier saute.",
        runSource(summary, "skipped_file_kinds"),
      ));
    }
  }

  return { facts, missing: missingEntries };
};

const projectDiffRowEntries = (
  summary: PricingReferenceDiffsSummaryResponse,
  row: PricingReferenceDiffRow,
): {
  facts: ReferenceWatchFact[];
  missing: ReferenceWatchMissing[];
  ambiguous: ReferenceWatchAmbiguous[];
} => {
  const facts: ReferenceWatchFact[] = [
    fact(
      `diff.${row.id}`,
      {
        diff_type: row.diff_type,
        object_type: row.object_type,
        severity: row.severity,
        changed_columns: row.changed_columns,
        source_row_numbers: row.payload.source_row_numbers ?? null,
      },
      diffSource(summary, row),
      "trusted_computed",
    ),
    fact(
      `diff.${row.id}.object_key`,
      row.object_key,
      diffSource(summary, row, "object_key"),
      "untrusted_source_text",
    ),
    fact(
      `diff.${row.id}.before`,
      row.payload.before,
      diffSource(summary, row, "before"),
      "untrusted_source_text",
    ),
    fact(
      `diff.${row.id}.after`,
      row.payload.after,
      diffSource(summary, row, "after"),
      "untrusted_source_text",
    ),
    fact(
      `diff.${row.id}.labels`,
      row.payload.labels,
      diffSource(summary, row, "labels"),
      "untrusted_source_text",
    ),
  ];
  const missingEntries: ReferenceWatchMissing[] = [];
  const ambiguousEntries: ReferenceWatchAmbiguous[] = [];

  if (row.payload.identity_note) {
    facts.push(fact(
      `diff.${row.id}.identity_note`,
      row.payload.identity_note,
      diffSource(summary, row, "identity_note"),
      "untrusted_source_text",
    ));
  }

  if (row.payload.source_row_numbers === undefined) {
    missingEntries.push(missing(
      `diff.${row.id}.source_row_numbers`,
      "source_row_numbers",
      "Numeros de lignes source absents.",
      diffSource(summary, row, "source_row_numbers"),
    ));
  }

  if (isAmbiguousLinkRow(row)) {
    ambiguousEntries.push(ambiguous(
      `diff.${row.id}.segment_ambiguous_link`,
      ambiguousLinkCandidates(row),
      "Liaison segment vers plusieurs cles CIR.",
      diffSource(summary, row, "segment_ambiguous_link"),
    ));
  }

  return { facts, missing: missingEntries, ambiguous: ambiguousEntries };
};

export const projectReferenceWatchFacts = (
  summary: PricingReferenceDiffsSummaryResponse,
  list: PricingReferenceDiffsListResponse,
  options: ProjectReferenceWatchFactsOptions = {},
): ReferenceWatchFacts => {
  const topChanges = options.top_changes ?? REFERENCE_WATCH_TOP_CHANGES;
  const maxBytes = options.max_bytes ?? REFERENCE_WATCH_MAX_BYTES;
  const summaryEntries = projectSummaryEntries(summary);
  const selectedRows = [...list.rows]
    .sort(compareDiffRows)
    .slice(0, topChanges);
  const truncatedByCount = list.total > topChanges;

  let pack = finalizePack({
    run: {
      run_id: summary.run_id,
      base_snapshot_id: summary.base_snapshot_id,
      target_snapshot_id: summary.target_snapshot_id,
      computed_at: summary.computed_at,
      status: "computed",
      initial_import: summary.initial_import,
      skipped_file_kinds: summary.skipped_file_kinds,
    },
    bounds: {
      top_changes: topChanges,
      max_bytes: maxBytes,
      used_bytes: 0,
      truncated: truncatedByCount,
    },
    facts: summaryEntries.facts,
    missing: summaryEntries.missing,
    ambiguous: [],
  }, maxBytes, truncatedByCount);

  for (const row of selectedRows) {
    if (pack.bounds.used_bytes > maxBytes) {
      return finalizePack(pack, maxBytes, true);
    }
    const rowEntries = projectDiffRowEntries(summary, row);
    const candidate = finalizePack({
      ...pack,
      facts: [...pack.facts, ...rowEntries.facts],
      missing: [...pack.missing, ...rowEntries.missing],
      ambiguous: [...pack.ambiguous, ...rowEntries.ambiguous],
    }, maxBytes, truncatedByCount);
    if (candidate.bounds.used_bytes > maxBytes) {
      return finalizePack(pack, maxBytes, true);
    }
    pack = candidate;
  }

  return pack;
};

export const buildReferenceWatchFacts = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  selector: PricingReferenceDiffsSummaryGetInput,
  sources: ReferenceWatchFactSources = defaultSources,
  options: ProjectReferenceWatchFactsOptions = {},
): Promise<ReferenceWatchFacts> => {
  const resolvedSources = sources;
  const parsedSelector = pricingReferenceDiffRunSelectorSchema.parse(selector);
  const summary = await resolvedSources.getSummary(
    db,
    authContext.userId,
    requestId,
    parsedSelector,
  );
  const topChanges = options.top_changes ?? REFERENCE_WATCH_TOP_CHANGES;
  const listInput = pricingReferenceDiffsListInputSchema.parse({
    ...parsedSelector,
    page: 1,
    page_size: topChanges,
    sort_by: "severity",
    sort_direction: "desc",
  });
  const list = await resolvedSources.listDiffs(
    db,
    authContext.userId,
    requestId,
    listInput,
  );
  return projectReferenceWatchFacts(summary, list, options);
};
