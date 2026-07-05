import { z } from 'zod/v4';
import {
  aiDiagnosisCacheSchema,
  aiDiagnosisCostSchema,
  aiDiagnosisResultSchema,
  aiDiagnosisUsageSchema
} from '../ai.schema.ts';

export const PRICING_REFERENCE_STORAGE_BUCKET = 'pricing-reference-sources';
export const PRICING_REFERENCE_ANOMALY_DEFAULT_MARQUE = 'Général';
export const PRICING_REFERENCE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const PRICING_REFERENCE_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PRICING_REFERENCE_CLASSIFICATION_COLUMNS = [
  'MEGA',
  'FAM',
  'SFA',
  'MEGA_LIB',
  'FAM_LIB',
  'SFA_LIB'
] as const;
export const PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS = [
  'SEGMENT',
  'IDNUMERIQUE',
  'MARQUE',
  'CAT_FAB',
  'CAT_FAB_L',
  'STRATEGIQ',
  'CODIF_FAIR',
  'TARIF_FAB',
  'NUM_FOUR',
  'REMISE_HA',
  'COL_HA',
  'PRIORITE',
  'TYPE_GRILL',
  'DATE_DEBUT',
  'DATE_FIN',
  'BORNE_ACHA',
  'COEF_RETRO',
  'MEGA_FAMILLE',
  'FAMILLE',
  'SOUS_FAMILLE',
  'MEGA_LIBELLE',
  'FAMILLE_LIBELLE',
  'SFAM_LIBELLE',
  'COEF_HA',
  'COEF_MAJVTE'
] as const;
export const PRICING_REFERENCE_CANONICAL_COLUMNS = [
  ...PRICING_REFERENCE_CLASSIFICATION_COLUMNS,
  ...PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS
] as const;

const nonEmptyStringSchema = (message: string) => z.string().trim().min(1, { error: message });
const uuidSchema = z.uuid({ error: 'Identifiant invalide.' });
const nullableStringSchema = z.string().nullable();
const optionalNullableStringSchema = z.string().trim().min(1, { error: 'Valeur invalide.' }).nullable().optional();
const jsonValueSchema: z.ZodType<unknown> = z.unknown();
const canonicalColumnSet = new Set<string>(PRICING_REFERENCE_CANONICAL_COLUMNS);

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
export const pricingReferenceImportMappingStatusSchema = z.enum([
  'non_configure',
  'auto',
  'a_confirmer',
  'confirme',
  'invalide'
]);
export const pricingReferenceColumnMappingCandidateStatusSchema = z.enum([
  'auto',
  'alias',
  'a_confirmer',
  'manuel',
  'manquant'
]);
export const pricingReferenceAnomalySeveritySchema = z.enum(['bloquante', 'haute', 'moyenne', 'faible']);
export const pricingReferenceLinkStatusSchema = z.enum([
  'complete_valid',
  'missing',
  'partial',
  'unknown_key',
  'ambiguous'
]);
export const pricingReferenceSortDirectionSchema = z.enum(['asc', 'desc']);
export const pricingReferenceClassificationSortBySchema = z.enum([
  'cir_key',
  'mega',
  'fam',
  'sfa',
  'source_row_number'
]);
export const pricingReferenceSegmentsSortBySchema = z.enum([
  'marque',
  'cat_fab',
  'segment',
  'idnumerique',
  'link_status',
  'purchase_grid_rows_count',
  'source_row_number'
]);
export const pricingReferenceAnomaliesSortBySchema = z.enum([
  'created_at',
  'severity',
  'type',
  'source_row_number'
]);
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

export const pricingReferenceAnomalyTypeLabels = {
  missing_column: 'Colonne obligatoire absente',
  empty_file: 'Fichier vide',
  classification_duplicate_key: 'Cle CIR dupliquee',
  classification_required_empty: 'Champ classification vide',
  segment_identity_incomplete: 'Identite segment incomplete',
  segment_classification_incomplete: 'Classification segment incomplete',
  segment_classification_unknown: 'Cle CIR inconnue',
  segment_ambiguous_link: 'Liaison ambigue',
  purchase_grid_missing: 'Grille achat incomplete',
  invalid_file: 'Fichier invalide',
  parse_failed: 'Valeur illisible'
} as const satisfies Record<z.infer<typeof pricingReferenceAnomalyTypeSchema>, string>;

