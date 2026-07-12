import { z } from "zod/v4";

import {
  pricingReferenceAnomaliesSummaryResponseSchema,
  pricingReferenceDiffAggregateResponseSchema,
  pricingReferenceDiffsSummaryResponseSchema,
} from "../../../../../shared/schemas/pricing/references.schema.ts";
import type { AuthContext, DbClient } from "../../types.ts";
import { aggregatePricingReferenceDiffs } from "../pricing/references/referenceDiffAggregates.ts";
import { getPricingReferenceDiffSummary } from "../pricing/references/referenceDiffs.ts";
import { getPricingReferenceAnomaliesSummary } from "../pricing/references/referenceImports.ts";

export const ASSISTANT_REFERENTIELS_EVALUATION_VERSION = "2.0.0" as const;

const evaluationToolSchema = z.enum([
  "aggregate_diffs",
  "get_diff_summary",
  "get_anomalies_summary",
]);
const evaluationResultSchema = z.union([
  pricingReferenceDiffAggregateResponseSchema,
  pricingReferenceDiffsSummaryResponseSchema,
  pricingReferenceAnomaliesSummaryResponseSchema,
]);
const evaluationCaseSchema = z.strictObject({
  id: z.string().trim().min(1, { error: "Identifiant evaluation requis." }),
  question: z.string().trim().min(1, { error: "Question evaluation requise." }),
  requires_clarification: z.boolean(),
  expected_tools: z.array(evaluationToolSchema).max(3),
  expected_arguments: z.array(z.record(z.string(), z.unknown())).max(3),
  expected_result: evaluationResultSchema.nullable(),
});
export const assistantReferentielsEvaluationSuiteSchema = z.strictObject({
  version: z.literal(ASSISTANT_REFERENTIELS_EVALUATION_VERSION),
  run_id: z.uuid({ error: "Identifiant run evaluation invalide." }),
  import_id: z.uuid({ error: "Identifiant import evaluation invalide." }),
  cases: z.array(evaluationCaseSchema).min(4),
});

export type AssistantReferentielsEvaluationSuite = z.infer<
  typeof assistantReferentielsEvaluationSuiteSchema
>;

export const buildAssistantReferentielsEvaluationSuite = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  context: { run_id: string; import_id: string },
): Promise<AssistantReferentielsEvaluationSuite> => {
  const rockwellArguments = {
    run_id: context.run_id,
    group_by: "categorie_fabricant" as const,
    measure: "prix" as const,
    direction: "hausse" as const,
    marques: ["ROCKWELL"],
    include_neutral: false,
    limit: 50,
  };
  const discountArguments = {
    run_id: context.run_id,
    group_by: "famille_cir" as const,
    measure: "remise" as const,
    direction: "baisse" as const,
    include_neutral: false,
    limit: 50,
  };

  const [rockwellAggregate, discountAggregate, diffSummary, anomalySummary] =
    await Promise.all([
      aggregatePricingReferenceDiffs(db, authContext, rockwellArguments),
      aggregatePricingReferenceDiffs(db, authContext, discountArguments),
      getPricingReferenceDiffSummary(
        db,
        authContext.userId,
        requestId,
        { run_id: context.run_id },
      ),
      getPricingReferenceAnomaliesSummary(
        db,
        authContext.userId,
        requestId,
        { import_id: context.import_id },
      ),
    ]);

  return assistantReferentielsEvaluationSuiteSchema.parse({
    version: ASSISTANT_REFERENTIELS_EVALUATION_VERSION,
    run_id: context.run_id,
    import_id: context.import_id,
    cases: [
      {
        id: "po-1-famille-ambigue",
        question:
          "Quelles sont les familles chez ROCKWELL qui ont augmente par rapport au dernier fichier tarif ?",
        requires_clarification: true,
        expected_tools: [],
        expected_arguments: [],
        expected_result: null,
      },
      {
        id: "po-1-categorie-fabricant-explicite",
        question:
          "Quelles categories fabricant ROCKWELL ont une hausse de prix ?",
        requires_clarification: false,
        expected_tools: ["aggregate_diffs"],
        expected_arguments: [rockwellArguments],
        expected_result: rockwellAggregate,
      },
      {
        id: "po-2-famille-ambigue",
        question:
          "Quelles sont les familles de produit dont les remises ont baisse ?",
        requires_clarification: true,
        expected_tools: [],
        expected_arguments: [],
        expected_result: null,
      },
      {
        id: "po-2-famille-cir-explicite",
        question: "Quelles familles CIR ont une baisse de remise ?",
        requires_clarification: false,
        expected_tools: ["aggregate_diffs"],
        expected_arguments: [discountArguments],
        expected_result: discountAggregate,
      },
      {
        id: "po-3-resume-changements",
        question:
          "Tu peux me dire les changements par rapport au dernier fichier tarif ?",
        requires_clarification: false,
        expected_tools: ["get_diff_summary"],
        expected_arguments: [{ run_id: context.run_id }],
        expected_result: diffSummary,
      },
      {
        id: "po-4-correction-anomalies-segment",
        question: "Aide-moi a corriger les anomalies sur le fichier Segment.",
        requires_clarification: false,
        expected_tools: ["get_anomalies_summary"],
        expected_arguments: [{ import_id: context.import_id }],
        expected_result: anomalySummary,
      },
    ],
  });
};
