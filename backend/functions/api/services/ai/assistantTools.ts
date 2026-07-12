import { z } from "zod/v4";

import {
  pricingReferenceAnomaliesListInputSchema,
  pricingReferenceAnomaliesListResponseSchema,
  pricingReferenceAnomaliesSummaryResponseSchema,
  pricingReferenceAnomalySeveritySchema,
  pricingReferenceAnomalyTypeSchema,
  pricingReferenceDiffAggregateDirectionSchema,
  pricingReferenceDiffAggregateGroupBySchema,
  pricingReferenceDiffAggregateInputSchema,
  pricingReferenceDiffAggregateMeasureSchema,
  pricingReferenceDiffAggregateResponseSchema,
  pricingReferenceDiffObjectTypeSchema,
  pricingReferenceDiffsListInputSchema,
  pricingReferenceDiffsListResponseSchema,
  pricingReferenceDiffSortBySchema,
  pricingReferenceDiffsSummaryResponseSchema,
  pricingReferenceDiffTypeSchema,
  pricingReferenceHealthGetResponseSchema,
  pricingReferenceImportGetResponseSchema,
  pricingReferenceImportStatusSchema,
  pricingReferenceSortDirectionSchema,
} from "../../../../../shared/schemas/pricing/references.schema.ts";
import type { AiAssistantPageContext } from "../../../../../shared/schemas/aiAssistant.schema.ts";
import type { AuthContext, DbClient } from "../../types.ts";
import {
  getPricingReferenceDiffSummary,
  listPricingReferenceDiffs,
  resolvePricingReferenceBrandAliases,
  resolvePricingReferenceDiffRun,
} from "../pricing/references/referenceDiffs.ts";
import { aggregatePricingReferenceDiffs } from "../pricing/references/referenceDiffAggregates.ts";
import {
  getPricingReferenceAnomaliesSummary,
  getPricingReferenceHealth,
  getPricingReferenceImport,
  listPricingReferenceAnomalies,
  listPricingReferenceImports,
  resolveSnapshotId,
} from "../pricing/references/referenceImports.ts";
import { assistantSqlTools } from "./assistantSqlTools.ts";

export const MAX_TOOL_RESULT_ROWS = 50;
export const MAX_TOOL_RESULT_BYTES = 32_768;
const MAX_TOOL_ARGUMENT_BYTES = 16_384;

const toolErrorSchema = z.strictObject({
  ok: z.literal(false),
  reason: z.string().trim().min(1, { error: "Motif erreur outil requis." }).max(
    500,
  ),
});

const listImportsInputSchema = z.strictObject({
  status: pricingReferenceImportStatusSchema.optional(),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(MAX_TOOL_RESULT_ROWS).default(20),
});
const listImportsOutputSchema = z.union([
  z.strictObject({
    ok: z.literal(true),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    rows: z.array(z.strictObject({
      id: z.uuid(),
      status: pricingReferenceImportStatusSchema,
      created_at: z.string().min(1),
      analysis_completed_at: z.string().nullable(),
      classification_rows_count: z.number().int().nonnegative().nullable(),
      segments_rows_count: z.number().int().nonnegative().nullable(),
      anomalies_total: z.number().int().nonnegative().nullable(),
      files: z.array(z.strictObject({
        file_kind: z.enum(["classification", "segments_grids"]),
        original_filename: z.string().min(1),
        row_count: z.number().int().nonnegative().nullable(),
      })),
    })).max(MAX_TOOL_RESULT_ROWS),
  }),
  toolErrorSchema,
]);

const diffSelectorShape = {
  run_id: z.uuid({ error: "Identifiant run invalide." }).optional(),
  target_snapshot_id: z.uuid({ error: "Identifiant snapshot cible invalide." })
    .optional(),
  base_snapshot_id: z.uuid({ error: "Identifiant snapshot source invalide." })
    .nullable().optional(),
};
const getDiffSummaryInputSchema = z.strictObject(diffSelectorShape);
const diffSummaryDataSchema = pricingReferenceDiffsSummaryResponseSchema.omit({
  ok: true,
  request_id: true,
});
const getDiffSummaryOutputSchema = z.union([
  z.strictObject({ ok: z.literal(true), data: diffSummaryDataSchema }),
  toolErrorSchema,
]);