export const pricingReferenceAnomalyTypeActionLabels = {
  missing_column: 'Ajouter ou mapper la colonne obligatoire dans le fichier source.',
  empty_file: 'Verifier que l onglet Excel contient les lignes attendues.',
  classification_duplicate_key: 'Corriger la cle CIR dupliquee dans la classification source.',
  classification_required_empty: 'Completer les champs classification obligatoires dans Excel.',
  segment_identity_incomplete: 'Completer SEGMENT, IDNUMERIQUE, MARQUE ou CAT_FAB dans le fichier source.',
  segment_classification_incomplete: 'Completer la classification CIR du segment dans le fichier source.',
  segment_classification_unknown: 'Corriger la cle CIR ou importer la classification correspondante.',
  segment_ambiguous_link: 'Departager la liaison segment vers une seule cle CIR exploitable.',
  purchase_grid_missing: 'Completer les champs de grille achat structurels dans le fichier source.',
  invalid_file: 'Remplacer le fichier par un export Excel valide.',
  parse_failed: 'Corriger la valeur brute dans la colonne indiquee.'
} as const satisfies Record<z.infer<typeof pricingReferenceAnomalyTypeSchema>, string>;

export const pricingReferenceAnomalySeverityLabels = {
  bloquante: 'Bloquante',
  haute: 'Haute',
  moyenne: 'Moyenne',
  faible: 'Faible'
} as const satisfies Record<z.infer<typeof pricingReferenceAnomalySeveritySchema>, string>;

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

export const pricingReferencePrepareFilesSchema = z.strictObject({
  classification: pricingReferencePrepareFileSchema.optional(),
  segments_grids: pricingReferencePrepareFileSchema.optional()
}).refine(
  (files) => Boolean(files.classification || files.segments_grids),
  { error: 'Au moins un fichier referentiel CIR est requis.' }
);

export const pricingReferenceImportsPrepareInputSchema = z.strictObject({
  files: pricingReferencePrepareFilesSchema
});

export const pricingReferenceImportAnalyzeInputSchema = z.strictObject({
  import_id: uuidSchema
});

export const pricingReferenceColumnMappingSchema = z.record(
  z.string().trim().min(1, { error: 'Champ canonique requis.' }),
  nonEmptyStringSchema('Colonne source requise.')
).superRefine((mapping, context) => {
  Object.keys(mapping).forEach((key) => {
    if (!canonicalColumnSet.has(key)) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: `Champ canonique inconnu: ${key}.`
      });
    }
  });
});

export const pricingReferenceColumnAliasesSchema = z.record(
  z.string().trim().min(1, { error: 'Champ canonique requis.' }),
  z.array(nonEmptyStringSchema('Alias colonne requis.')).max(60)
).superRefine((aliases, context) => {
  Object.keys(aliases).forEach((key) => {
    if (!canonicalColumnSet.has(key)) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: `Champ canonique inconnu: ${key}.`
      });
    }
  });
});

export const pricingReferenceColumnMappingCandidateSchema = z.strictObject({
  canonical_column: nonEmptyStringSchema('Champ canonique requis.'),
  source_column: nullableStringSchema,
  status: pricingReferenceColumnMappingCandidateStatusSchema,
  confidence: z.number().min(0).max(1),
  reason: nonEmptyStringSchema('Raison de mapping requise.')
});

export const pricingReferenceColumnMappingProfileSchema = z.strictObject({
  id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  name: nonEmptyStringSchema('Nom du profil requis.'),
  column_mapping: pricingReferenceColumnMappingSchema,
  aliases: pricingReferenceColumnAliasesSchema,
  is_default: z.boolean(),
  created_by: nullableStringSchema,
  updated_by: nullableStringSchema,
  created_at: nonEmptyStringSchema('Date de creation requise.'),
  updated_at: nonEmptyStringSchema('Date de mise a jour requise.')
});

