import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  ArrowRight,
  Info
} from 'lucide-react';

import {
  PRICING_REFERENCE_CLASSIFICATION_COLUMNS,
  PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS,
  type PricingReferenceColumnMapping,
  type PricingReferenceColumnMappingCandidate,
  type PricingReferenceFileKind,
  type PricingReferenceImportAnalyzeResponse,
  type PricingReferenceImportInspectResponse
} from '../../../../shared/schemas/pricing/references.schema';

import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/feedback/Dialog';
import { cn } from '@/lib/utils';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { createAppError } from '@/services/errors/AppError';
import {
  analyzePricingReferenceImport,
  confirmPricingReferenceImportMapping,
  inspectPricingReferenceImport,
  prepareUploadAndInspectPricingReferenceFile,
  type PricingReferenceImportProgress
} from '@/services/pricingReferences';
import { invalidatePricingReferenceQueries } from '@/services/query/queryInvalidation';
import type { UserRole } from '@/types';
import {
  aggregateDiffTypeCountsByFileGroup,
  diffFileGroupLabels,
  diffTypeDotClassName
} from './components/changes/changes-utils';
import { useAnalyzedPricingReferenceImports } from './components/changes/use-analyzed-imports';
import { isMissingDiffRunError, usePricingReferenceDiffSummary } from './components/changes/use-diff-summary';
import { ActivationConfirm } from './components/imports/activation-confirm';
import { useActivatePricingReferenceVersion } from './components/imports/use-activate-version';
import { diffTypeLabels } from './utils/pricing-references-formatters';

const importAssistantConfigs: Record<PricingReferenceFileKind, {
  label: string;
  shortLabel: string;
  description: string;
  inputId: string;
  expectedColumns: readonly string[];
}> = {
  classification: {
    label: 'Classification produit CIR',
    shortLabel: 'Classification produit',
    description: 'Codes MEGA/FAM/SFA et libellés produit CIR.',
    inputId: 'pricing-reference-classification-file-dialog',
    expectedColumns: PRICING_REFERENCE_CLASSIFICATION_COLUMNS
  },
  segments_grids: {
    label: 'Segments et grilles fabricant',
    shortLabel: 'Segments et grilles',
    description: 'Segments fabricant, liaisons classification et grilles achat.',
    inputId: 'pricing-reference-segments-file-dialog',
    expectedColumns: PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS
  }
};

const mappingStatusLabels: Record<PricingReferenceColumnMappingCandidate['status'], string> = {
  auto: 'Auto',
  alias: 'Alias',
  a_confirmer: 'À confirmer',
  manuel: 'Manuel',
  manquant: 'Manquant'
};

const numberFormatter = new Intl.NumberFormat('fr-FR');

/**
 * Format count to readable string
 * @param value - count number or null/undefined
 * @returns formatted string
 */
const formatCount = (value: number | null | undefined): string =>
  typeof value === 'number' ? numberFormatter.format(value) : '-';

/**
 * Get mapping badge variant based on mapping status
 * @param status - Candidate mapping status
 * @returns Badge variant string
 */
const getMappingBadgeVariant = (
  status: PricingReferenceColumnMappingCandidate['status']
): 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' => {
  if (status === 'auto' || status === 'alias') return 'success';
  if (status === 'manuel') return 'secondary';
  if (status === 'a_confirmer') return 'warning';
  return 'destructive';
};

/**
 * Determine candidate mapping status
 * @param candidate - Candidate details
 * @param mappedColumn - Target mapped column name
 * @returns Mapping status
 */
const getCandidateStatus = (
  candidate: PricingReferenceColumnMappingCandidate | undefined,
  mappedColumn: string | undefined
): PricingReferenceColumnMappingCandidate['status'] => {
  if (!mappedColumn) return 'manquant';
  if (!candidate?.source_column) return 'manuel';
  return candidate.source_column === mappedColumn ? candidate.status : 'manuel';
};

/**
 * Checks if all expected columns are mapped
 * @param expectedColumns - List of columns that must be mapped
 * @param mapping - Current column mapping
 * @returns True if all columns are mapped
 */
const isMappingComplete = (
  expectedColumns: readonly string[],
  mapping: PricingReferenceColumnMapping
): boolean => expectedColumns.every((column) => Boolean(mapping[column]));

type FileDropZoneProps = {
  id: string;
  label: string;
  file: File | null;
  disabled: boolean;
  onFileChange: (file: File | null) => void;
};

