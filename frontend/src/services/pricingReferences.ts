import {
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  PRICING_REFERENCE_STORAGE_BUCKET,
  PRICING_REFERENCE_XLSX_MIME,
  pricingReferenceAnomaliesExportResponseSchema,
  pricingReferenceAnomaliesListResponseSchema,
  pricingReferenceAnomaliesSummaryResponseSchema,
  pricingReferenceClassificationListAllResponseSchema,
  pricingReferenceClassificationListResponseSchema,
  pricingReferenceDiagnoseResponseSchema,
  pricingReferenceDiffsComputeResponseSchema,
  pricingReferenceDiffsListResponseSchema,
  pricingReferenceDiffsSummaryResponseSchema,
  pricingReferenceHealthGetResponseSchema,
  pricingReferenceImportActivateResponseSchema,
  pricingReferenceImportAnalyzeResponseSchema,
  pricingReferenceImportAssistMappingResponseSchema,
  pricingReferenceImportConfirmMappingResponseSchema,
  pricingReferenceImportGetResponseSchema,
  pricingReferenceImportInspectResponseSchema,
  pricingReferenceImportsListResponseSchema,
  pricingReferenceImportsPrepareResponseSchema,
  pricingReferencePrepareFileSchema,
  pricingReferenceSegmentDetailResponseSchema,
  pricingReferenceSegmentsListResponseSchema,
  type PricingReferenceAnomaliesListInput,
  type PricingReferenceAnomaliesListResponse,
  type PricingReferenceAnomaliesExportInput,
  type PricingReferenceAnomaliesExportResponse,
  type PricingReferenceAnomaliesSummaryGetInput,
  type PricingReferenceAnomaliesSummaryResponse,
  type PricingReferenceClassificationListAllInput,
  type PricingReferenceClassificationListAllResponse,
  type PricingReferenceClassificationListInput,
  type PricingReferenceClassificationListResponse,
  type PricingReferenceDiagnoseInput,
  type PricingReferenceDiagnoseResponse,
  type PricingReferenceDiffsComputeInput,
  type PricingReferenceDiffsComputeResponse,
  type PricingReferenceDiffsListInput,
  type PricingReferenceDiffsListResponse,
  type PricingReferenceDiffsSummaryGetInput,
  type PricingReferenceDiffsSummaryResponse,
  type PricingReferenceHealthGetResponse,
  type PricingReferenceImportActivateInput,
  type PricingReferenceImportActivateResponse,
  type PricingReferenceImportAnalyzeResponse,
  type PricingReferenceImportAssistMappingInput,
  type PricingReferenceImportAssistMappingResponse,
  type PricingReferenceImportConfirmMappingInput,
  type PricingReferenceImportConfirmMappingResponse,
  type PricingReferenceImportInspectInput,
  type PricingReferenceImportInspectResponse,
  type PricingReferenceImportGetInput,
  type PricingReferenceImportGetResponse,
  type PricingReferenceFileKind,
  type PricingReferenceImportsListInput,
  type PricingReferenceImportsListResponse,
  type PricingReferenceImportsPrepareInput,
  type PricingReferenceImportsPrepareResponse,
  type PricingReferencePreparedFile,
  type PricingReferenceSegmentDetailInput,
  type PricingReferenceSegmentDetailResponse,
  type PricingReferenceSegmentsListInput,
  type PricingReferenceSegmentsListResponse
} from '../../../shared/schemas/pricing/references.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

type PricingReferenceFilePair = {
  classification?: File | null;
  segments_grids?: File | null;
};

export type PricingReferenceImportStep =
  | 'validating'
  | 'hashing'
  | 'preparing'
  | 'uploading'
  | 'inspecting'
  | 'confirming'
  | 'analyzing'
  | 'done';

export type PricingReferenceImportProgress = {
  step: PricingReferenceImportStep;
  label: string;
};

const parseResponse = <TResponse>(
  schema: { safeParse: (payload: unknown) => { success: true; data: TResponse } | { success: false; error: { message: string } } },
  payload: unknown
): TResponse => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Réponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

const assertBrowserFile = (file: File, label: string): void => {
  if (!file.name.trim().toLowerCase().endsWith('.xlsx')) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      message: `${label}: le fichier doit être au format .xlsx.`,
      source: 'validation'
    });
  }

  if (file.size <= 0) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      message: `${label}: le fichier est vide.`,
      source: 'validation'
    });
  }

  if (file.size > PRICING_REFERENCE_MAX_FILE_SIZE_BYTES) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_TOO_LARGE',
      message: `${label}: le fichier dépasse 50 MB.`,
      source: 'validation'
    });
  }
};

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const computeBrowserFileSha256 = async (file: File): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw createAppError({
      code: 'CONFIG_INVALID',
      message: 'Calcul SHA-256 indisponible dans ce navigateur.',
      source: 'client'
    });
  }

  return toHex(await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
};