const listDiffsInputSchema = z.strictObject({
  ...diffSelectorShape,
  search: z.string().trim().max(120).optional(),
  severities: z.array(pricingReferenceAnomalySeveritySchema).max(20).optional(),
  diff_types: z.array(pricingReferenceDiffTypeSchema).max(20).optional(),
  object_types: z.array(pricingReferenceDiffObjectTypeSchema).max(20)
    .optional(),
  changed_columns: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  marques: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(MAX_TOOL_RESULT_ROWS).default(20),
  sort_by: pricingReferenceDiffSortBySchema.default("severity"),
  sort_direction: pricingReferenceSortDirectionSchema.default("desc"),
});
const diffListDataSchema = pricingReferenceDiffsListResponseSchema.omit({
  ok: true,
  request_id: true,
});
const listDiffsOutputSchema = z.union([
  z.strictObject({ ok: z.literal(true), data: diffListDataSchema }),
  toolErrorSchema,
]);

const aggregateDiffsInputSchema = z.strictObject({
  ...diffSelectorShape,
  group_by: pricingReferenceDiffAggregateGroupBySchema,
  measure: pricingReferenceDiffAggregateMeasureSchema.default("any"),
  direction: pricingReferenceDiffAggregateDirectionSchema.default("any"),
  marques: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  severities: z.array(pricingReferenceAnomalySeveritySchema).max(20).optional(),
  diff_types: z.array(pricingReferenceDiffTypeSchema).max(20).optional(),
  include_neutral: z.boolean().default(false),
  limit: z.number().int().min(1).max(MAX_TOOL_RESULT_ROWS).default(50),
});
const aggregateDiffDataSchema = pricingReferenceDiffAggregateResponseSchema
  .omit({ ok: true, request_id: true });
const aggregateDiffsOutputSchema = z.union([
  z.strictObject({ ok: z.literal(true), data: aggregateDiffDataSchema }),
  toolErrorSchema,
]);

const importIdInputSchema = z.strictObject({
  import_id: z.uuid({ error: "Identifiant import invalide." }).optional(),
});
const importDetailDataSchema = pricingReferenceImportGetResponseSchema.omit({
  ok: true,
  request_id: true,
});
const getImportDetailsOutputSchema = z.union([
  z.strictObject({ ok: z.literal(true), data: importDetailDataSchema }),
  toolErrorSchema,
]);

const healthDataSchema = pricingReferenceHealthGetResponseSchema.omit({
  ok: true,
  request_id: true,
});
const getHealthReportOutputSchema = z.union([
  z.strictObject({ ok: z.literal(true), data: healthDataSchema }),
  toolErrorSchema,
]);

const anomalyFiltersShape = {
  import_id: z.uuid({ error: "Identifiant import invalide." }).optional(),
  snapshot_id: z.uuid({ error: "Identifiant snapshot invalide." }).optional(),
  search: z.string().trim().max(120).optional(),
  severities: z.array(pricingReferenceAnomalySeveritySchema).max(20).optional(),
  types: z.array(pricingReferenceAnomalyTypeSchema).max(20).optional(),
  marques: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
};
const getAnomaliesSummaryInputSchema = z.strictObject(anomalyFiltersShape);
const anomaliesSummaryDataSchema =
  pricingReferenceAnomaliesSummaryResponseSchema
    .omit({ ok: true, request_id: true });
const getAnomaliesSummaryOutputSchema = z.union([
  z.strictObject({ ok: z.literal(true), data: anomaliesSummaryDataSchema }),
  toolErrorSchema,
]);

const listAnomaliesInputSchema = z.strictObject({
  ...anomalyFiltersShape,
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(MAX_TOOL_RESULT_ROWS).default(20),
  sort_by: z.enum(["created_at", "severity", "type", "source_row_number"])
    .default("created_at"),
  sort_direction: pricingReferenceSortDirectionSchema.default("desc"),
});
const anomaliesListDataSchema = pricingReferenceAnomaliesListResponseSchema
  .omit({ ok: true, request_id: true });
