import { z } from 'zod/v4';

export const PRICING_REFERENCE_STORAGE_BUCKET = 'pricing-reference-sources';
export const PRICING_REFERENCE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const PRICING_REFERENCE_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const nonEmptyStringSchema = (message: string) => z.string().trim().min(1, { error: message });
const uuidSchema = z.uuid({ error: 'Identifiant invalide.' });
const nullableStringSchema = z.string().nullable();
const optionalNullableStringSchema = z.string().trim().min(1, { error: 'Valeur invalide.' }).nullable().optional();
const jsonValueSchema: z.ZodType<unknown> = z.unknown();

export const pricingReferenceImportStatusSchema = z.enum([
  'brouillon',
  'analyse_en_cours',
  'analyse_ok',
  'analyse_erreur',
  'pret_activation',
  'rejete',
  'archive'
]);

export const pricingReferenceSnapshotStatusSchema = z.enum([
  'cree',
  'pret_activation',
  'actif',
  'archive'
]);

export const pricingReferenceFileKindSchema = z.enum(['classification', 'segments_grids']);
export const pricingReferenceAnomalySeveritySchema = z.enum(['bloquante', 'haute', 'moyenne', 'faible']);
export const pricingReferenceAnomalyStatusSchema = z.enum(['nouvelle', 'a_traiter', 'ignoree', 'resolue']);
export const pricingReferenceAnomalyTypeSchema = z.enum([
  'missing_column',
  'empty_file',
  'classification_duplicate_key',
  'classification_required_empty',
  'segment_identity_incomplete',
  'segment_classification_incomplete',
  'segment_classification_unknown',
  'segment_ambiguous_link',
  'purchase_grid_missing',
  'invalid_file',
  'parse_failed'
]);

export const pricingReferenceColumnSetSchema = z.strictObject({
  expected: z.array(nonEmptyStringSchema('Colonne attendue requise.')),
  detected: z.array(nonEmptyStringSchema('Colonne detectee requise.')),
  missing: z.array(nonEmptyStringSchema('Colonne manquante requise.'))
});

export const pricingReferenceSourceFileHealthSchema = z.strictObject({
  file_kind: pricingReferenceFileKindSchema,
  original_filename: nonEmptyStringSchema('Nom de fichier requis.'),
  storage_path: nullableStringSchema.optional(),
  sha256: nonEmptyStringSchema('Hash fichier requis.'),
  size_bytes: z.number().int().nonnegative(),
  sheet_name: nullableStringSchema,
  rows_count: z.number().int().nonnegative(),
  columns_count: z.number().int().nonnegative(),
  columns: pricingReferenceColumnSetSchema
});

export const pricingReferenceClassificationCountersSchema = z.strictObject({
  rows_count: z.number().int().nonnegative(),
  columns_count: z.number().int().nonnegative(),
  unique_cir_keys: z.number().int().nonnegative(),
  duplicate_cir_keys: z.number().int().nonnegative(),
  mandatory_empty_rows: z.number().int().nonnegative()
});

export const pricingReferenceSegmentsCountersSchema = z.strictObject({
  rows_count: z.number().int().nonnegative(),
  columns_count: z.number().int().nonnegative(),
  unique_segment_identities: z.number().int().nonnegative(),
  identity_incomplete_rows: z.number().int().nonnegative(),
  classification_incomplete_rows: z.number().int().nonnegative(),
  cir_keys_not_validated_rows: z.number().int().nonnegative(),
  purchase_grid_missing_rows: z.number().int().nonnegative()
});

export const pricingReferenceAnomalySummarySchema = z.strictObject({
  total: z.number().int().nonnegative(),
  bloquante: z.number().int().nonnegative(),
  haute: z.number().int().nonnegative(),
  moyenne: z.number().int().nonnegative(),
  faible: z.number().int().nonnegative()
});