/**
 * Drag and drop zone component for selecting Excel files
 *
 * @param props - Component props
 * @returns File Drop Zone JSX
 */
const FileDropZone = ({
  id,
  label,
  file,
  disabled,
  onFileChange
}: FileDropZoneProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    onFileChange(event.dataTransfer.files.item(0));
  };

  return (
    <div
      className={cn(
        'min-w-0 border-2 border-dashed rounded-lg p-6 transition-colors duration-200 text-center',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted bg-background hover:bg-muted/[0.15]'
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onFileChange(event.target.files?.item(0) ?? null)}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <label htmlFor={id} className="block cursor-pointer text-sm font-semibold text-foreground hover:text-primary">
            {label}
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Glissez-déposez le fichier XLSX ici ou cliquez pour parcourir.
          </p>
          {file ? (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-2 text-xs font-mono text-foreground" title={file.name}>
              <FileSpreadsheet className="size-3.5 text-success" aria-hidden="true" />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <span className="text-muted-foreground">({formatCount(file.size)} o)</span>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Sélectionner un fichier
        </Button>
      </div>
    </div>
  );
};

/**
 * Mini-résumé des changements de l'analyse qui vient d'aboutir : compteurs
 * ventilés PAR FICHIER SOURCE (classification produit CIR vs segments & grilles
 * fabricant, jamais mélangés) × type de changement (dots D7) issus du run de
 * diff automatique, cas premier import et « aucun changement » traités, alertes
 * de déviation non bloquantes.
 *
 * @param props - Component props
 * @returns Analysis changes summary JSX
 */
const AnalysisChangesSummary = ({ snapshotId }: { snapshotId: string }) => {
  const summaryQuery = usePricingReferenceDiffSummary({ target_snapshot_id: snapshotId });

  useEffect(() => {
    if (summaryQuery.error && !isMissingDiffRunError(summaryQuery.error)) {
      handleUiError(summaryQuery.error, 'Impossible de charger le résumé des changements référentiels.', {
        feature: 'pricing.references.import.diffSummary'
      });
    }
  }, [summaryQuery.error]);

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-2 py-1" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-3.5 w-2/3 animate-pulse rounded bg-stone-100" />
        ))}
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        {isMissingDiffRunError(summaryQuery.error)
          ? 'Comparaison non calculée pour cette analyse. L’onglet Changements permet de la calculer.'
          : 'Le résumé des changements n’a pas pu être chargé. Le détail reste disponible dans l’onglet Changements.'}
      </p>
    );
  }

  const summary = summaryQuery.data;
  if (!summary) return null;

  if (summary.initial_import) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">Première version de référence</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Aucun historique de comparaison n&apos;existe encore :{' '}
          {formatCount(summary.snapshot_counters.target.classifications)} classifications,{' '}
          {formatCount(summary.snapshot_counters.target.segments)} segments et{' '}
          {formatCount(summary.snapshot_counters.target.grilles)} grilles importés.
        </p>
      </div>
    );
  }

  if (summary.total === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Aucun changement par rapport à la version de référence.
      </p>
    );
  }

  const fileGroups = aggregateDiffTypeCountsByFileGroup(summary);

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-foreground">
        {formatCount(summary.total)} changement{summary.total > 1 ? 's' : ''} par rapport à la
        version de référence
      </p>
      {fileGroups.map((group) => (
        <div key={group.fileGroup} className="space-y-1">
          <p className="text-[11px] font-medium text-stone-600">
            {diffFileGroupLabels[group.fileGroup]}
          </p>
          <ul className="space-y-1">
            {group.cells.map((cell) => (
              <li key={cell.diff_type} className="flex items-center gap-1.5 text-xs text-stone-700">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    diffTypeDotClassName[cell.diff_type]
                  )}
                  aria-hidden="true"
                />
                {diffTypeLabels[cell.diff_type]}
                <span className="ml-auto font-mono text-[11px] tabular-nums text-stone-500">
                  {formatCount(cell.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {summary.financial_changes_count > 0 ? (
        <p className="text-[11px] leading-relaxed text-stone-500">
          dont{' '}
          <span className="font-mono tabular-nums">
            {formatCount(summary.financial_changes_count)}
          </span>{' '}
          sur les colonnes financières (remise_ha, coef_retro, coef_ha, coef_majvte).
        </p>
      ) : null}
      {summary.deviation_alerts.map((alert) => (
        <p
          key={alert.object_type}
          className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-800"
        >
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          {alert.message}
        </p>
      ))}
    </div>
  );
};

type ImportAssistantState = {
  file: File | null;
  importId: string | null;
  fileId: string | null;
  inspection: PricingReferenceImportInspectResponse | null;
  mapping: PricingReferenceColumnMapping;
  saveAsDefault: boolean;
  progress: PricingReferenceImportProgress | null;
};

const emptyImportAssistantState = (): ImportAssistantState => ({
  file: null,
  importId: null,
  fileId: null,
  inspection: null,
  mapping: {},
  saveAsDefault: true,
  progress: null
});

interface PricingReferenceImportDialogProps {
  fileKind: PricingReferenceFileKind;
  userRole: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (importId: string) => void;
  /** Bascule la page sur l'onglet Changements scopé sur l'import analysé. */
  onViewChanges: (importId: string) => void;
}

const wizardStepItems: Array<{ id: 'file' | 'mapping' | 'analyze' | 'done'; label: string }> = [
  { id: 'file', label: 'Sélection fichier' },
  { id: 'mapping', label: 'Mapping colonnes' },
  { id: 'analyze', label: 'Lancement analyse' },
  { id: 'done', label: 'Résumé & activation' }
];

/**
 * PricingReferenceImportDialog Component
 *
 * Renders a dialog wizard to import pricing reference files, ending on a
 * post-analysis summary screen (diff mini-summary, « Voir les changements »,
 * « Activer cette version » réservée super_admin).
 *
 * @param props - Component props
 * @returns Pricing Reference Import Dialog JSX
 */
export const PricingReferenceImportDialog = ({
  fileKind,
  userRole,
  open,
  onOpenChange,
  onImported,
  onViewChanges
}: PricingReferenceImportDialogProps) => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ImportAssistantState>(emptyImportAssistantState());
  const [wizardStep, setWizardStep] = useState<'file' | 'mapping' | 'analyze' | 'done'>('file');
  const [analysisResult, setAnalysisResult] = useState<PricingReferenceImportAnalyzeResponse | null>(null);
  const [isConfirmingActivation, setIsConfirmingActivation] = useState(false);

  const config = importAssistantConfigs[fileKind];
  const { imports: analyzedImports } = useAnalyzedPricingReferenceImports();

  const candidateByColumn = useMemo(() => {
    const entries = state.inspection?.candidates.map((candidate) => [candidate.canonical_column, candidate] as const) ?? [];
    return new Map(entries);
  }, [state.inspection]);

  const mappingComplete = isMappingComplete(config.expectedColumns, state.mapping);
  const missingColumns = config.expectedColumns.filter((column) => !state.mapping[column]);

  const resetState = useCallback((file: File | null) => {
    setState({
      ...emptyImportAssistantState(),
      file,
      saveAsDefault: state.saveAsDefault
    });
    setWizardStep('file');
    setAnalysisResult(null);
    setIsConfirmingActivation(false);
  }, [state.saveAsDefault]);

  const closeAndReset = useCallback(() => {
    onOpenChange(false);
    resetState(null);
  }, [onOpenChange, resetState]);

  const activateMutation = useActivatePricingReferenceVersion(() => {
    setIsConfirmingActivation(false);
    closeAndReset();
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!state.file) {
        throw createAppError({
          code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
          message: 'Sélectionnez un fichier XLSX avant la prévisualisation.',
          source: 'validation'
        });
      }
      return prepareUploadAndInspectPricingReferenceFile(fileKind, state.file, undefined, (progress) => {
        setState((current) => ({ ...current, progress }));
      });
    },
    onSuccess: ({ import_id, prepared_file, inspection }) => {
      setState((current) => ({
        ...current,
        importId: import_id,
        fileId: prepared_file.id,
        inspection,
        mapping: inspection.proposed_mapping,
        progress: { step: 'inspecting', label: 'Prévisualisation prête' }
      }));
      setWizardStep('mapping');
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de prévisualiser le fichier CIR.', {
        feature: 'pricing.references.import.inspect',
        file_kind: fileKind
      });
      setState((current) => ({ ...current, progress: null }));
    }
  });

  const reinspectMutation = useMutation({
    mutationFn: async (sheetName: string) => {
      if (!state.importId || !state.fileId) {
        throw createAppError({
          code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
          message: 'Prévisualisez le fichier avant de changer d\'onglet.',
          source: 'validation'
        });
      }
      setState((current) => ({ ...current, progress: { step: 'inspecting', label: `Lecture onglet ${sheetName}` } }));
      return inspectPricingReferenceImport({
        import_id: state.importId,
        file_id: state.fileId,
        file_kind: fileKind,
        sheet_name: sheetName
      });
    },
    onSuccess: (inspection) => {
      setState((current) => ({
        ...current,
        inspection,
        mapping: inspection.proposed_mapping,
        progress: { step: 'inspecting', label: 'Onglet prévisualisé' }
      }));
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de lire cet onglet Excel.', {
        feature: 'pricing.references.import.sheet',
        file_kind: fileKind
      });
      setState((current) => ({ ...current, progress: null }));
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!state.importId || !state.fileId || !state.inspection) {
        throw createAppError({
          code: 'PRICING_REFERENCE_MAPPING_REQUIRED',
          message: 'Prévisualisez le fichier avant de confirmer le mapping.',
          source: 'validation'
        });
      }
      if (!mappingComplete) {
        throw createAppError({
          code: 'PRICING_REFERENCE_MAPPING_REQUIRED',
          message: 'Toutes les colonnes obligatoires doivent être mappées avant confirmation.',
          source: 'validation'
        });
      }
      setState((current) => ({ ...current, progress: { step: 'confirming', label: 'Confirmation du mapping' } }));
      return confirmPricingReferenceImportMapping({
        import_id: state.importId,
        file_id: state.fileId,
        file_kind: fileKind,
        sheet_name: state.inspection.sheet_name,
        column_mapping: state.mapping,
        save_as_default: state.saveAsDefault
      });
    },
    onSuccess: () => {
      setState((current) => ({
        ...current,
        progress: { step: 'confirming', label: 'Mapping confirmé' }
      }));
      notifySuccess('Mapping des colonnes confirmé.');
      setWizardStep('analyze');
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de confirmer le mapping des colonnes.', {
        feature: 'pricing.references.import.confirmMapping',
        file_kind: fileKind
      });
      setState((current) => ({ ...current, progress: null }));
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!state.importId) {
        throw createAppError({
          code: 'PRICING_REFERENCE_IMPORT_INVALID_FILE',
          message: 'Aucun import prêt à analyser.',
          source: 'validation'
        });
      }
      setState((current) => ({ ...current, progress: { step: 'analyzing', label: 'Analyse du référentiel' } }));
      return analyzePricingReferenceImport(state.importId);
    },
    onSuccess: async (response) => {
      notifySuccess('Import référentiel analysé.');
      onImported(response.import_id);
      setState((current) => ({ ...current, progress: null }));
      setAnalysisResult(response);
      setWizardStep('done');
      await invalidatePricingReferenceQueries(queryClient);
    },
    onError: (error) => {
      handleUiError(error, 'Impossible d\'analyser l\'import référentiel.', {
        feature: 'pricing.references.import.analyze',
        file_kind: fileKind
      });
      setState((current) => ({ ...current, progress: null }));
    }
  });

  const isBusy =
    previewMutation.isPending
    || reinspectMutation.isPending
    || confirmMutation.isPending
    || analyzeMutation.isPending
    || activateMutation.isPending;

  const analyzedTargetRow = analysisResult
    ? analyzedImports.find((row) => row.id === analysisResult.import_id) ?? null
    : null;
  const activeVersionRow = analyzedImports.find((row) => row.is_active_version) ?? null;

  const previewColumns = state.inspection?.detected_columns.slice(0, 6) ?? [];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!isBusy) {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetState(null);
        }
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b border-border pb-3 shrink-0">
          <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            Importer : {config.label}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Suivez les étapes ci-dessous pour intégrer les données.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper progress indicator */}
        <div className="flex flex-wrap items-center justify-center gap-2 py-3 border-b border-border bg-surface-1 shrink-0">
          {wizardStepItems.map((step, position) => (
            <Fragment key={step.id}>
              {position > 0 ? (
                <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              ) : null}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold border",
                  wizardStep === step.id ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"
                )}>{position + 1}</span>
                <span className={cn("text-xs font-medium", wizardStep === step.id ? "text-foreground font-semibold" : "text-muted-foreground")}>{step.label}</span>
              </div>
            </Fragment>
          ))}
        </div>

        {/* Progress Alert */}
        {state.progress && (
          <div className="mt-3 px-3 py-2 rounded border border-info/20 bg-info/5 text-info text-xs flex items-center gap-2 shrink-0">
            {isBusy ? <RefreshCw className="size-3.5 animate-spin" /> : <Info className="size-3.5" />}
            <span className="font-semibold">{state.progress.label}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          {wizardStep === 'file' && (
            <div className="space-y-4 max-w-lg mx-auto py-4">
              <FileDropZone
                id={config.inputId}
                label={config.label}
                file={state.file}
                disabled={isBusy}
                onFileChange={resetState}
              />
              <div className="border border-border/60 bg-surface-1 p-4 rounded-md">
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Contenu attendu</h4>
                <p className="mt-1 text-sm font-semibold text-foreground">{config.description}</p>
                <div className="mt-3">
                  <span className="text-[11px] text-muted-foreground block mb-1">Colonnes obligatoires :</span>
                  <div className="flex flex-wrap gap-1.5">
                    {config.expectedColumns.map((col) => (
                      <code key={col} className="bg-background border border-border px-1.5 py-0.5 rounded text-[11px] font-mono">{col}</code>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isBusy}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy || !state.file}
                  onClick={() => previewMutation.mutate()}
                >
                  {previewMutation.isPending && <RefreshCw className="size-3.5 animate-spin mr-1.5" />}
                  Prévisualiser
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 'mapping' && state.inspection && (
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem] h-full min-h-0">
              <div className="min-w-0 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3 border border-border bg-surface-1 p-3 rounded-md shrink-0">
                  <div className="min-w-0 space-y-1">
                    <label htmlFor={`${config.inputId}-sheet-dialog`} className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Onglet Excel sélectionné
                    </label>
                    <select
                      id={`${config.inputId}-sheet-dialog`}
                      className="h-8 rounded border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                      value={state.inspection.sheet_name}
                      disabled={isBusy || state.inspection.worksheets.length <= 1}
                      onChange={(event) => reinspectMutation.mutate(event.target.value)}
                    >
                      {state.inspection.worksheets.map((sheet) => (
                        <option key={sheet} value={sheet}>{sheet}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-muted-foreground self-end pb-1 font-medium">
                    {formatCount(state.inspection.row_count)} lignes détectées · {formatCount(state.inspection.detected_columns.length)} colonnes
                  </div>
                </div>

                {/* Sample data preview table */}
                <div className="flex-1 min-h-0 flex flex-col border border-border rounded-md overflow-hidden bg-background">
                  <div className="bg-surface-1 px-3 py-2 border-b border-border flex justify-between items-center shrink-0">
                    <span className="text-xs font-semibold text-foreground">Aperçu des données importées</span>
                    <Badge variant={missingColumns.length === 0 ? 'success' : 'destructive'}>
                      {missingColumns.length === 0 ? 'Mapping complet' : `${missingColumns.length} colonne(s) manquante(s)`}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="min-w-full border-collapse text-left text-xs">
                      <thead className="bg-surface-2 text-muted-foreground sticky top-0">
                        <tr>
                          {previewColumns.map((column) => (
                            <th key={column} className="border-b border-r border-border/60 px-2.5 py-2 font-semibold last:border-r-0 whitespace-nowrap">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {state.inspection.sample_rows.slice(0, 5).map((row, idx) => (
                          <tr key={`dialog-sample-${idx}`} className="border-b border-border/50 hover:bg-muted/10 last:border-b-0">
                            {previewColumns.map((column) => (
                              <td key={column} className="max-w-44 truncate border-r border-border/50 px-2.5 py-2 last:border-r-0 font-mono text-[11px]" title={row[column] ?? ''}>
                                {row[column] ?? '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar with mappings */}
              <aside className="border border-border bg-surface-1 p-3 rounded-md flex flex-col h-full overflow-hidden">
                <div className="mb-3 flex items-start justify-between gap-2 shrink-0">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block">
                      Association des colonnes
                    </span>
                    <span className="text-sm font-medium text-foreground">{config.shortLabel}</span>
                  </div>
                  <Badge variant={mappingComplete ? 'success' : 'warning'}>
                    {mappingComplete ? 'Prêt' : 'Incomplet'}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 border border-border/60 bg-background p-2 rounded">
                  {config.expectedColumns.map((column) => {
                    const candidate = candidateByColumn.get(column);
                    const mappedColumn = state.mapping[column];
                    const status = getCandidateStatus(candidate, mappedColumn);
                    return (
                      <div key={column} className="flex flex-col gap-1.5 pb-2 border-b border-border/40 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-foreground">{column}</span>
                          <Badge variant={getMappingBadgeVariant(status)} className="text-[11px] px-1.5 py-0 h-5">
                            {mappingStatusLabels[status]}
                          </Badge>
                        </div>
                        <select
                          aria-label={`Colonne source pour ${column}`}
                          className="h-8 w-full border border-input rounded bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                          value={mappedColumn ?? ''}
                          disabled={isBusy}
                          onChange={(event) => setState((current) => ({
                            ...current,
                            mapping: {
                              ...current.mapping,
                              [column]: event.target.value
                            }
                          }))}
                        >
                          <option value="">Non mappée</option>
                          {state.inspection?.detected_columns.map((detectedColumn) => (
                            <option key={`${column}-${detectedColumn}`} value={detectedColumn}>
                              {detectedColumn}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          {candidate?.reason ?? 'Sélection manuelle requise.'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 shrink-0 space-y-2">
                  <label className="flex items-center gap-2 border border-border bg-background px-2.5 py-1.5 rounded text-[11px] font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-border"
                      checked={state.saveAsDefault}
                      disabled={isBusy}
                      onChange={(event) => setState((current) => ({
                        ...current,
                        saveAsDefault: event.target.checked
                      }))}
                    />
                    Mémoriser ce mapping
                  </label>
                  {missingColumns.length > 0 && (
                    <div className="flex gap-1.5 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[10px] items-start">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                      <span>Colonnes obligatoires non mappees: {missingColumns.join(', ')}.</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setWizardStep('file')}
                      disabled={isBusy}
                    >
                      Retour
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      disabled={isBusy || !mappingComplete}
                      onClick={() => confirmMutation.mutate()}
                    >
                      {confirmMutation.isPending && <RefreshCw className="size-3.5 animate-spin mr-1" />}
                      Confirmer le mapping
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {wizardStep === 'analyze' && (
            <div className="max-w-md mx-auto py-8 text-center space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Mapping validé avec succès !</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Le fichier est prêt à être analysé par le backend pour générer le référentiel et calculer les anomalies.
                </p>
              </div>

              <div className="border border-border bg-surface-1 p-4 rounded text-left space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">Récapitulatif</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">Fichier :</span>
                  <span className="font-medium text-foreground truncate">{state.file?.name}</span>
                  <span className="text-muted-foreground">Type :</span>
                  <span className="font-medium text-foreground">{config.shortLabel}</span>
                  <span className="text-muted-foreground">Onglet Excel :</span>
                  <span className="font-medium text-foreground">{state.inspection?.sheet_name}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep('mapping')}
                  disabled={isBusy}
                >
                  Retour au mapping
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy || !state.importId}
                  onClick={() => analyzeMutation.mutate()}
                >
                  {analyzeMutation.isPending && <RefreshCw className="size-3.5 animate-spin mr-1.5" />}
                  Analyser l import
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 'done' && analysisResult && (
            <div className="max-w-md mx-auto py-8 space-y-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-8" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Analyse terminée</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Vérifiez les changements par rapport à la version de référence avant
                  d&apos;activer cette version.
                </p>
              </div>

              <div className="border border-border bg-surface-1 p-4 rounded text-left space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  Changements détectés
                </h4>
                <AnalysisChangesSummary snapshotId={analysisResult.snapshot_id} />
              </div>

              {isConfirmingActivation ? (
                <ActivationConfirm
                  className="border-t border-border pt-4 text-left"
                  targetCreatedAt={analyzedTargetRow?.created_at ?? null}
                  activeVersionCreatedAt={activeVersionRow?.created_at ?? null}
                  isRollback={false}
                  isPending={activateMutation.isPending}
                  onConfirm={() => activateMutation.mutate(analysisResult.import_id)}
                  onCancel={() => setIsConfirmingActivation(false)}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeAndReset}
                    disabled={isBusy}
                  >
                    Fermer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      onViewChanges(analysisResult.import_id);
                      closeAndReset();
                    }}
                  >
                    Voir les changements
                  </Button>
                  {userRole === 'super_admin' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => setIsConfirmingActivation(true)}
                    >
                      Activer cette version
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