const listAnomaliesOutputSchema = z.union([
  z.strictObject({ ok: z.literal(true), data: anomaliesListDataSchema }),
  toolErrorSchema,
]);

type ToolSchema = z.ZodType<Record<string, unknown>>;
export type AssistantTool = {
  name: string;
  version: "1.0";
  description: string;
  inputSchema: ToolSchema;
  outputSchema: z.ZodType;
  parameters: Record<string, unknown>;
  run: (
    db: DbClient,
    authContext: AuthContext,
    requestId: string,
    args: Record<string, unknown>,
    pageContext: AiAssistantPageContext,
  ) => Promise<unknown>;
};

const parametersFor = (schema: ToolSchema): Record<string, unknown> => {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
};

type ResolvedReferenceContext = {
  importId: string | null;
  snapshotId: string | null;
  selector: Record<string, unknown> | null;
};

const resolveReferenceContext = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  args: Record<string, unknown>,
  pageContext: AiAssistantPageContext,
  requireDiffRun = false,
): Promise<ResolvedReferenceContext> => {
  const runId = args.run_id ?? pageContext.run_id;
  let importId = typeof args.import_id === "string"
    ? args.import_id
    : pageContext.import_id ?? null;
  let snapshotId = typeof args.snapshot_id === "string"
    ? args.snapshot_id
    : typeof args.target_snapshot_id === "string"
    ? args.target_snapshot_id
    : pageContext.target_snapshot_id ?? null;

  if (!runId && !snapshotId && !importId) {
    const latest = await listPricingReferenceImports(
      db,
      authContext.userId,
      requestId,
      {
        status: "analyse_ok",
        page: 1,
        page_size: requireDiffRun ? MAX_TOOL_RESULT_ROWS : 1,
      },
    );
    if (requireDiffRun) {
      for (const candidate of latest.imports) {
        const candidateSnapshotId = await resolveSnapshotId(db, {
          import_id: candidate.id,
        });
        if (!candidateSnapshotId) continue;
        try {
          const candidateRun = await resolvePricingReferenceDiffRun(db, {
            target_snapshot_id: candidateSnapshotId,
          });
          return {
            importId: candidate.id,
            snapshotId: candidateSnapshotId,
            selector: { run_id: candidateRun.id },
          };
        } catch (error) {
          if (
            error instanceof Error && Reflect.get(error, "status") === 404
          ) continue;
          throw error;
        }
      }
    } else {
      importId = latest.imports[0]?.id ?? null;
    }
  }
  if (!snapshotId && importId) {
    snapshotId = await resolveSnapshotId(db, { import_id: importId });
  }

  return {
    importId,
    snapshotId,
    selector: runId || snapshotId
      ? {
        run_id: runId,
        target_snapshot_id: snapshotId,
        base_snapshot_id: args.base_snapshot_id === undefined
          ? pageContext.base_snapshot_id
          : args.base_snapshot_id,
      }
      : null,
  };
};

const listImportsTool: AssistantTool = {
  name: "list_imports",
  version: "1.0",
  description:
    "Liste les imports de referentiels tarifaires CIR avec fichiers, statuts, volumes et nombre d anomalies.",
  inputSchema: listImportsInputSchema,
  outputSchema: listImportsOutputSchema,
  parameters: parametersFor(listImportsInputSchema),
  async run(db, authContext, requestId, args) {
    const input = listImportsInputSchema.parse(args);
    const response = await listPricingReferenceImports(
      db,
      authContext.userId,
      requestId,
      input,
    );
    return {
      ok: true,
      page: response.page,
      page_size: response.page_size,
      total: response.total,
      rows: response.imports.slice(0, MAX_TOOL_RESULT_ROWS).map((item) => ({
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        analysis_completed_at: item.analysis_completed_at,
        classification_rows_count: item.classification_rows_count,
        segments_rows_count: item.segments_rows_count,
        anomalies_total: item.anomalies_total,
        files: item.files.map((file) => ({
          file_kind: file.file_kind,
          original_filename: file.original_filename,
          row_count: file.row_count,
        })),
      })),
    };
  },
};