export const pricingReferenceAnomalySampleSchema = z.strictObject({
  type: pricingReferenceAnomalyTypeSchema,
  severity: pricingReferenceAnomalySeveritySchema,
  file_kind: pricingReferenceFileKindSchema.nullable(),
  source_row_number: z.number().int().positive().nullable(),
  columns: z.array(nonEmptyStringSchema('Colonne anomalie requise.')),
  message: nonEmptyStringSchema('Message anomalie requis.'),
  details: z.record(z.string(), jsonValueSchema).optional()
});

export const pricingReferenceHealthReportSchema = z.strictObject({
  generated_at: nonEmptyStringSchema('Date de rapport requise.'),
  storage: z.strictObject({
    bucket: z.literal(PRICING_REFERENCE_STORAGE_BUCKET),
    max_file_size_bytes: z.literal(PRICING_REFERENCE_MAX_FILE_SIZE_BYTES),
    allowed_extensions: z.array(z.literal('.xlsx'))
  }),
  files: z.strictObject({
    classification: pricingReferenceSourceFileHealthSchema,
    segments_grids: pricingReferenceSourceFileHealthSchema
  }),
  classification: pricingReferenceClassificationCountersSchema,
  segments_grids: pricingReferenceSegmentsCountersSchema,
  anomalies: pricingReferenceAnomalySummarySchema,
  anomaly_samples: z.array(pricingReferenceAnomalySampleSchema)
});

const xlsxFilenameSchema = nonEmptyStringSchema('Nom de fichier requis.').refine(
  (value) => value.toLowerCase().endsWith('.xlsx'),
  { error: 'Le fichier doit etre au format .xlsx.' }
);

export const pricingReferencePrepareFileSchema = z.strictObject({
  original_filename: xlsxFilenameSchema,
  size_bytes: z.number().int().positive({ error: 'Taille fichier invalide.' })
    .max(PRICING_REFERENCE_MAX_FILE_SIZE_BYTES, { error: 'Le fichier depasse 50 MB.' }),
  sha256: z.string().trim().regex(/^[a-f0-9]{64}$/i, { error: 'Hash SHA-256 invalide.' }),
  content_type: z.string().trim().min(1).nullable().optional()
});

export const pricingReferenceImportsPrepareInputSchema = z.strictObject({
  files: z.strictObject({
    classification: pricingReferencePrepareFileSchema,
    segments_grids: pricingReferencePrepareFileSchema
  })
});

export const pricingReferenceImportAnalyzeInputSchema = z.strictObject({
  import_id: uuidSchema
});

export const pricingReferenceHealthGetInputSchema = z.strictObject({
  import_id: uuidSchema.optional()
});

export const pricingReferencePaginationSchema = z.strictObject({
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(50)
});

export const pricingReferenceImportsListInputSchema = pricingReferencePaginationSchema.extend({
  status: pricingReferenceImportStatusSchema.optional()
});

export const pricingReferenceImportGetInputSchema = z.strictObject({
  import_id: uuidSchema
});

export const pricingReferenceRowsListInputSchema = pricingReferencePaginationSchema.extend({
  import_id: uuidSchema.optional(),
  snapshot_id: uuidSchema.optional(),
  search: z.string().trim().max(120).optional()
});

export const pricingReferenceAnomaliesListInputSchema = pricingReferenceRowsListInputSchema.extend({
  severity: pricingReferenceAnomalySeveritySchema.optional(),
  status: pricingReferenceAnomalyStatusSchema.optional(),
  type: pricingReferenceAnomalyTypeSchema.optional()
});

export const pricingReferencePreparedFileSchema = z.strictObject({
  id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  original_filename: nonEmptyStringSchema('Nom de fichier requis.'),
  storage_bucket: z.literal(PRICING_REFERENCE_STORAGE_BUCKET),
  storage_path: nonEmptyStringSchema('Chemin Storage requis.'),
  size_bytes: z.number().int().positive(),
  sha256: nonEmptyStringSchema('Hash fichier requis.'),
  content_type: nullableStringSchema,
  signed_upload_url: nonEmptyStringSchema('URL signee requise.'),
  signed_upload_token: nonEmptyStringSchema('Jeton upload requis.').nullable(),
  signed_upload_expires_in_seconds: z.number().int().positive()
});