export const pricingReferenceImportInspectInputSchema = z.strictObject({
  import_id: uuidSchema,
  file_id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  sheet_name: z.string().trim().min(1, { error: 'Nom onglet requis.' }).optional()
});

export const pricingReferenceImportAssistMappingInputSchema = pricingReferenceImportInspectInputSchema;

export const pricingReferenceImportConfirmMappingInputSchema = z.strictObject({
  import_id: uuidSchema,
  file_id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  sheet_name: z.string().trim().min(1, { error: 'Nom onglet requis.' }),
  column_mapping: pricingReferenceColumnMappingSchema,
  save_as_default: z.boolean().default(false)
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

export const pricingReferenceClassificationListInputSchema = pricingReferenceRowsListInputSchema.extend({
  filters: z.strictObject({
    mega: z.string().trim().max(40).optional(),
    fam: z.string().trim().max(40).optional()
  }).optional(),
  sort_by: pricingReferenceClassificationSortBySchema.default('mega'),
  sort_direction: pricingReferenceSortDirectionSchema.default('asc')
});

export const pricingReferenceSegmentsListInputSchema = pricingReferenceRowsListInputSchema.extend({
  filters: z.strictObject({
    marque: z.string().trim().max(80).optional(),
    cat_fab: z.string().trim().max(80).optional(),
    link_status: pricingReferenceLinkStatusSchema.optional()
  }).optional(),
  sort_by: pricingReferenceSegmentsSortBySchema.default('marque'),
  sort_direction: pricingReferenceSortDirectionSchema.default('asc')
});

const pricingReferenceAnomaliesFiltersSchema = z.strictObject({
  import_id: uuidSchema.optional(),
  snapshot_id: uuidSchema.optional(),
  search: z.string().trim().max(120).optional(),
  severities: z.array(pricingReferenceAnomalySeveritySchema)
    .max(20, { error: 'Maximum 20 severites.' })
    .optional(),
  types: z.array(pricingReferenceAnomalyTypeSchema)
    .max(20, { error: 'Maximum 20 types.' })
    .optional(),
  marques: z.array(z.string().trim().min(1, { error: 'Marque requise.' }).max(120))
    .max(20, { error: 'Maximum 20 marques.' })
    .optional()
});

export const pricingReferenceAnomaliesListInputSchema = pricingReferenceRowsListInputSchema.extend({
  severities: pricingReferenceAnomaliesFiltersSchema.shape.severities,
  types: pricingReferenceAnomaliesFiltersSchema.shape.types,
  marques: pricingReferenceAnomaliesFiltersSchema.shape.marques,
  sort_by: pricingReferenceAnomaliesSortBySchema.default('created_at'),
  sort_direction: pricingReferenceSortDirectionSchema.default('desc')
});

export const pricingReferenceAnomaliesSummaryGetInputSchema = pricingReferenceAnomaliesFiltersSchema;

export const pricingReferenceAnomaliesExportInputSchema = pricingReferenceAnomaliesFiltersSchema;

export const pricingReferenceClassificationListAllInputSchema = z.strictObject({
  import_id: uuidSchema.optional(),
  snapshot_id: uuidSchema.optional()
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
  mapping_profile_id: uuidSchema.nullable().optional(),
  column_mapping: pricingReferenceColumnMappingSchema.optional(),
  mapping_status: pricingReferenceImportMappingStatusSchema.optional(),
  mapping_confirmed_by: uuidSchema.nullable().optional(),
  mapping_confirmed_at: nullableStringSchema.optional(),
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
  link_status: pricingReferenceLinkStatusSchema.nullable(),
  purchase_grid_rows_count: z.number().int().nonnegative()
});

export const pricingReferenceAnomalyRowSchema = z.strictObject({
  id: uuidSchema,
  import_id: uuidSchema,
  snapshot_id: uuidSchema.nullable(),
  source_file_id: uuidSchema.nullable(),
  source_file: z.strictObject({
    file_kind: pricingReferenceFileKindSchema,
    original_filename: nonEmptyStringSchema('Nom de fichier requis.')
  }).nullable().optional(),
  source_row_number: z.number().int().positive().nullable(),
  type: pricingReferenceAnomalyTypeSchema,
  severity: pricingReferenceAnomalySeveritySchema,
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

export const pricingReferencePreparedFilesSchema = z.strictObject({
  classification: pricingReferencePreparedFileSchema.optional(),
  segments_grids: pricingReferencePreparedFileSchema.optional()
}).refine(
  (files) => Boolean(files.classification || files.segments_grids),
  { error: 'Au moins un fichier prepare est requis.' }
);

export const pricingReferenceImportsPrepareResponseSchema = apiSuccessSchema.extend({
  import_id: uuidSchema,
  status: pricingReferenceImportStatusSchema,
  files: pricingReferencePreparedFilesSchema
});

export const pricingReferenceImportAnalyzeResponseSchema = apiSuccessSchema.extend({
  import_id: uuidSchema,
  snapshot_id: uuidSchema,
  status: pricingReferenceImportStatusSchema,
  health_report: pricingReferenceHealthReportSchema
});

export const pricingReferenceImportInspectResponseSchema = apiSuccessSchema.extend({
  import_id: uuidSchema,
  file_id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  original_filename: nonEmptyStringSchema('Nom de fichier requis.'),
  sheet_name: nonEmptyStringSchema('Nom onglet requis.'),
  worksheets: z.array(nonEmptyStringSchema('Nom onglet requis.')).min(1),
  expected_columns: z.array(nonEmptyStringSchema('Colonne attendue requise.')).min(1),
  detected_columns: z.array(nonEmptyStringSchema('Colonne detectee requise.')),
  row_count: z.number().int().nonnegative(),
  sample_rows: z.array(z.record(z.string(), z.string())),
  candidates: z.array(pricingReferenceColumnMappingCandidateSchema),
  proposed_mapping: pricingReferenceColumnMappingSchema,
  mapping_status: pricingReferenceImportMappingStatusSchema,
  default_profile: pricingReferenceColumnMappingProfileSchema.nullable()
});

export const pricingReferenceImportConfirmMappingResponseSchema = apiSuccessSchema.extend({
  import_id: uuidSchema,
  file_id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  mapping_status: z.literal('confirme'),
  column_mapping: pricingReferenceColumnMappingSchema,
  saved_profile: pricingReferenceColumnMappingProfileSchema.nullable()
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

export const pricingReferenceAnomaliesSummaryGroupByTypeSchema = z.strictObject({
  type: pricingReferenceAnomalyTypeSchema,
  label: nonEmptyStringSchema('Libelle type requis.'),
  action_label: nonEmptyStringSchema('Action anomalie requise.').nullable(),
  count: z.number().int().nonnegative(),
  max_severity: pricingReferenceAnomalySeveritySchema
});

export const pricingReferenceAnomaliesFacetSchema = z.strictObject({
  value: nonEmptyStringSchema('Valeur facette requise.'),
  label: nonEmptyStringSchema('Libelle facette requis.'),
  count: z.number().int().nonnegative(),
  max_severity: pricingReferenceAnomalySeveritySchema.nullable()
});

export const pricingReferenceAnomaliesSummaryResponseSchema = apiSuccessSchema.extend({
  total: z.number().int().nonnegative(),
  groups_by_type: z.array(pricingReferenceAnomaliesSummaryGroupByTypeSchema),
  facets: z.strictObject({
    severities: z.array(pricingReferenceAnomaliesFacetSchema),
    types: z.array(pricingReferenceAnomaliesFacetSchema),
    marques: z.array(pricingReferenceAnomaliesFacetSchema)
  })
});

export const pricingReferenceAnomaliesExportResponseSchema = apiSuccessSchema.extend({
  request_id: nonEmptyStringSchema('Identifiant requete requis.'),
  download_url: nonEmptyStringSchema('URL signee requise.'),
  expires_at: nonEmptyStringSchema('Date expiration requise.'),
  filename: nonEmptyStringSchema('Nom export requis.'),
  row_count: z.number().int().nonnegative()
});

export const pricingReferenceClassificationListAllResponseSchema = apiSuccessSchema.extend({
  rows: z.array(pricingReferenceClassificationRowSchema),
  total: z.number().int().nonnegative(),
  truncated: z.boolean()
});

export const pricingReferenceImportAssistMappingResponseSchema = apiSuccessSchema.extend({
  import_id: uuidSchema,
  file_id: uuidSchema,
  file_kind: pricingReferenceFileKindSchema,
  sheet_name: nonEmptyStringSchema('Nom onglet requis.'),
  mapping_status: pricingReferenceImportMappingStatusSchema,
  ai_needed: z.boolean(),
  human_validation_required: z.literal(true),
  worksheet_score: z.number().min(0).max(1),
  header_quality: z.number().min(0).max(1),
  expected_columns: z.array(nonEmptyStringSchema('Colonne attendue requise.')).min(1),
  detected_columns: z.array(nonEmptyStringSchema('Colonne detectee requise.')),
  candidates: z.array(pricingReferenceColumnMappingCandidateSchema),
  proposed_mapping: pricingReferenceColumnMappingSchema,
  evidence: z.array(nonEmptyStringSchema('Preuve mapping requise.')).min(1),
  ai_policy: z.strictObject({
    trigger: z.enum(['not_needed', 'ambiguous_or_invalid_only']),
    response_schema: z.literal('strict_mapping_candidate'),
    can_confirm_mapping: z.literal(false)
  })
});

export type PricingReferenceFileKind = z.infer<typeof pricingReferenceFileKindSchema>;
export type PricingReferenceImportStatus = z.infer<typeof pricingReferenceImportStatusSchema>;
export type PricingReferenceImportMappingStatus = z.infer<typeof pricingReferenceImportMappingStatusSchema>;
export type PricingReferenceColumnMappingCandidateStatus = z.infer<typeof pricingReferenceColumnMappingCandidateStatusSchema>;
export type PricingReferenceAnomalySeverity = z.infer<typeof pricingReferenceAnomalySeveritySchema>;
export type PricingReferenceAnomalyType = z.infer<typeof pricingReferenceAnomalyTypeSchema>;
export type PricingReferenceLinkStatus = z.infer<typeof pricingReferenceLinkStatusSchema>;
export type PricingReferenceSortDirection = z.infer<typeof pricingReferenceSortDirectionSchema>;
export type PricingReferenceClassificationSortBy = z.infer<typeof pricingReferenceClassificationSortBySchema>;
export type PricingReferenceSegmentsSortBy = z.infer<typeof pricingReferenceSegmentsSortBySchema>;
export type PricingReferenceAnomaliesSortBy = z.infer<typeof pricingReferenceAnomaliesSortBySchema>;
export type PricingReferenceHealthReport = z.infer<typeof pricingReferenceHealthReportSchema>;
export type PricingReferenceAnomalySample = z.infer<typeof pricingReferenceAnomalySampleSchema>;
export type PricingReferenceImportsPrepareInput = z.infer<typeof pricingReferenceImportsPrepareInputSchema>;
export type PricingReferenceImportAnalyzeInput = z.infer<typeof pricingReferenceImportAnalyzeInputSchema>;
export type PricingReferenceImportInspectInput = z.infer<typeof pricingReferenceImportInspectInputSchema>;
export type PricingReferenceImportAssistMappingInput = z.infer<typeof pricingReferenceImportAssistMappingInputSchema>;
export type PricingReferenceImportConfirmMappingInput = z.infer<typeof pricingReferenceImportConfirmMappingInputSchema>;
export type PricingReferenceImportsListInput = z.infer<typeof pricingReferenceImportsListInputSchema>;
export type PricingReferenceImportGetInput = z.infer<typeof pricingReferenceImportGetInputSchema>;
export type PricingReferenceRowsListInput = z.infer<typeof pricingReferenceRowsListInputSchema>;
export type PricingReferenceClassificationListInput = z.infer<typeof pricingReferenceClassificationListInputSchema>;
export type PricingReferenceSegmentsListInput = z.infer<typeof pricingReferenceSegmentsListInputSchema>;
export type PricingReferenceAnomaliesListInput = z.infer<typeof pricingReferenceAnomaliesListInputSchema>;
export type PricingReferenceAnomaliesSummaryGetInput = z.infer<typeof pricingReferenceAnomaliesSummaryGetInputSchema>;
export type PricingReferenceAnomaliesExportInput = z.infer<typeof pricingReferenceAnomaliesExportInputSchema>;
export type PricingReferenceClassificationListAllInput = z.infer<typeof pricingReferenceClassificationListAllInputSchema>;
export type PricingReferencePreparedFile = z.infer<typeof pricingReferencePreparedFileSchema>;
export type PricingReferenceImportsPrepareResponse = z.infer<typeof pricingReferenceImportsPrepareResponseSchema>;
export type PricingReferenceImportAnalyzeResponse = z.infer<typeof pricingReferenceImportAnalyzeResponseSchema>;
export type PricingReferenceImportInspectResponse = z.infer<typeof pricingReferenceImportInspectResponseSchema>;
export type PricingReferenceImportConfirmMappingResponse = z.infer<typeof pricingReferenceImportConfirmMappingResponseSchema>;
export type PricingReferenceImportsListResponse = z.infer<typeof pricingReferenceImportsListResponseSchema>;
export type PricingReferenceImportGetResponse = z.infer<typeof pricingReferenceImportGetResponseSchema>;
export type PricingReferenceHealthGetResponse = z.infer<typeof pricingReferenceHealthGetResponseSchema>;
export type PricingReferenceClassificationListResponse = z.infer<typeof pricingReferenceClassificationListResponseSchema>;
export type PricingReferenceSegmentsListResponse = z.infer<typeof pricingReferenceSegmentsListResponseSchema>;
export type PricingReferenceAnomaliesListResponse = z.infer<typeof pricingReferenceAnomaliesListResponseSchema>;
export type PricingReferenceAnomaliesSummaryGroupByType = z.infer<typeof pricingReferenceAnomaliesSummaryGroupByTypeSchema>;
export type PricingReferenceAnomaliesFacet = z.infer<typeof pricingReferenceAnomaliesFacetSchema>;
export type PricingReferenceAnomaliesSummaryResponse = z.infer<typeof pricingReferenceAnomaliesSummaryResponseSchema>;
export type PricingReferenceAnomaliesExportResponse = z.infer<typeof pricingReferenceAnomaliesExportResponseSchema>;
export type PricingReferenceClassificationListAllResponse = z.infer<typeof pricingReferenceClassificationListAllResponseSchema>;
export type PricingReferenceImportAssistMappingResponse = z.infer<typeof pricingReferenceImportAssistMappingResponseSchema>;
export type PricingReferenceColumnMapping = z.infer<typeof pricingReferenceColumnMappingSchema>;
export type PricingReferenceColumnAliases = z.infer<typeof pricingReferenceColumnAliasesSchema>;
export type PricingReferenceColumnMappingCandidate = z.infer<typeof pricingReferenceColumnMappingCandidateSchema>;
export type PricingReferenceColumnMappingProfile = z.infer<typeof pricingReferenceColumnMappingProfileSchema>;

export const pricingReferenceDiagnoseInputSchema = z.strictObject({
  import_id: uuidSchema.optional(),
  file_type: pricingReferenceFileKindSchema,
  prompt_version_id: uuidSchema.optional(),
  model_config_id: uuidSchema.optional()
});

export const pricingReferenceDiagnoseResponseSchema = z.strictObject({
  ok: z.literal(true),
  ai_available: z.boolean(),
  result: aiDiagnosisResultSchema.nullable(),
  usage: aiDiagnosisUsageSchema.nullable(),
  cost: aiDiagnosisCostSchema.nullable(),
  cache: aiDiagnosisCacheSchema,
  fallback_reason: z.string().trim().min(1).nullable().optional()
});

export type PricingReferenceDiagnoseInput = z.infer<typeof pricingReferenceDiagnoseInputSchema>;
export type PricingReferenceDiagnoseResponse = z.infer<typeof pricingReferenceDiagnoseResponseSchema>;