const getDiffSummaryTool: AssistantTool = {
  name: "get_diff_summary",
  version: "1.0",
  description:
    "Retourne le resume exhaustif d un run de differences entre deux snapshots de referentiels.",
  inputSchema: getDiffSummaryInputSchema,
  outputSchema: getDiffSummaryOutputSchema,
  parameters: parametersFor(getDiffSummaryInputSchema),
  async run(db, authContext, requestId, args, pageContext) {
    const context = await resolveReferenceContext(
      db,
      authContext,
      requestId,
      args,
      pageContext,
      true,
    );
    if (!context.selector) {
      return { ok: false, reason: "Identifiant run ou snapshot cible requis." };
    }
    const response = await getPricingReferenceDiffSummary(
      db,
      authContext.userId,
      requestId,
      context.selector as z.infer<typeof getDiffSummaryInputSchema>,
    );
    const { ok: _ok, request_id: _requestId, ...data } = response;
    return { ok: true, data };
  },
};

const listDiffsTool: AssistantTool = {
  name: "list_diffs",
  version: "1.0",
  description:
    "Liste une page plafonnee de differences, avec filtres metier et total reel.",
  inputSchema: listDiffsInputSchema,
  outputSchema: listDiffsOutputSchema,
  parameters: parametersFor(listDiffsInputSchema),
  async run(db, authContext, requestId, args, pageContext) {
    const context = await resolveReferenceContext(
      db,
      authContext,
      requestId,
      args,
      pageContext,
      true,
    );
    if (!context.selector) {
      return { ok: false, reason: "Identifiant run ou snapshot cible requis." };
    }
    const input = pricingReferenceDiffsListInputSchema.parse({
      ...args,
      ...context.selector,
      marques: resolvePricingReferenceBrandAliases(
        args.marques as string[] | undefined,
      ),
    });
    const response = await listPricingReferenceDiffs(
      db,
      authContext.userId,
      requestId,
      input,
    );
    const { ok: _ok, request_id: _requestId, ...data } = response;
    return {
      ok: true,
      data: { ...data, rows: data.rows.slice(0, MAX_TOOL_RESULT_ROWS) },
    };
  },
};

const aggregateDiffsTool: AssistantTool = {
  name: "aggregate_diffs",
  version: "1.0",
  description:
    "Agrege exhaustivement les changements avec direction normalisee. A privilegier pour toute question par famille CIR (famille_cir), categorie fabricant (categorie_fabricant), segment ou marque, notamment les hausses de prix et baisses de remise.",
  inputSchema: aggregateDiffsInputSchema,
  outputSchema: aggregateDiffsOutputSchema,
  parameters: parametersFor(aggregateDiffsInputSchema),
  async run(db, authContext, requestId, args, pageContext) {
    const context = await resolveReferenceContext(
      db,
      authContext,
      requestId,
      args,
      pageContext,
      true,
    );
    if (!context.selector) {
      return { ok: false, reason: "Identifiant run ou snapshot cible requis." };
    }
    const input = pricingReferenceDiffAggregateInputSchema.parse({
      ...args,
      ...context.selector,
      limit: Math.min(Number(args.limit ?? 50), MAX_TOOL_RESULT_ROWS),
    });
    const response = await aggregatePricingReferenceDiffs(
      db,
      authContext,
      input,
    );
    const { ok: _ok, request_id: _requestId, ...data } = response;
    return { ok: true, data };
  },
};