const buildPrepareFileInput = async (file: File, label: string) => {
  assertBrowserFile(file, label);
  const input = {
    original_filename: file.name,
    size_bytes: file.size,
    sha256: await computeBrowserFileSha256(file),
    content_type: file.type.trim() === PRICING_REFERENCE_XLSX_MIME
      ? file.type.trim()
      : PRICING_REFERENCE_XLSX_MIME
  };

  const parsed = pricingReferencePrepareFileSchema.safeParse(input);
  if (!parsed.success) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      message: `${label}: fichier invalide.`,
      source: 'validation',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

export const uploadPricingReferencePreparedFile = async (
  preparedFile: PricingReferencePreparedFile,
  file: File
): Promise<void> => {
  if (!preparedFile.signed_upload_token) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_STORAGE_FAILED',
      message: 'Jeton upload Storage absent.',
      source: 'edge'
    });
  }

  const { error } = await requireSupabaseClient()
    .storage
    .from(preparedFile.storage_bucket)
    .uploadToSignedUrl(
      preparedFile.storage_path,
      preparedFile.signed_upload_token,
      file,
      {
        cacheControl: '3600',
        contentType: preparedFile.content_type ?? PRICING_REFERENCE_XLSX_MIME
      }
    );

  if (error) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_STORAGE_FAILED',
      message: `Impossible de televerser ${preparedFile.original_filename}.`,
      source: 'edge',
      details: error.message
    });
  }
};

export const listPricingReferenceImports = (input: PricingReferenceImportsListInput): Promise<PricingReferenceImportsListResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.list.query(input, options),
    (payload) => parseResponse(pricingReferenceImportsListResponseSchema, payload),
    'Impossible de charger les imports référentiels.'
  );

export const getPricingReferenceImport = (input: PricingReferenceImportGetInput): Promise<PricingReferenceImportGetResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.get.query(input, options),
    (payload) => parseResponse(pricingReferenceImportGetResponseSchema, payload),
    'Impossible de charger le détail de l import.'
  );

export const getPricingReferenceHealth = (input: { import_id?: string }): Promise<PricingReferenceHealthGetResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.health.get.query(input, options),
    (payload) => parseResponse(pricingReferenceHealthGetResponseSchema, payload),
    'Impossible de charger le rapport référentiel.'
  );

export const listPricingReferenceClassification = (
  input: PricingReferenceClassificationListInput
): Promise<PricingReferenceClassificationListResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.classification.list.query(input, options),
    (payload) => parseResponse(pricingReferenceClassificationListResponseSchema, payload),
    'Impossible de charger la classification CIR.'
  );

export const listPricingReferenceSegments = (
  input: PricingReferenceSegmentsListInput
): Promise<PricingReferenceSegmentsListResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.segments.list.query(input, options),
    (payload) => parseResponse(pricingReferenceSegmentsListResponseSchema, payload),
    'Impossible de charger les segments fabricant.'
  );

export const getPricingReferenceSegmentDetail = (
  input: PricingReferenceSegmentDetailInput
): Promise<PricingReferenceSegmentDetailResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.segments.get.query(input, options),
    (payload) => parseResponse(pricingReferenceSegmentDetailResponseSchema, payload),
    'Impossible de charger le détail du segment fabricant.'
  );

export const listPricingReferenceAnomalies = (
  input: PricingReferenceAnomaliesListInput
): Promise<PricingReferenceAnomaliesListResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.anomalies.list.query(input, options),
    (payload) => parseResponse(pricingReferenceAnomaliesListResponseSchema, payload),
    'Impossible de charger les anomalies referentielles.'
  );

export const getPricingReferenceAnomaliesSummary = (
  input: PricingReferenceAnomaliesSummaryGetInput
): Promise<PricingReferenceAnomaliesSummaryResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.anomalies.summary.query(input, options),
    (payload) => parseResponse(pricingReferenceAnomaliesSummaryResponseSchema, payload),
    'Impossible de charger la synthèse des anomalies.'
  );

export const exportPricingReferenceAnomalies = (
  input: PricingReferenceAnomaliesExportInput
): Promise<PricingReferenceAnomaliesExportResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.anomalies.export.mutate(input, options),
    (payload) => parseResponse(pricingReferenceAnomaliesExportResponseSchema, payload),
    'Impossible de générer l export des anomalies.'
  );

