import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheck, GitCompareArrows, History, Search, X } from 'lucide-react';

import type {
  PricingReferenceAnomalySeverity,
  PricingReferenceDiffObjectType,
  PricingReferenceDiffType,
  PricingReferenceDiffsComputeInput,
  PricingReferenceDiffsListInput
} from '../../../../../../shared/schemas/pricing/references.schema';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { useDebouncedValue } from '@/hooks/utils/useDebouncedValue';
import { handleUiError } from '@/services/errors/handleUiError';
import { computePricingReferenceDiff, listPricingReferenceDiffs } from '@/services/pricingReferences';
import {
  pricingReferenceDiffListKey,
  pricingReferenceDiffListRootKey,
  pricingReferenceDiffSummaryRootKey
} from '@/services/query/queryKeys';
import type { UserRole } from '@/types';
import {
  diffTypeLabels,
  formatCount,
  formatDateTime,
  severityLabels
} from '../../utils/pricing-references-formatters';
import { anomalySeverityDotClassName } from '../anomalies/anomaly-utils';
import { FacetedFilter, type FacetedFilterOption } from '../anomalies/faceted-filter';
import { SegmentedControl } from '../inputs/segmented-control';
import {
  DIFF_FILE_SCOPE_ORDER,
  aggregateDiffSeverityCounts,
  aggregateDiffTypeCounts,
  columnBelongsToFileScope,
  diffFileGroupLabels,
  diffTypeDotClassName,
  getFileScopeObjectTypes,
  listDistinctFileVersions,
  resolveDefaultScopedTargetImportId,
  sortDiffChangedColumnSummaries,
  toDiffDisplayValue,
  type PricingReferenceDiffFileScope
} from './changes-utils';
import { ChangesGroup } from './changes-group';
import { ChangesSummary } from './changes-summary';
import { VersionSelectors } from './version-selectors';
import { useAnalyzedPricingReferenceImports } from './use-analyzed-imports';
import { isMissingDiffRunError, usePricingReferenceDiffSummary } from './use-diff-summary';
import { usePricingReferenceImportSnapshotId } from './use-import-snapshot-id';
import { usePricingReferenceSnapshotImportId } from './use-snapshot-import-id';

interface ChangesTriageProps {
  userRole: UserRole;
  selectedImportId?: string | null;
}

const GROUP_PAGE_SIZE = 100;

interface CenteredStateProps {
  icon: 'compare' | 'history' | 'check' | 'error';
  title: string;
  description: string;
  children?: React.ReactNode;
}

const stateIconClassName: Record<CenteredStateProps['icon'], string> = {
  compare: 'bg-surface-3 text-stone-600',
  history: 'bg-surface-3 text-stone-600',
  check: 'bg-emerald-50 text-emerald-700',
  error: 'bg-red-50 text-red-700'
};