const getImportDetailsTool: AssistantTool = {
  name: "get_import_details",
  version: "1.0",
  description:
    "Retourne le detail d un import referentiel : fichiers, compteurs, statuts de mapping et rapport de sante.",
  inputSchema: importIdInputSchema,
  outputSchema: getImportDetailsOutputSchema,
  parameters: parametersFor(importIdInputSchema),
  async run(db, authContext, requestId, args, pageContext) {
    const context = await resolveReferenceContext(
      db,
      authContext,
      requestId,
      args,
      pageContext,
    );
    if (!context.importId) {
      return { ok: false, reason: "Identifiant import requis." };
    }
    const response = await getPricingReferenceImport(
      db,
      authContext.userId,
      requestId,
      { import_id: context.importId },
    );
    const { ok: _ok, request_id: _requestId, ...data } = response;
    return {
      ok: true,
      data: {
        import: {
          ...data.import,
          files: data.import.files.slice(0, MAX_TOOL_RESULT_ROWS),
          effective_files: data.import.effective_files.slice(
            0,
            MAX_TOOL_RESULT_ROWS,
          ),
        },
      },
    };
  },
};

const getHealthReportTool: AssistantTool = {
  name: "get_health_report",
  version: "1.0",
  description:
    "Retourne le rapport de sante structure d un import : classification, segments, fichiers et anomalies.",
  inputSchema: importIdInputSchema,
  outputSchema: getHealthReportOutputSchema,
  parameters: parametersFor(importIdInputSchema),
  async run(db, authContext, requestId, args, pageContext) {
    const context = await resolveReferenceContext(
      db,
      authContext,
      requestId,
      args,
      pageContext,
    );
    if (!context.importId) {
      return { ok: false, reason: "Identifiant import requis." };
    }
    const response = await getPricingReferenceHealth(
      db,
      authContext.userId,
      requestId,
      { import_id: context.importId },
    );
    const { ok: _ok, request_id: _requestId, ...data } = response;
    return { ok: true, data };
  },
};

const getAnomaliesSummaryTool: AssistantTool = {
  name: "get_anomalies_summary",
  version: "1.0",
  description:
    "Resume les anomalies avec facettes severite, type et marque, et action_label pour proposer une correction concrete.",
  inputSchema: getAnomaliesSummaryInputSchema,
  outputSchema: getAnomaliesSummaryOutputSchema,
  parameters: parametersFor(getAnomaliesSummaryInputSchema),
  async run(db, authContext, requestId, args, pageContext) {
    const context = await resolveReferenceContext(
      db,
      authContext,
      requestId,
      args,
      pageContext,
    );
    if (!context.importId && !context.snapshotId) {
      return { ok: false, reason: "Identifiant import ou snapshot requis." };
    }
    const input = getAnomaliesSummaryInputSchema.parse({
      ...args,
      import_id: context.importId ?? undefined,
      snapshot_id: context.snapshotId ?? undefined,
      marques: resolvePricingReferenceBrandAliases(
        args.marques as string[] | undefined,
      ),
    });
    const response = await getPricingReferenceAnomaliesSummary(
      db,
      authContext.userId,
      requestId,
      input,
    );
    const { ok: _ok, request_id: _requestId, ...data } = response;
    return {
      ok: true,
      data: {
        ...data,
        groups_by_type: data.groups_by_type.slice(0, MAX_TOOL_RESULT_ROWS),
        facets: {
          severities: data.facets.severities.slice(0, MAX_TOOL_RESULT_ROWS),
          types: data.facets.types.slice(0, MAX_TOOL_RESULT_ROWS),
          marques: data.facets.marques.slice(0, MAX_TOOL_RESULT_ROWS),
        },
      },
    };
  },
};

const listAnomaliesTool: AssistantTool = {
  name: "list_anomalies",
  version: "1.0",
  description:
    "Liste au maximum 50 anomalies filtrees par severite, type ou marque, avec le total reel et les details utiles a la correction.",
  inputSchema: listAnomaliesInputSchema,
  outputSchema: listAnomaliesOutputSchema,
  parameters: parametersFor(listAnomaliesInputSchema),
  async run(db, authContext, requestId, args, pageContext) {
    const context = await resolveReferenceContext(
      db,
      authContext,
      requestId,
      args,
      pageContext,
    );
    if (!context.importId && !context.snapshotId) {
      return { ok: false, reason: "Identifiant import ou snapshot requis." };
    }
    const input = pricingReferenceAnomaliesListInputSchema.parse({
      ...args,
      import_id: context.importId ?? undefined,
      snapshot_id: context.snapshotId ?? undefined,
      marques: resolvePricingReferenceBrandAliases(
        args.marques as string[] | undefined,
      ),
      page_size: Math.min(Number(args.page_size ?? 20), MAX_TOOL_RESULT_ROWS),
    });
    const response = await listPricingReferenceAnomalies(
      db,
      authContext.userId,
      requestId,
      input,
    );
    const { ok: _ok, request_id: _requestId, ...data } = response;
    return {
      ok: true,
      data: { ...data, rows: data.rows.slice(0, MAX_TOOL_RESULT_ROWS) },
    };
  },
};