export const getPricingReferenceDiffSummary = (
  input: PricingReferenceDiffsSummaryGetInput
): Promise<PricingReferenceDiffsSummaryResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.diffs.summary.query(input, options),
    (payload) => parseResponse(pricingReferenceDiffsSummaryResponseSchema, payload),
    'Impossible de charger le résumé des changements référentiels.'
  );

export const listPricingReferenceDiffs = (
  input: PricingReferenceDiffsListInput
): Promise<PricingReferenceDiffsListResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.diffs.list.query(input, options),
    (payload) => parseResponse(pricingReferenceDiffsListResponseSchema, payload),
    'Impossible de charger la liste des changements référentiels.'
  );

export const computePricingReferenceDiff = (
  input: PricingReferenceDiffsComputeInput
): Promise<PricingReferenceDiffsComputeResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.diffs.compute.mutate(input, options),
    (payload) => parseResponse(pricingReferenceDiffsComputeResponseSchema, payload),
    'Impossible de calculer la comparaison des référentiels.'
  );

export const listAllPricingReferenceClassification = (
  input: PricingReferenceClassificationListAllInput
): Promise<PricingReferenceClassificationListAllResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.classification.listAll.query(input, options),
    (payload) => parseResponse(pricingReferenceClassificationListAllResponseSchema, payload),
    'Impossible de charger la classification complète.'
  );

export const diagnosePricingReference = (
  input: PricingReferenceDiagnoseInput
): Promise<PricingReferenceDiagnoseResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.diagnose.mutate(input, options),
    (payload) => parseResponse(pricingReferenceDiagnoseResponseSchema, payload),
    "Impossible d'exécuter le diagnostic IA."
  );


export const preparePricingReferenceImport = (input: PricingReferenceImportsPrepareInput): Promise<PricingReferenceImportsPrepareResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.prepare.mutate(input, options),
    (payload) => parseResponse(pricingReferenceImportsPrepareResponseSchema, payload),
    'Impossible de préparer l import référentiel.'
  );

export const inspectPricingReferenceImport = (
  input: PricingReferenceImportInspectInput
): Promise<PricingReferenceImportInspectResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.inspect.mutate(input, options),
    (payload) => parseResponse(pricingReferenceImportInspectResponseSchema, payload),
    'Impossible de prévisualiser le fichier référentiel.'
  );

export const assistPricingReferenceImportMapping = (
  input: PricingReferenceImportAssistMappingInput
): Promise<PricingReferenceImportAssistMappingResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.assistMapping.mutate(input, options),
    (payload) => parseResponse(pricingReferenceImportAssistMappingResponseSchema, payload),
    'Impossible de charger l assistance mapping.'
  );

export const confirmPricingReferenceImportMapping = (
  input: PricingReferenceImportConfirmMappingInput
): Promise<PricingReferenceImportConfirmMappingResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.confirmMapping.mutate(input, options),
    (payload) => parseResponse(pricingReferenceImportConfirmMappingResponseSchema, payload),
    'Impossible de confirmer le mapping des colonnes.'
  );

export const activatePricingReferenceImport = (
  input: PricingReferenceImportActivateInput
): Promise<PricingReferenceImportActivateResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.activate.mutate(input, options),
    (payload) => parseResponse(pricingReferenceImportActivateResponseSchema, payload),
    "Impossible d'activer cette version du référentiel."
  );

export const analyzePricingReferenceImport = (importId: string): Promise<PricingReferenceImportAnalyzeResponse> =>
  invokeTrpc(
    (api, options) => api.pricing.references.imports.analyze.mutate({ import_id: importId }, options),
    (payload) => parseResponse(pricingReferenceImportAnalyzeResponseSchema, payload),
    'Impossible d analyser l import référentiel.'
  );