export const pricingReferenceImportSummarySchema = z.strictObject({
  id: uuidSchema,
  status: pricingReferenceImportStatusSchema,
  created_by: nullableStringSchema,
  analyzed_by: nullableStringSchema,
  created_at: nonEmptyStringSchema('Date de creation requise.'),
  updated_at: nonEmptyStringSchema('Date de mise a jour requise.'),
  analysis_started_at: nullableStringSchema,
  analysis_completed_at: nullableStringSchema,
  error_code: nullableStringSchema,
  error_message: nullableStringSchema,
  classification_rows_count: z.number().int().nonnegative().nullable(),
  segments_rows_count: z.number().int().nonnegative().nullable(),
  anomalies_total: z.number().int().nonnegative().nullable()
});

export const pricingReferenceImportFileSchema = z.strictObject({
  id: uuidSchema,
  import_id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  original_filename: nonEmptyStringSchema('Nom de fichier requis.'),
  storage_bucket: z.literal(PRICING_REFERENCE_STORAGE_BUCKET),
  storage_path: nonEmptyStringSchema('Chemin Storage requis.'),
  size_bytes: z.number().int().positive(),
  sha256: nonEmptyStringSchema('Hash fichier requis.'),
  content_type: nullableStringSchema,
  sheet_name: nullableStringSchema,
  detected_columns: z.array(z.string()),
  row_count: z.number().int().nonnegative().nullable(),
  created_at: nonEmptyStringSchema('Date de creation requise.')
});

export const pricingReferenceImportDetailSchema = pricingReferenceImportSummarySchema.extend({
  files: z.array(pricingReferenceImportFileSchema),
  health_report: pricingReferenceHealthReportSchema.nullable()
});

export const pricingReferenceClassificationRowSchema = z.strictObject({
  id: uuidSchema,
  snapshot_id: uuidSchema,
  import_id: uuidSchema,
  source_row_number: z.number().int().positive(),
  cir_key: nonEmptyStringSchema('Cle CIR requise.'),
  mega: nonEmptyStringSchema('Mega famille requise.'),
  fam: nonEmptyStringSchema('Famille requise.'),
  sfa: nonEmptyStringSchema('Sous-famille requise.'),
  mega_lib: nonEmptyStringSchema('Libelle mega famille requis.'),
  fam_lib: nonEmptyStringSchema('Libelle famille requis.'),
  sfa_lib: nonEmptyStringSchema('Libelle sous-famille requis.')
});

export const pricingReferenceSegmentRowSchema = z.strictObject({
  id: uuidSchema,
  snapshot_id: uuidSchema,
  import_id: uuidSchema,
  source_row_number: z.number().int().positive(),
  segment_key: nonEmptyStringSchema('Cle segment requise.'),
  segment: nonEmptyStringSchema('Segment requis.'),
  idnumerique: nonEmptyStringSchema('Identifiant numerique requis.'),
  marque: nonEmptyStringSchema('Marque requise.'),
  cat_fab: nonEmptyStringSchema('Categorie fabricant requise.'),
  cat_fab_l: nullableStringSchema,
  strategiq: nullableStringSchema,
  codif_fair: nullableStringSchema,
  tarif_fab: nullableStringSchema,
  cir_key: nullableStringSchema,
  link_status: nullableStringSchema,
  purchase_grid_rows_count: z.number().int().nonnegative()
});

export const pricingReferenceAnomalyRowSchema = z.strictObject({
  id: uuidSchema,
  import_id: uuidSchema,
  snapshot_id: uuidSchema.nullable(),
  source_file_id: uuidSchema.nullable(),
  source_row_number: z.number().int().positive().nullable(),
  type: pricingReferenceAnomalyTypeSchema,
  severity: pricingReferenceAnomalySeveritySchema,
  status: pricingReferenceAnomalyStatusSchema,
  object_type: optionalNullableStringSchema,
  object_id: optionalNullableStringSchema,
  columns: z.array(z.string()),
  message: nonEmptyStringSchema('Message anomalie requis.'),
  details: z.record(z.string(), jsonValueSchema),
  created_at: nonEmptyStringSchema('Date de creation requise.')
});

const apiSuccessSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional()
});

export const pricingReferenceImportsPrepareResponseSchema = apiSuccessSchema.extend({
  import_id: uuidSchema,
  status: pricingReferenceImportStatusSchema,
  files: z.strictObject({
    classification: pricingReferencePreparedFileSchema,
    segments_grids: pricingReferencePreparedFileSchema
  })
});

export const pricingReferenceImportAnalyzeResponseSchema = apiSuccessSchema.extend({
  import_id: uuidSchema,
  snapshot_id: uuidSchema,
  status: pricingReferenceImportStatusSchema,
  health_report: pricingReferenceHealthReportSchema
});

export const pricingReferenceImportsListResponseSchema = apiSuccessSchema.extend({
  imports: z.array(pricingReferenceImportSummarySchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export const pricingReferenceImportGetResponseSchema = apiSuccessSchema.extend({
  import: pricingReferenceImportDetailSchema
});

export const pricingReferenceHealthGetResponseSchema = apiSuccessSchema.extend({
  health_report: pricingReferenceHealthReportSchema.nullable()
});

export const pricingReferenceClassificationListResponseSchema = apiSuccessSchema.extend({
  rows: z.array(pricingReferenceClassificationRowSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export const pricingReferenceSegmentsListResponseSchema = apiSuccessSchema.extend({
  rows: z.array(pricingReferenceSegmentRowSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export const pricingReferenceAnomaliesListResponseSchema = apiSuccessSchema.extend({
  rows: z.array(pricingReferenceAnomalyRowSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export type PricingReferenceFileKind = z.infer<typeof pricingReferenceFileKindSchema>;
export type PricingReferenceAnomalySeverity = z.infer<typeof pricingReferenceAnomalySeveritySchema>;
export type PricingReferenceAnomalyStatus = z.infer<typeof pricingReferenceAnomalyStatusSchema>;
export type PricingReferenceAnomalyType = z.infer<typeof pricingReferenceAnomalyTypeSchema>;
export type PricingReferenceHealthReport = z.infer<typeof pricingReferenceHealthReportSchema>;
export type PricingReferenceAnomalySample = z.infer<typeof pricingReferenceAnomalySampleSchema>;
export type PricingReferenceImportsPrepareInput = z.infer<typeof pricingReferenceImportsPrepareInputSchema>;
export type PricingReferenceImportAnalyzeInput = z.infer<typeof pricingReferenceImportAnalyzeInputSchema>;
export type PricingReferenceImportsListInput = z.infer<typeof pricingReferenceImportsListInputSchema>;
export type PricingReferenceImportGetInput = z.infer<typeof pricingReferenceImportGetInputSchema>;
export type PricingReferenceRowsListInput = z.infer<typeof pricingReferenceRowsListInputSchema>;
export type PricingReferenceAnomaliesListInput = z.infer<typeof pricingReferenceAnomaliesListInputSchema>;
export type PricingReferenceImportsPrepareResponse = z.infer<typeof pricingReferenceImportsPrepareResponseSchema>;
export type PricingReferenceImportAnalyzeResponse = z.infer<typeof pricingReferenceImportAnalyzeResponseSchema>;
export type PricingReferenceImportsListResponse = z.infer<typeof pricingReferenceImportsListResponseSchema>;
export type PricingReferenceImportGetResponse = z.infer<typeof pricingReferenceImportGetResponseSchema>;
export type PricingReferenceHealthGetResponse = z.infer<typeof pricingReferenceHealthGetResponseSchema>;
export type PricingReferenceClassificationListResponse = z.infer<typeof pricingReferenceClassificationListResponseSchema>;
export type PricingReferenceSegmentsListResponse = z.infer<typeof pricingReferenceSegmentsListResponseSchema>;
export type PricingReferenceAnomaliesListResponse = z.infer<typeof pricingReferenceAnomaliesListResponseSchema>;