const CenteredState = ({ icon, title, description, children }: CenteredStateProps) => {
  const Icon =
    icon === 'compare'
      ? GitCompareArrows
      : icon === 'history'
        ? History
        : icon === 'check'
          ? CircleCheck
          : AlertTriangle;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className={`grid size-10 place-items-center rounded-md ${stateIconClassName[icon]}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-semibold text-stone-950">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </div>
  );
};

/**
 * Onglet Changements : comparaison de deux versions d'UN fichier référentiel à
 * la fois (classification produit CIR OU segments & grilles fabricant, jamais
 * mélangés). Sélecteur de périmètre, sélecteurs base/cible ne listant que les
 * versions distinctes du fichier courant, bandeau résumé des impacts scopé,
 * liste groupée par type d'objet avec facettes, recherche et pagination serveur
 * par groupe, dialog avant/après. Le calcul d'un couple arbitraire est réservé
 * au super admin.
 */
export const ChangesTriage = ({ userRole, selectedImportId }: ChangesTriageProps) => {
  // Périmètre par défaut : les segments & grilles portent les changements
  // financiers (remise_ha, coef_retro…), cas d'usage principal du diff. La
  // classification est à un clic via le sélecteur de périmètre.
  const [fileScope, setFileScope] = useState<PricingReferenceDiffFileScope>('segments_grids');
  const [targetOverrideId, setTargetOverrideId] = useState<string | null>(null);
  const [baseSelection, setBaseSelection] = useState('auto');
  const [search, setSearch] = useState('');
  const [diffTypes, setDiffTypes] = useState<PricingReferenceDiffType[]>([]);
  const [severities, setSeverities] = useState<PricingReferenceAnomalySeverity[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [marques, setMarques] = useState<string[]>([]);
  const [openTypes, setOpenTypes] = useState<ReadonlySet<string> | null>(null);
  const [groupPages, setGroupPages] = useState<
    Partial<Record<PricingReferenceDiffObjectType, number>>
  >({});

  const debouncedSearch = useDebouncedValue(search);
  const queryClient = useQueryClient();
  const canCompute = userRole === 'super_admin';

  const analyzedImports = useAnalyzedPricingReferenceImports();
  const fileVersions = useMemo(
    () => listDistinctFileVersions(analyzedImports.imports, fileScope),
    [analyzedImports.imports, fileScope]
  );
  const defaultTargetId = resolveDefaultScopedTargetImportId(
    fileVersions,
    analyzedImports.imports,
    fileScope,
    selectedImportId ?? null
  );
  const targetImportId = targetOverrideId ?? defaultTargetId;
  const targetSnapshot = usePricingReferenceImportSnapshotId(targetImportId);
  const baseImportId = baseSelection === 'auto' ? null : baseSelection;
  const baseSnapshot = usePricingReferenceImportSnapshotId(baseImportId);

  const summaryInput = useMemo(() => {
    if (!targetSnapshot.snapshotId) return null;
    if (baseSelection === 'auto') {
      return { target_snapshot_id: targetSnapshot.snapshotId };
    }
    if (!baseSnapshot.snapshotId) return null;
    return {
      target_snapshot_id: targetSnapshot.snapshotId,
      base_snapshot_id: baseSnapshot.snapshotId
    };
  }, [targetSnapshot.snapshotId, baseSelection, baseSnapshot.snapshotId]);

  const summaryQuery = usePricingReferenceDiffSummary(summaryInput);
  const summary = summaryQuery.data ?? null;
  const isRunMissing = summaryQuery.isError && isMissingDiffRunError(summaryQuery.error);

  useEffect(() => {
    if (summaryQuery.error && !isMissingDiffRunError(summaryQuery.error)) {
      handleUiError(summaryQuery.error, 'Impossible de charger le résumé des changements.');
    }
  }, [summaryQuery.error]);

  const autoBaseSnapshotId =
    baseSelection === 'auto' ? summary?.base_snapshot_id ?? null : null;
  const { importId: autoBaseImportId } = usePricingReferenceSnapshotImportId(autoBaseSnapshotId);
  const autoBaseImport = autoBaseImportId
    ? analyzedImports.imports.find((row) => row.id === autoBaseImportId) ?? null
    : null;
  const autoBaseFile = autoBaseImport?.files.find((file) => file.file_kind === fileScope) ?? null;
  const autoBaseLabel = summary?.initial_import
    ? 'Automatique · premier import'
    : autoBaseFile && autoBaseImport
      ? `Automatique · ${autoBaseFile.original_filename} · ${formatDateTime(
          autoBaseImport.analysis_completed_at ?? autoBaseImport.created_at
        )}`
      : 'Automatique · version précédente';

  const computeMutation = useMutation({
    mutationFn: (input: PricingReferenceDiffsComputeInput) =>
      computePricingReferenceDiff(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pricingReferenceDiffSummaryRootKey() }),
        queryClient.invalidateQueries({ queryKey: pricingReferenceDiffListRootKey() })
      ]);
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de calculer la comparaison des référentiels.');
    }
  });

  const handleCompute = () => {
    const targetSnapshotId = targetSnapshot.snapshotId;
    if (!targetSnapshotId) return;
    if (baseSelection !== 'auto' && !baseSnapshot.snapshotId) return;
    computeMutation.mutate({
      target_snapshot_id: targetSnapshotId,
      ...(baseSelection === 'auto' ? {} : { base_snapshot_id: baseSnapshot.snapshotId }),
      force: false
    });
  };

  const listFilters = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(diffTypes.length > 0 ? { diff_types: diffTypes } : {}),
      ...(severities.length > 0 ? { severities } : {}),
      ...(columns.length > 0 ? { changed_columns: columns } : {}),
      ...(marques.length > 0 ? { marques } : {})
    }),
    [debouncedSearch, diffTypes, severities, columns, marques]
  );

  // Ajustement d'état pendant le rendu (pattern React sanctionné) : tout
  // changement de filtre ramène chaque groupe à sa première page.
  const filtersKey = JSON.stringify(listFilters);
  const [appliedFiltersKey, setAppliedFiltersKey] = useState(filtersKey);
  if (filtersKey !== appliedFiltersKey) {
    setAppliedFiltersKey(filtersKey);
    setGroupPages({});
  }

  // Périmètre = un seul fichier : seuls ses types d'objet sont comparés/affichés.
  const scopeObjectTypes = useMemo(() => getFileScopeObjectTypes(fileScope), [fileScope]);
  const runId = summary?.run_id ?? null;
  const scopedTotal = summary
    ? summary.counts_by_object_type
        .filter((entry) => scopeObjectTypes.includes(entry.object_type))
        .reduce((total, entry) => total + entry.total, 0)
    : 0;
  const showList = summary !== null && !summary.initial_import && scopedTotal > 0;
  const visibleObjectTypes = useMemo(
    () =>
      showList && summary
        ? scopeObjectTypes.filter((objectType) =>
            summary.counts_by_object_type.some(
              (entry) => entry.object_type === objectType && entry.total > 0
            )
          )
        : [],
    [showList, summary, scopeObjectTypes]
  );

  const groupQueries = useQueries({
    queries: visibleObjectTypes.map((objectType) => {
      const input: PricingReferenceDiffsListInput = {
        ...(runId ? { run_id: runId } : {}),
        page: groupPages[objectType] ?? 1,
        page_size: GROUP_PAGE_SIZE,
        sort_by: 'severity',
        sort_direction: 'desc',
        object_types: [objectType],
        ...listFilters
      };
      return {
        queryKey: pricingReferenceDiffListKey(input),
        queryFn: () => listPricingReferenceDiffs(input),
        enabled: runId !== null
      };
    })
  });

  const firstGroupError = groupQueries.find((query) => query.error)?.error ?? null;
  useEffect(() => {
    if (firstGroupError) {
      handleUiError(firstGroupError, 'Impossible de charger les changements du groupe.');
    }
  }, [firstGroupError]);

  const hasActiveFilters =
    diffTypes.length > 0 ||
    severities.length > 0 ||
    columns.length > 0 ||
    marques.length > 0 ||
    search !== '';

  const resetFilters = () => {
    setDiffTypes([]);
    setSeverities([]);
    setColumns([]);
    setMarques([]);
    setSearch('');
  };

  const resetWorkspace = () => {
    resetFilters();
    setOpenTypes(null);
    setGroupPages({});
  };

  const handleFileScopeChange = (scope: PricingReferenceDiffFileScope) => {
    setFileScope(scope);
    setTargetOverrideId(null);
    setBaseSelection('auto');
    resetWorkspace();
  };

  const handleTargetChange = (importId: string) => {
    setTargetOverrideId(importId);
    if (baseSelection === importId) setBaseSelection('auto');
    resetWorkspace();
  };

  const handleBaseChange = (selection: string) => {
    setBaseSelection(selection);
    resetWorkspace();
  };

  const handleSelectMatrixCell = (
    objectType: PricingReferenceDiffObjectType,
    diffType: PricingReferenceDiffType
  ) => {
    setDiffTypes([diffType]);
    setOpenTypes(new Set([objectType]));
  };

  const handleToggleColumn = (column: string) => {
    setColumns((current) =>
      current.includes(column)
        ? current.filter((entry) => entry !== column)
        : [...current, column]
    );
  };

  const diffTypeOptions: FacetedFilterOption[] = summary
    ? aggregateDiffTypeCounts(summary).map((entry) => ({
        value: entry.diff_type,
        label: diffTypeLabels[entry.diff_type],
        count: entry.count,
        dotClassName: diffTypeDotClassName[entry.diff_type]
      }))
    : [];
  const severityOptions: FacetedFilterOption[] = summary
    ? aggregateDiffSeverityCounts(summary).map((entry) => ({
        value: entry.severity,
        label: severityLabels[entry.severity],
        count: entry.count,
        dotClassName: anomalySeverityDotClassName[entry.severity]
      }))
    : [];
  // Colonnes du fichier courant uniquement : jamais celles de l'autre fichier.
  const columnOptions: FacetedFilterOption[] = summary
    ? sortDiffChangedColumnSummaries(summary.changed_columns)
        .filter((entry) => columnBelongsToFileScope(entry.column, fileScope))
        .map((entry) => ({
          value: entry.column,
          label: entry.column,
          count: entry.count
        }))
    : [];

  // La Phase 3 n'expose pas d'agrégat serveur des marques impactées : la facette
  // s'alimente des lignes chargées (sans compteur) plus les valeurs déjà choisies.
  const marqueValues = new Set<string>(marques);
  groupQueries.forEach((query) => {
    query.data?.rows.forEach((row) => {
      const marque = toDiffDisplayValue(row.payload.labels.marque);
      if (marque) marqueValues.add(marque);
    });
  });
  const marqueOptions: FacetedFilterOption[] = [...marqueValues]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));

  const groupResults = visibleObjectTypes.map((objectType, index) => ({
    objectType,
    query: groupQueries[index]
  }));
  const filteredTotal = groupResults.reduce(
    (total, group) => total + (group.query?.data?.total ?? 0),
    0
  );
  const allGroupsSettled = groupResults.every((group) => group.query?.isSuccess);
  const isFilteredEmpty = hasActiveFilters && allGroupsSettled && filteredTotal === 0;

  // Groupes réellement rendus (un groupe vidé par les facettes disparaît).
  const renderableGroups = groupResults.filter(({ objectType, query }) => {
    if (!summary) return false;
    const unfilteredTotal =
      summary.counts_by_object_type.find((entry) => entry.object_type === objectType)?.total ?? 0;
    const total = query?.data?.total ?? unfilteredTotal;
    return !(hasActiveFilters && query?.isSuccess && total === 0);
  });

  const firstVisibleType = visibleObjectTypes[0];
  const effectiveOpenTypes: ReadonlySet<string> =
    openTypes ?? new Set(firstVisibleType ? [firstVisibleType] : []);

  const handleToggleGroup = (objectType: PricingReferenceDiffObjectType) => {
    const next = new Set(effectiveOpenTypes);
    if (next.has(objectType)) {
      next.delete(objectType);
    } else {
      next.add(objectType);
    }
    setOpenTypes(next);
  };

  const isPreparing =
    analyzedImports.isLoading ||
    targetSnapshot.isLoading ||
    (baseSelection !== 'auto' && baseSnapshot.isLoading) ||
    (summaryInput !== null && summaryQuery.isLoading);

  const targetCounters = summary?.snapshot_counters.target ?? null;
  const scopeLabel = diffFileGroupLabels[fileScope];

  let content: React.ReactNode;
  if (analyzedImports.isError) {
    content = (
      <CenteredState
        icon="error"
        title="Versions indisponibles"
        description="La liste des imports analysés n'a pas pu être chargée. Le problème a été transmis au pipeline d'erreurs."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void analyzedImports.refetch()}
          className="mt-4 h-8 border-red-200 bg-white text-xs font-semibold text-red-900 hover:bg-red-50"
        >
          Réessayer
        </Button>
      </CenteredState>
    );
  } else if (analyzedImports.imports.length === 0) {
    content = (
      <CenteredState
        icon="compare"
        title="Aucun import analysé"
        description="Importez puis analysez un référentiel pour comparer deux versions : chaque réimport sera confronté à la référence courante."
      />
    );
  } else if (fileVersions.length === 0) {
    content = (
      <CenteredState
        icon="compare"
        title={`Aucune version du fichier « ${scopeLabel} »`}
        description="Aucun import analysé ne contient ce fichier. Choisissez l'autre fichier, ou importez cette version pour pouvoir la comparer."
      />
    );
  } else if (isPreparing) {
    content = (
      <div aria-hidden="true" className="flex-1">
        <div className="space-y-2 border-b border-stone-200/60 px-4 py-3">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-stone-100" />
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-stone-50" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b border-stone-100">
            <div className="flex h-8 items-center bg-stone-50/80 px-4">
              <div className="h-3.5 w-1/4 animate-pulse rounded bg-stone-100" />
            </div>
            <div className="flex h-9 items-center px-4">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-50" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (targetSnapshot.isResolved && !targetSnapshot.snapshotId) {
    content = (
      <CenteredState
        icon="compare"
        title="Version cible non comparable"
        description="Cette version n'expose aucune donnée de snapshot : choisissez une autre version cible."
      />
    );
  } else if (baseSelection !== 'auto' && baseSnapshot.isResolved && !baseSnapshot.snapshotId) {
    content = (
      <CenteredState
        icon="compare"
        title="Version de base non comparable"
        description="Cette version n'expose aucune donnée de snapshot : choisissez une autre version de base."
      />
    );
  } else if (isRunMissing) {
    content = (
      <CenteredState
        icon="compare"
        title="Comparaison non calculée"
        description="Aucun diff n'existe encore pour ce couple de versions. Le calcul est ensembliste côté serveur et prend quelques secondes."
      >
        {canCompute ? (
          <Button
            type="button"
            size="sm"
            onClick={handleCompute}
            disabled={computeMutation.isPending}
            className="mt-4 h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/95 active:scale-[0.98]"
          >
            {computeMutation.isPending ? 'Calcul en cours…' : 'Calculer la comparaison'}
          </Button>
        ) : (
          <p className="mt-3 text-xs text-stone-500">
            Un super administrateur peut lancer le calcul depuis cet écran.
          </p>
        )}
      </CenteredState>
    );
  } else if (summaryQuery.isError) {
    content = (
      <CenteredState
        icon="error"
        title="Changements indisponibles"
        description="Le résumé de la comparaison n'a pas pu être chargé. Le problème a été transmis au pipeline d'erreurs."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void summaryQuery.refetch()}
          className="mt-4 h-8 border-red-200 bg-white text-xs font-semibold text-red-900 hover:bg-red-50"
        >
          Réessayer
        </Button>
      </CenteredState>
    );
  } else if (summary && summary.initial_import) {
    content = (
      <CenteredState
        icon="history"
        title="Premier import de référence"
        description="Cette version fonde l'historique : aucune comparaison n'existe encore. Chaque réimport futur sera confronté à la référence courante, champ par champ."
      >
        {targetCounters ? (
          <p className="mt-4 font-mono text-[11px] tabular-nums text-stone-500">
            {formatCount(targetCounters.classifications)} classifications ·{' '}
            {formatCount(targetCounters.segments)} segments ·{' '}
            {formatCount(targetCounters.liaisons)} liaisons ·{' '}
            {formatCount(targetCounters.grilles)} grilles ·{' '}
            {formatCount(targetCounters.anomalies)} anomalies
          </p>
        ) : null}
      </CenteredState>
    );
  } else if (summary && scopedTotal === 0) {
    content = (
      <CenteredState
        icon="check"
        title={`Aucun changement sur « ${scopeLabel} »`}
        description={
          summary.skipped_file_kinds.includes(fileScope)
            ? 'Le fichier source est identique (SHA-256) entre ces deux versions : exactement les mêmes données.'
            : `La comparaison champ par champ n'a détecté aucune différence sur le fichier « ${scopeLabel} » entre ces deux versions.`
        }
      />
    );
  } else if (summary) {
    content = (
      <>
        <ChangesSummary
          summary={summary}
          fileScope={fileScope}
          activeColumns={columns}
          onSelectMatrixCell={handleSelectMatrixCell}
          onToggleColumn={handleToggleColumn}
        />
        <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-stone-200/60 px-4 py-1.5">
          <div className="relative w-full max-w-56">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="changes-search"
              name="changes-search"
              density="dense"
              aria-label="Rechercher un changement"
              value={search}
              placeholder="Rechercher clé, marque…"
              className="h-7 border-border pl-8 text-xs"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <FacetedFilter
            label="Type de changement"
            options={diffTypeOptions}
            selectedValues={diffTypes}
            onChange={(values) => setDiffTypes(values as PricingReferenceDiffType[])}
          />
          <FacetedFilter
            label="Colonne impactée"
            options={columnOptions}
            selectedValues={columns}
            onChange={setColumns}
          />
          <FacetedFilter
            label="Sévérité"
            options={severityOptions}
            selectedValues={severities}
            onChange={(values) => setSeverities(values as PricingReferenceAnomalySeverity[])}
          />
          <FacetedFilter
            label="Marque"
            options={marqueOptions}
            selectedValues={marques}
            onChange={setMarques}
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
            >
              <X className="size-3.5" aria-hidden="true" />
              Réinitialiser
            </button>
          ) : null}
          <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatCount(hasActiveFilters ? filteredTotal : scopedTotal)} changements
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isFilteredEmpty ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm font-medium text-stone-950">
                Aucun changement ne correspond aux filtres
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Ajustez la recherche ou les facettes actives pour élargir le résultat.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-4 h-8 border-stone-200 bg-white text-xs font-medium text-stone-800 hover:bg-stone-50"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            renderableGroups.map(({ objectType, query }) => {
              const unfilteredTotal =
                summary.counts_by_object_type.find((entry) => entry.object_type === objectType)
                  ?.total ?? 0;
              const total = query?.data?.total ?? unfilteredTotal;
              return (
                <ChangesGroup
                  key={objectType}
                  objectType={objectType}
                  rows={query?.data?.rows ?? []}
                  total={total}
                  page={groupPages[objectType] ?? 1}
                  pageSize={GROUP_PAGE_SIZE}
                  isLoading={query?.isLoading ?? true}
                  isError={query?.isError ?? false}
                  isOpen={effectiveOpenTypes.has(objectType)}
                  onToggle={() => handleToggleGroup(objectType)}
                  onPageChange={(page) =>
                    setGroupPages((current) => ({ ...current, [objectType]: page }))
                  }
                  onRetry={() => void query?.refetch()}
                />
              );
            })
          )}
        </div>
      </>
    );
  } else {
    content = null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200/60 bg-white">
      {analyzedImports.imports.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-200/60 px-4 py-2">
            <span className="shrink-0 text-[11px] text-stone-500">Fichier comparé</span>
            <SegmentedControl
              ariaLabel="Périmètre de comparaison : fichier importé"
              value={fileScope}
              options={DIFF_FILE_SCOPE_ORDER.map((scope) => ({
                value: scope,
                label: diffFileGroupLabels[scope],
                ariaLabel: `Comparer le fichier ${diffFileGroupLabels[scope]}`
              }))}
              onChange={handleFileScopeChange}
            />
          </div>
          {fileVersions.length > 0 && targetImportId ? (
            <VersionSelectors
              fileVersions={fileVersions}
              targetImportId={targetImportId}
              baseSelection={baseSelection}
              autoBaseLabel={autoBaseLabel}
              summary={summary}
              onTargetChange={handleTargetChange}
              onBaseChange={handleBaseChange}
            />
          ) : null}
        </>
      ) : null}
      {content}
    </div>
  );
};