export const prepareUploadAndInspectPricingReferenceFile = async (
  fileKind: PricingReferenceFileKind,
  file: File,
  sheetName?: string,
  onProgress?: (progress: PricingReferenceImportProgress) => void
): Promise<{
  import_id: string;
  prepared_file: PricingReferencePreparedFile;
  inspection: PricingReferenceImportInspectResponse;
}> => {
  const label = fileKind === 'classification' ? 'Classification CIR' : 'Segments fabricant';
  onProgress?.({ step: 'validating', label: 'Validation du fichier' });
  assertBrowserFile(file, label);

  onProgress?.({ step: 'hashing', label: 'Calcul de l empreinte SHA-256' });
  const input: PricingReferenceImportsPrepareInput = {
    files: {
      [fileKind]: await buildPrepareFileInput(file, label)
    }
  };

  onProgress?.({ step: 'preparing', label: 'Préparation Storage' });
  const prepared = await preparePricingReferenceImport(input);
  const preparedFile = prepared.files[fileKind];
  if (!preparedFile) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      message: 'Fichier préparé introuvable dans la réponse serveur.',
      source: 'edge'
    });
  }

  onProgress?.({ step: 'uploading', label: 'Televersement du fichier XLSX' });
  await uploadPricingReferencePreparedFile(preparedFile, file);

  onProgress?.({ step: 'inspecting', label: 'Prévisualisation des colonnes' });
  const inspection = await inspectPricingReferenceImport({
    import_id: prepared.import_id,
    file_id: preparedFile.id,
    file_kind: fileKind,
    ...(sheetName ? { sheet_name: sheetName } : {})
  });

  return {
    import_id: prepared.import_id,
    prepared_file: preparedFile,
    inspection
  };
};

export const runPricingReferenceImport = async (
  files: PricingReferenceFilePair,
  onProgress?: (progress: PricingReferenceImportProgress) => void
): Promise<PricingReferenceImportAnalyzeResponse> => {
  onProgress?.({ step: 'validating', label: 'Validation des fichiers' });
  if (!files.classification && !files.segments_grids) {
    throw createAppError({
      code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      message: 'Sélectionnez au moins un export CIR.',
      source: 'validation'
    });
  }
  if (files.classification) {
    assertBrowserFile(files.classification, 'Classification CIR');
  }
  if (files.segments_grids) {
    assertBrowserFile(files.segments_grids, 'Segments fabricant');
  }

  onProgress?.({ step: 'hashing', label: 'Calcul des empreintes SHA-256' });
  const input: PricingReferenceImportsPrepareInput = {
    files: {
      ...(files.classification
        ? { classification: await buildPrepareFileInput(files.classification, 'Classification CIR') }
        : {}),
      ...(files.segments_grids
        ? { segments_grids: await buildPrepareFileInput(files.segments_grids, 'Segments fabricant') }
        : {})
    }
  };

  onProgress?.({ step: 'preparing', label: 'Préparation Storage' });
  const prepared = await preparePricingReferenceImport(input);

  onProgress?.({ step: 'uploading', label: 'Televersement des exports XLSX' });
  const uploads: Array<Promise<void>> = [];
  if (prepared.files.classification && files.classification) {
    uploads.push(uploadPricingReferencePreparedFile(prepared.files.classification, files.classification));
  }
  if (prepared.files.segments_grids && files.segments_grids) {
    uploads.push(uploadPricingReferencePreparedFile(prepared.files.segments_grids, files.segments_grids));
  }
  await Promise.all(uploads);

  const preparedEntries = [
    prepared.files.classification ? { fileKind: 'classification' as const, preparedFile: prepared.files.classification } : null,
    prepared.files.segments_grids ? { fileKind: 'segments_grids' as const, preparedFile: prepared.files.segments_grids } : null
  ].filter((entry): entry is { fileKind: PricingReferenceFileKind; preparedFile: PricingReferencePreparedFile } => Boolean(entry));

  for (const entry of preparedEntries) {
    onProgress?.({ step: 'inspecting', label: `Previsualisation ${entry.preparedFile.original_filename}` });
    const inspection = await inspectPricingReferenceImport({
      import_id: prepared.import_id,
      file_id: entry.preparedFile.id,
      file_kind: entry.fileKind
    });

    if (inspection.mapping_status === 'invalide') {
      throw createAppError({
        code: 'PRICING_REFERENCE_MAPPING_REQUIRED',
        message: `Mapping incomplet pour ${entry.preparedFile.original_filename}.`,
        source: 'validation'
      });
    }

    onProgress?.({ step: 'confirming', label: `Confirmation mapping ${entry.preparedFile.original_filename}` });
    await confirmPricingReferenceImportMapping({
      import_id: prepared.import_id,
      file_id: entry.preparedFile.id,
      file_kind: entry.fileKind,
      sheet_name: inspection.sheet_name,
      column_mapping: inspection.proposed_mapping,
      save_as_default: false
    });
  }

  onProgress?.({ step: 'analyzing', label: 'Analyse des référentiels' });
  const response = await analyzePricingReferenceImport(prepared.import_id);

  onProgress?.({ step: 'done', label: 'Rapport prêt' });
  return response;
};

export const isPricingReferenceStorageBucket = (bucket: string): boolean =>
  bucket === PRICING_REFERENCE_STORAGE_BUCKET;