export const assistantTools = [
  listImportsTool,
  getDiffSummaryTool,
  listDiffsTool,
  aggregateDiffsTool,
  getImportDetailsTool,
  getHealthReportTool,
  getAnomaliesSummaryTool,
  listAnomaliesTool,
  ...assistantSqlTools,
] as const;

export const openRouterToolDefinitions = assistantTools.map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: `${tool.description} Contrat ${tool.version}.`,
    parameters: tool.parameters,
  },
}));

const fitOutputBytes = (
  output: Record<string, unknown>,
): Record<string, unknown> | null => {
  const bounded = structuredClone(output);
  const data = bounded.data;
  const dataRecord = typeof data === "object" && data !== null &&
      !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;
  const rows = Array.isArray(bounded.rows)
    ? bounded.rows
    : Array.isArray(dataRecord?.rows)
    ? dataRecord.rows as unknown[]
    : Array.isArray(dataRecord?.groups)
    ? dataRecord.groups as unknown[]
    : null;
  while (
    rows && rows.length > 0 &&
    new TextEncoder().encode(JSON.stringify(bounded)).length >
      MAX_TOOL_RESULT_BYTES
  ) {
    rows.pop();
    if (Array.isArray(dataRecord?.groups)) dataRecord.truncated = true;
  }
  return new TextEncoder().encode(JSON.stringify(bounded)).length <=
      MAX_TOOL_RESULT_BYTES
    ? bounded
    : null;
};

export const executeAssistantTool = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  name: string,
  args: unknown,
  pageContext: AiAssistantPageContext,
): Promise<{ output: Record<string, unknown>; rowCount: number | null }> => {
  const tool = assistantTools.find((candidate) => candidate.name === name);
  if (!tool) {
    return { output: { ok: false, reason: "Outil inconnu." }, rowCount: null };
  }
  if (
    new TextEncoder().encode(JSON.stringify(args)).length >
      MAX_TOOL_ARGUMENT_BYTES
  ) {
    return {
      output: { ok: false, reason: "Arguments outil trop volumineux." },
      rowCount: null,
    };
  }
  const input = tool.inputSchema.safeParse(args);
  if (!input.success) {
    return {
      output: {
        ok: false,
        reason: `Arguments invalides : ${
          input.error.issues.map((issue) => issue.message).join(" | ")
        }`,
      },
      rowCount: null,
    };
  }
  try {
    const raw = await tool.run(
      db,
      authContext,
      requestId,
      input.data,
      pageContext,
    );
    const parsed = tool.outputSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        output: { ok: false, reason: "Sortie outil invalide." },
        rowCount: null,
      };
    }
    const output = fitOutputBytes(parsed.data as Record<string, unknown>);
    if (!output) {
      return {
        output: {
          ok: false,
          reason: `Resultat outil superieur a ${MAX_TOOL_RESULT_BYTES} octets.`,
        },
        rowCount: null,
      };
    }
    const data = output.data as Record<string, unknown> | undefined;
    const rows = output.rows ?? data?.rows ?? data?.groups;
    return { output, rowCount: Array.isArray(rows) ? rows.length : null };
  } catch (error) {
    return {
      output: {
        ok: false,
        reason: error instanceof Error
          ? error.message.slice(0, 500)
          : "Execution outil impossible.",
      },
      rowCount: null,
    };
  }
};
