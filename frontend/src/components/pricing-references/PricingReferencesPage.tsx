import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnPinningState, ColumnSizingState, VisibilityState } from '@tanstack/react-table';
import {
  ChevronDown,
  Database,
  ListTree,
  Search,
  Sparkles,
  UploadCloud,
  X
} from 'lucide-react';

import {
  pricingReferenceLinkStatusSchema,
  pricingReferenceSegmentsSortBySchema,
  type PricingReferenceAnomalySeverity,
  type PricingReferenceClassificationListInput,
  type PricingReferenceClassificationListResponse,
  type PricingReferenceClassificationSortBy,
  type PricingReferenceImportStatus,
  type PricingReferenceImportsListInput,
  type PricingReferenceLinkStatus,
  type PricingReferenceSegmentsListInput,
  type PricingReferenceSegmentsSortBy,
  type PricingReferenceSortDirection
} from '../../../../shared/schemas/pricing/references.schema';
import type {
  DirectorySavedView,
  DirectorySavedViewSaveInput,
  DirectorySavedViewState
} from '../../../../shared/schemas/system/directory.schema';
import type { AiAssistantPageContext } from '../../../../shared/schemas/aiAssistant.schema';

import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/navigation/DropdownMenu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/Tabs';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/utils/useDebouncedValue';
import {
  getPricingReferenceHealth,
  listPricingReferenceClassification,
  listPricingReferenceImports,
  listPricingReferenceSegments
} from '@/services/pricingReferences';
import {
  aiAssistantStatusKey,
  pricingReferenceClassificationKey,
  pricingReferenceHealthKey,
  pricingReferenceImportsKey,
  pricingReferenceSegmentsKey
} from '@/services/query/queryKeys';
import { getAiAssistantStatus } from '@/services/ai';
import type { UserRole } from '@/types';

// UI components extracted for one-fn-per-file compliance
import { NativeSelect } from './components/inputs/form-field';
import { SegmentedControl } from './components/inputs/segmented-control';
import { ReferenceTable, type DataColumn } from './components/table/reference-table';

import { ImportRows } from './components/imports/import-rows';
import { ImportDetailDialog } from './components/imports/import-detail-dialog';
import { PaginationBar } from './components/table/pagination-bar';
import { SegmentDetailDialog } from './components/segments/segment-detail-dialog';
import { SegmentsDataGrid } from './components/segments/segments-data-grid';
import { SegmentsViewOptions } from './components/segments/segments-view-options';
import {
  DEFAULT_SEGMENT_COLUMN_PINNING,
  DEFAULT_SEGMENT_COLUMN_SIZING,
  DEFAULT_SEGMENT_COLUMN_VISIBILITY,
  normalizeSegmentColumnOrder,
  normalizeSegmentColumnVisibility,
  type SegmentGridDensity,
  type SegmentRow
} from './components/segments/segment-grid-config';
import { HealthStrip, type TabId } from './components/health/health-strip';
import { PricingReferenceImportDialog } from './pricing-reference-import-dialog';
import { ClassificationDrillDown } from './components/classification/classification-drilldown';
import { AnomaliesTriage, type AnomalySeverityPreset } from './components/anomalies/anomalies-triage';
import { ChangesTriage } from './components/changes/changes-triage';
import { AssistantChatDialog } from './components/assistant/AssistantChatDialog';
import { useAnalyzedPricingReferenceImports } from './components/changes/use-analyzed-imports';
import { usePricingReferenceChangesBadge } from './components/changes/use-changes-badge';
import DirectorySavedViewsBar from '../client-directory/DirectorySavedViewsBar';
import { useDirectorySavedViews } from '@/hooks/directory/views/useDirectorySavedViews';
import { useSaveDirectorySavedView } from '@/hooks/directory/views/useSaveDirectorySavedView';
import { useDeleteDirectorySavedView } from '@/hooks/directory/views/useDeleteDirectorySavedView';
import { useSetDefaultDirectorySavedView } from '@/hooks/directory/views/useSetDefaultDirectorySavedView';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';

// Formatters and label mappings
import { formatCount, formatDateTime, linkStatusLabels } from './utils/pricing-references-formatters';

type ClassificationRow = PricingReferenceClassificationListResponse['rows'][number];
const DEFAULT_PAGE_SIZE = 50;

const tabItems: Array<{ id: TabId; label: string }> = [
  { id: 'segments', label: 'Segments' },
  { id: 'classification', label: 'Classification' },
  { id: 'anomalies', label: 'Anomalies' },
  { id: 'changements', label: 'Changements' },
  { id: 'imports', label: 'Imports' }
];

const DEFAULT_TAB: TabId = 'segments';

const toggleSort = <TSort extends string>(
  currentBy: TSort,
  currentDirection: PricingReferenceSortDirection,
  nextBy: TSort
): { sort_by: TSort; sort_direction: PricingReferenceSortDirection } => ({
  sort_by: nextBy,
  sort_direction: currentBy === nextBy && currentDirection === 'asc' ? 'desc' : 'asc'
});

const importStatusFilters: Array<{
  value: PricingReferenceImportStatus | 'all';
  label: string;
}> = [
  { value: 'all', label: 'Tous' },
  { value: 'analyse_ok', label: 'OK' },
  { value: 'analyse_erreur', label: 'Erreurs' }
];

interface PricingReferencesPageProps {
  userRole: UserRole;
  routeTab?: TabId;
  onRouteTabChange?: (tab: TabId) => void;
}

/**
 * Main Pricing References workspace component.
 * Allows super-admins to import raw classifications/grids, and all admins to view and analyze anomalies.
 * Tab state is mirrored to the route search params by the parent when available.
 */
const PricingReferencesPage = ({ userRole, routeTab, onRouteTabChange }: PricingReferencesPageProps) => {
  const [isClassificationImportOpen, setIsClassificationImportOpen] = useState(false);
  const [isSegmentsImportOpen, setIsSegmentsImportOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [localActiveTab, setLocalActiveTab] = useState<TabId>(DEFAULT_TAB);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [detailImportId, setDetailImportId] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentRow | null>(null);
  const [anomalySeverityPreset, setAnomalySeverityPreset] = useState<AnomalySeverityPreset | null>(null);

  const [classificationViewMode, setClassificationViewMode] = useState<'drilldown' | 'table'>('drilldown');

  // Pagination and filter states
  const [importPage, setImportPage] = useState(1);
  const [importPageSize, setImportPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [importStatus, setImportStatus] = useState<PricingReferenceImportStatus | 'all'>('all');

  const [classificationPage, setClassificationPage] = useState(1);
  const [classificationPageSize, setClassificationPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [classificationSearch, setClassificationSearch] = useState('');
  const [classificationMega, setClassificationMega] = useState('');
  const [classificationFam, setClassificationFam] = useState('');
  const [classificationSort, setClassificationSort] = useState<
    Pick<PricingReferenceClassificationListInput, 'sort_by' | 'sort_direction'>
  >({
    sort_by: 'mega',
    sort_direction: 'asc'
  });

  const [segmentsPage, setSegmentsPage] = useState(1);
  const [segmentsPageSize, setSegmentsPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [segmentsSearch, setSegmentsSearch] = useState('');
  const [segmentsMarque, setSegmentsMarque] = useState('');
  const [segmentsCatFab, setSegmentsCatFab] = useState('');
  const [segmentsLinkStatus, setSegmentsLinkStatus] = useState<PricingReferenceLinkStatus | 'all'>(
    'all'
  );
  const [segmentsSort, setSegmentsSort] = useState<
    Pick<PricingReferenceSegmentsListInput, 'sort_by' | 'sort_direction'>
  >({
    sort_by: 'marque',
    sort_direction: 'asc'
  });
  const [segmentsDensity, setSegmentsDensity] = useState<SegmentGridDensity>('compact');
  const [segmentsColumnVisibility, setSegmentsColumnVisibility] = useState<VisibilityState>(
    DEFAULT_SEGMENT_COLUMN_VISIBILITY
  );
  const [segmentsColumnOrder, setSegmentsColumnOrder] = useState<string[]>(
    normalizeSegmentColumnOrder([])
  );
  const [segmentsColumnSizing, setSegmentsColumnSizing] = useState<ColumnSizingState>(
    DEFAULT_SEGMENT_COLUMN_SIZING
  );
  const [segmentsColumnPinning, setSegmentsColumnPinning] = useState<ColumnPinningState>(
    DEFAULT_SEGMENT_COLUMN_PINNING
  );
  const hasAppliedDefaultSegmentsView = useRef(false);
  const reportedAssistantStatusError = useRef<unknown>(null);

  const canImport = userRole === 'super_admin';

  // Debounced copies of server-driven text filters: inputs stay responsive,
  // queries only fire once typing settles (300ms).
  const debouncedClassificationSearch = useDebouncedValue(classificationSearch);
  const debouncedClassificationMega = useDebouncedValue(classificationMega);
  const debouncedClassificationFam = useDebouncedValue(classificationFam);
  const debouncedSegmentsSearch = useDebouncedValue(segmentsSearch);
  const debouncedSegmentsMarque = useDebouncedValue(segmentsMarque);
  const debouncedSegmentsCatFab = useDebouncedValue(segmentsCatFab);

  const hasSegmentFilters =
    Boolean(segmentsSearch || segmentsMarque || segmentsCatFab) || segmentsLinkStatus !== 'all';
  const resetSegmentFilters = useCallback(() => {
    setSegmentsSearch('');
    setSegmentsMarque('');
    setSegmentsCatFab('');
    setSegmentsLinkStatus('all');
    setSegmentsPage(1);
  }, []);

  const isRouteControlled = onRouteTabChange !== undefined;
  const activeTab = isRouteControlled ? routeTab ?? DEFAULT_TAB : localActiveTab;
  const assistantPageContext = useMemo<AiAssistantPageContext>(() => ({
    surface: 'pricing.references',
    active_tab: activeTab,
    ...(selectedImportId ? { import_id: selectedImportId } : {}),
    ...(activeTab === 'segments' ? { file_kind: 'segments_grids' as const } : {}),
    ...(activeTab === 'classification' ? { file_kind: 'classification' as const } : {})
  }), [activeTab, selectedImportId]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (!isRouteControlled) {
        setLocalActiveTab(tab);
      }
      onRouteTabChange?.(tab);
    },
    [isRouteControlled, onRouteTabChange]
  );

  // Memoized query inputs
  const importsInput = useMemo(
    (): PricingReferenceImportsListInput => ({
      page: importPage,
      page_size: importPageSize,
      ...(importStatus === 'all' ? {} : { status: importStatus })
    }),
    [importPage, importPageSize, importStatus]
  );

  const classificationInput = useMemo(
    (): PricingReferenceClassificationListInput => ({
      page: classificationPage,
      page_size: classificationPageSize,
      ...(selectedImportId ? { import_id: selectedImportId } : {}),
      search: debouncedClassificationSearch || undefined,
      filters: {
        ...(debouncedClassificationMega ? { mega: debouncedClassificationMega } : {}),
        ...(debouncedClassificationFam ? { fam: debouncedClassificationFam } : {})
      },
      ...classificationSort
    }),
    [
      debouncedClassificationFam,
      debouncedClassificationMega,
      classificationPage,
      classificationPageSize,
      debouncedClassificationSearch,
      classificationSort,
      selectedImportId
    ]
  );

  const segmentsInput = useMemo(
    (): PricingReferenceSegmentsListInput => ({
      page: segmentsPage,
      page_size: segmentsPageSize,
      ...(selectedImportId ? { import_id: selectedImportId } : {}),
      search: debouncedSegmentsSearch || undefined,
      filters: {
        ...(debouncedSegmentsMarque ? { marque: debouncedSegmentsMarque } : {}),
        ...(debouncedSegmentsCatFab ? { cat_fab: debouncedSegmentsCatFab } : {}),
        ...(segmentsLinkStatus === 'all' ? {} : { link_status: segmentsLinkStatus })
      },
      ...segmentsSort
    }),
    [
      debouncedSegmentsCatFab,
      segmentsLinkStatus,
      debouncedSegmentsMarque,
      segmentsPage,
      segmentsPageSize,
      debouncedSegmentsSearch,
      segmentsSort,
      selectedImportId
    ]
  );



  // Queries
  const importsQuery = useQuery({
    queryKey: pricingReferenceImportsKey(importsInput),
    queryFn: () => listPricingReferenceImports(importsInput)
  });
  const assistantStatusQuery = useQuery({
    queryKey: aiAssistantStatusKey(),
    queryFn: getAiAssistantStatus,
    retry: 1
  });

  useEffect(() => {
    if (
      assistantStatusQuery.error
      && reportedAssistantStatusError.current !== assistantStatusQuery.error
    ) {
      reportedAssistantStatusError.current = assistantStatusQuery.error;
      handleUiError(
        assistantStatusQuery.error,
        "Impossible de vérifier la disponibilité de l'assistant IA."
      );
    }
  }, [assistantStatusQuery.error]);
  const visibleImports = useMemo(
    () => importsQuery.data?.imports ?? [],
    [importsQuery.data]
  );
  const totalImports = importsQuery.data?.total ?? 0;
  // La section ACTIF est pilotée par la vraie version active (is_active_version,
  // snapshot is_active côté API), plus par « premier import analyse_ok de la page ».
  const activeImport = useMemo(
    () => visibleImports.find((row) => row.is_active_version) ?? null,
    [visibleImports]
  );
  // Version active pour la pastille header et les confirmations d'activation :
  // lue sur la liste des imports analysés (requête partagée avec l'onglet
  // Changements), insensible aux filtres/pagination de l'onglet Imports.
  const { imports: analyzedImports } = useAnalyzedPricingReferenceImports();
  const activeVersion = useMemo(
    () => analyzedImports.find((row) => row.is_active_version) ?? null,
    [analyzedImports]
  );

  const healthInput = useMemo(
    () => (selectedImportId ? { import_id: selectedImportId } : {}),
    [selectedImportId]
  );

  const healthQuery = useQuery({
    queryKey: pricingReferenceHealthKey(healthInput),
    queryFn: () => getPricingReferenceHealth(healthInput)
  });
  const anomaliesBadgeCount = healthQuery.data?.health_report?.anomalies.total ?? 0;
  const changesBadgeCount = usePricingReferenceChangesBadge(selectedImportId);

  const classificationQuery = useQuery({
    queryKey: pricingReferenceClassificationKey(classificationInput),
    queryFn: () => listPricingReferenceClassification(classificationInput)
  });

  const segmentsQuery = useQuery({
    queryKey: pricingReferenceSegmentsKey(segmentsInput),
    queryFn: () => listPricingReferenceSegments(segmentsInput)
  });
  const segmentsSavedViewsQuery = useDirectorySavedViews('referential_segments', true);
  const saveSegmentsViewMutation = useSaveDirectorySavedView();
  const deleteSegmentsViewMutation = useDeleteDirectorySavedView();
  const setDefaultSegmentsViewMutation = useSetDefaultDirectorySavedView();
  const isSegmentsViewMutating =
    saveSegmentsViewMutation.isPending
    || deleteSegmentsViewMutation.isPending
    || setDefaultSegmentsViewMutation.isPending;

  const currentSegmentsViewState = useMemo<DirectorySavedViewState>(
    () => ({
      viewType: 'referential_segments',
      q: segmentsSearch || undefined,
      type: 'all',
      scope: { mode: 'active_agency' },
      departments: [],
      city: undefined,
      cirCommercialIds: [],
      includeArchived: false,
      pageSize: segmentsPageSize,
      sorting: [{ id: 'name', desc: false }],
      columnVisibility: normalizeSegmentColumnVisibility(segmentsColumnVisibility),
      columnOrder: normalizeSegmentColumnOrder(segmentsColumnOrder),
      columnSizing: segmentsColumnSizing,
      columnPinning: {
        left: segmentsColumnPinning.left ?? [],
        right: segmentsColumnPinning.right ?? []
      },
      pricingReferenceSegments: {
        filters: {
          search: segmentsSearch || undefined,
          marque: segmentsMarque || undefined,
          cat_fab: segmentsCatFab || undefined,
          link_status: segmentsLinkStatus === 'all' ? undefined : segmentsLinkStatus
        },
        sorting: segmentsSort
      },
      density: segmentsDensity
    }),
    [
      segmentsCatFab,
      segmentsColumnOrder,
      segmentsColumnPinning.left,
      segmentsColumnPinning.right,
      segmentsColumnSizing,
      segmentsColumnVisibility,
      segmentsDensity,
      segmentsLinkStatus,
      segmentsMarque,
      segmentsPageSize,
      segmentsSearch,
      segmentsSort
    ]
  );

  const applySegmentsView = useCallback((view: DirectorySavedView) => {
    const state = view.state;
    const segmentFilters = state.pricingReferenceSegments.filters;
    const segmentSorting = state.pricingReferenceSegments.sorting;
    const parsedSortBy = pricingReferenceSegmentsSortBySchema.safeParse(segmentSorting.sort_by);
    const parsedLinkStatus = pricingReferenceLinkStatusSchema.safeParse(segmentFilters.link_status);

    setSegmentsSearch(segmentFilters.search ?? state.q ?? '');
    setSegmentsMarque(segmentFilters.marque ?? '');
    setSegmentsCatFab(segmentFilters.cat_fab ?? '');
    setSegmentsLinkStatus(parsedLinkStatus.success ? parsedLinkStatus.data : 'all');
    setSegmentsSort({
      sort_by: parsedSortBy.success ? parsedSortBy.data : 'marque',
      sort_direction: segmentSorting.sort_direction
    });
    setSegmentsPageSize(state.pageSize);
    setSegmentsDensity(state.density === 'compact' ? 'compact' : 'comfortable');
    setSegmentsColumnVisibility(normalizeSegmentColumnVisibility(state.columnVisibility));
    setSegmentsColumnOrder(normalizeSegmentColumnOrder(state.columnOrder));
    setSegmentsColumnSizing({ ...DEFAULT_SEGMENT_COLUMN_SIZING, ...state.columnSizing });
    setSegmentsColumnPinning({
      left: state.columnPinning.left ?? [],
      right: state.columnPinning.right ?? []
    });
    setSegmentsPage(1);
  }, []);

  useEffect(() => {
    if (hasAppliedDefaultSegmentsView.current) return;
    const defaultView = segmentsSavedViewsQuery.data?.views.find((view) => view.is_default);
    if (!defaultView) return;
    hasAppliedDefaultSegmentsView.current = true;
    let isCancelled = false;
    queueMicrotask(() => {
      if (!isCancelled) {
        applySegmentsView(defaultView);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [applySegmentsView, segmentsSavedViewsQuery.data?.views]);

  const saveSegmentsView = useCallback(
    async (input: DirectorySavedViewSaveInput) => {
      try {
        await saveSegmentsViewMutation.mutateAsync(input);
        notifySuccess(input.id ? 'Vue Segments mise à jour.' : 'Vue Segments sauvegardée.');
      } catch (error) {
        handleUiError(error, 'Impossible de sauvegarder la vue Segments.');
      }
    },
    [saveSegmentsViewMutation]
  );

  const deleteSegmentsView = useCallback(
    async (viewId: string) => {
      try {
        await deleteSegmentsViewMutation.mutateAsync({ id: viewId });
        notifySuccess('Vue Segments supprimée.');
      } catch (error) {
        handleUiError(error, 'Impossible de supprimer la vue Segments.');
      }
    },
    [deleteSegmentsViewMutation]
  );

  const setDefaultSegmentsView = useCallback(
    async (viewId: string) => {
      try {
        await setDefaultSegmentsViewMutation.mutateAsync({
          id: viewId,
          viewType: 'referential_segments'
        });
        notifySuccess('Vue Segments par défaut enregistrée.');
      } catch (error) {
        handleUiError(error, 'Impossible de définir la vue Segments par défaut.');
      }
    },
    [setDefaultSegmentsViewMutation]
  );

  const resetPages = useCallback(() => {
    setClassificationPage(1);
    setSegmentsPage(1);
  }, []);

  const handleImportSelected = useCallback(
    (importId: string) => {
      setSelectedImportId(importId);
      resetPages();
    },
    [resetPages]
  );

  const handleViewChanges = useCallback(
    (importId: string) => {
      handleImportSelected(importId);
      handleTabChange('changements');
    },
    [handleImportSelected, handleTabChange]
  );

  const handleQuickNavigate = useCallback(
    (
      tab: TabId,
      filters?: {
        severity?: PricingReferenceAnomalySeverity | 'all';
        linkStatus?: PricingReferenceLinkStatus | 'all';
        search?: string;
      }
    ) => {
      handleTabChange(tab);
      if (tab === 'segments' && filters?.linkStatus !== undefined) {
        setSegmentsLinkStatus(filters.linkStatus);
        setSegmentsPage(1);
      }
      if (tab === 'anomalies' && filters?.severity !== undefined) {
        const severity = filters.severity;
        setAnomalySeverityPreset((current) => ({
          id: (current?.id ?? 0) + 1,
          severities: severity === 'all' ? [] : [severity]
        }));
      }
    },
    [handleTabChange]
  );

  // Column definitions for ReferenceTable
  const classificationColumns = useMemo<Array<DataColumn<ClassificationRow>>>(
    () => [
      {
        id: 'cir_key',
        label: 'Clé CIR',
        sortBy: 'cir_key',
        className: 'font-mono font-medium tabular-nums text-foreground',
        render: (row) => row.cir_key
      },
      {
        id: 'mega',
        label: 'Mega',
        sortBy: 'mega',
        className: 'text-muted-foreground tabular-nums',
        render: (row) => row.mega
      },
      { id: 'mega_lib', label: 'Libellé mega', render: (row) => row.mega_lib },
      {
        id: 'fam',
        label: 'Fam',
        sortBy: 'fam',
        className: 'text-muted-foreground tabular-nums',
        render: (row) => row.fam
      },
      { id: 'fam_lib', label: 'Libellé famille', render: (row) => row.fam_lib },
      {
        id: 'sfa',
        label: 'SFA',
        sortBy: 'sfa',
        className: 'text-muted-foreground tabular-nums',
        render: (row) => row.sfa
      },
      { id: 'sfa_lib', label: 'Libellé SFA', render: (row) => row.sfa_lib }
    ],
    []
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-transparent px-0 text-foreground"
      data-testid="pricing-references-page"
    >
      {/* Page Header */}
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
            <h1 className="text-xl font-semibold leading-none tracking-tight text-foreground text-pretty">
              Référentiels CIR
            </h1>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-stone-500"
              title={
                selectedImportId
                  ? undefined
                  : activeVersion?.activated_at
                    ? `Version active depuis le ${formatDateTime(activeVersion.activated_at)}`
                    : 'Aucune version activée : dernier import analysé utilisé par défaut'
              }
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  selectedImportId ? 'bg-stone-300' : 'bg-emerald-500'
                )}
                aria-hidden="true"
              />
              {selectedImportId ? 'Import sélectionné' : 'Snapshot actif'}
              {selectedImportId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImportId(null);
                    resetPages();
                  }}
                  aria-label="Revenir au snapshot actif"
                  className="rounded-sm p-0.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-1.5 rounded-md px-3 text-xs shadow-none',
                assistantStatusQuery.data?.enabled === false && 'text-muted-foreground'
              )}
              onClick={() => setIsAssistantOpen(true)}
              title={assistantStatusQuery.data?.enabled === false
                ? assistantStatusQuery.data.reason ?? 'Assistant IA indisponible'
                : undefined}
            >
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              Assistant IA
            </Button>
            {canImport ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-[background-color,box-shadow,transform] hover:bg-primary/95 active:scale-[0.98]"
                  >
                    <UploadCloud className="size-3.5" aria-hidden="true" />
                    Importer
                    <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-lg border-border p-1">
                  <DropdownMenuItem
                    onSelect={() => setIsClassificationImportOpen(true)}
                    className="cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2"
                  >
                    <ListTree className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground">Classification produit CIR</span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        Codes MEGA, FAM, SFA et libellés produit.
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setIsSegmentsImportOpen(true)}
                    className="cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2"
                  >
                    <Database className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground">Segments &amp; grilles fabricant</span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        Segments, liaisons CIR et grilles de taux d&apos;achat.
                      </span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {/* Compact snapshot status line */}
        <HealthStrip
          report={healthQuery.data?.health_report}
          isLoading={healthQuery.isLoading}
          onNavigate={handleQuickNavigate}
        />
      </div>

      {/* Workspace Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => handleTabChange(value as TabId)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 select-none overflow-x-auto">
          <TabsList className="h-9 w-full min-w-max justify-start gap-5 rounded-none border-0 border-b border-stone-200/60 bg-transparent p-0 text-stone-500">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative h-9 gap-1.5 rounded-none px-1 text-xs font-normal text-stone-500 shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent hover:text-stone-800 data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-stone-950 data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
              >
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.id === 'anomalies' && anomaliesBadgeCount > 0 ? (
                  <span className="font-mono text-[11px] tabular-nums text-amber-700">
                    {formatCount(anomaliesBadgeCount)}
                  </span>
                ) : null}
                {tab.id === 'changements' && changesBadgeCount !== null && changesBadgeCount > 0 ? (
                  <span className="font-mono text-[11px] tabular-nums text-stone-400">
                    {formatCount(changesBadgeCount)}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab 4: Imports */}
        <TabsContent
          value="imports"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden pt-2"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200/60 bg-white">
            <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-stone-200/60 px-4 py-1.5">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {formatCount(totalImports)} imports
              </span>
              <div className="ml-auto">
                <SegmentedControl
                  ariaLabel="Filtrer les imports par statut"
                  value={importStatus}
                  options={importStatusFilters.map((filter) => ({
                    value: filter.value,
                    label: filter.label,
                    ariaLabel: `Filtrer les imports : ${filter.label}`
                  }))}
                  onChange={(value) => {
                    setImportStatus(value);
                    setImportPage(1);
                  }}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ImportRows
                rows={visibleImports}
                activeImport={activeImport}
                statusFilter={importStatus}
                isLoading={importsQuery.isLoading}
                onOpenDetail={setDetailImportId}
              />
            </div>
            <PaginationBar
              page={importPage}
              pageSize={importPageSize}
              total={totalImports}
              onPageChange={setImportPage}
              onPageSizeChange={(nextPageSize) => {
                setImportPageSize(nextPageSize);
                setImportPage(1);
              }}
            />
          </div>
          <ImportDetailDialog
            importId={detailImportId}
            userRole={userRole}
            versionRows={analyzedImports}
            onClose={() => setDetailImportId(null)}
            onConsult={(importId) => {
              handleImportSelected(importId);
              setDetailImportId(null);
            }}
            onNavigateToImport={setDetailImportId}
          />
        </TabsContent>

        {/* Tab 2: Classification */}
        <TabsContent
          value="classification"
          className="min-h-0 flex-1 flex flex-col gap-3.5 overflow-hidden pt-2"
        >
          {classificationViewMode === 'drilldown' ? (
            <ClassificationDrillDown
              importId={selectedImportId}
              toolbar={
                <SegmentedControl
                  ariaLabel="Mode d'affichage de la classification"
                  value={classificationViewMode}
                  options={[
                    { value: 'drilldown', label: 'Vue escalier' },
                    { value: 'table', label: 'Vue tableau' }
                  ]}
                  onChange={setClassificationViewMode}
                />
              }
            />
          ) : (
            <ReferenceTable
              rows={classificationQuery.data?.rows ?? []}
              columns={classificationColumns}
              rowKey={(row) => row.id}
              isLoading={classificationQuery.isLoading}
              isFetching={classificationQuery.isFetching}
              page={classificationPage}
              pageSize={classificationPageSize}
              total={classificationQuery.data?.total ?? 0}
              sortBy={classificationSort.sort_by}
              sortDirection={classificationSort.sort_direction}
              emptyLabel="Aucune classification trouvée"
              toolbar={
                <>
                  <SegmentedControl
                    ariaLabel="Mode d'affichage de la classification"
                    value={classificationViewMode}
                    options={[
                      { value: 'drilldown', label: 'Vue escalier' },
                      { value: 'table', label: 'Vue tableau' }
                    ]}
                    onChange={setClassificationViewMode}
                  />
                  <div className="relative w-full max-w-64">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="classification-search"
                      name="classification-search"
                      density="dense"
                      aria-label="Rechercher dans la classification"
                      value={classificationSearch}
                      placeholder="Rechercher clé ou libellé…"
                      className="border-border pl-8 text-xs"
                      onChange={(event) => {
                        setClassificationSearch(event.target.value);
                        setClassificationPage(1);
                      }}
                    />
                  </div>
                  <Input
                    id="classification-mega"
                    name="classification-mega"
                    density="dense"
                    aria-label="Filtrer par méga-famille"
                    value={classificationMega}
                    placeholder="Mega"
                    className="w-24 border-border text-xs"
                    onChange={(event) => {
                      setClassificationMega(event.target.value);
                      setClassificationPage(1);
                    }}
                  />
                  <Input
                    id="classification-fam"
                    name="classification-fam"
                    density="dense"
                    aria-label="Filtrer par famille"
                    value={classificationFam}
                    placeholder="Fam"
                    className="w-24 border-border text-xs"
                    onChange={(event) => {
                      setClassificationFam(event.target.value);
                      setClassificationPage(1);
                    }}
                  />
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    {formatCount(classificationQuery.data?.total)} clés
                  </span>
                </>
              }
              onSort={(sortBy) => {
                setClassificationSort((current) =>
                  toggleSort(
                    current.sort_by,
                    current.sort_direction,
                    sortBy as PricingReferenceClassificationSortBy
                  )
                );
                setClassificationPage(1);
              }}
              onPageChange={setClassificationPage}
              onPageSizeChange={(nextPageSize) => {
                setClassificationPageSize(nextPageSize);
                setClassificationPage(1);
              }}
            />
          )}
        </TabsContent>

        {/* Tab 3: Segments */}
        <TabsContent
          value="segments"
          className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden pt-2"
        >
          <SegmentsDataGrid
            rows={segmentsQuery.data?.rows ?? []}
            isLoading={segmentsQuery.isLoading}
            isFetching={segmentsQuery.isFetching}
            page={segmentsPage}
            pageSize={segmentsPageSize}
            total={segmentsQuery.data?.total ?? 0}
            sortBy={segmentsSort.sort_by}
            sortDirection={segmentsSort.sort_direction}
            density={segmentsDensity}
            columnVisibility={segmentsColumnVisibility}
            columnOrder={segmentsColumnOrder}
            columnSizing={segmentsColumnSizing}
            columnPinning={segmentsColumnPinning}
            toolbar={
              <>
                <div className="relative w-full max-w-64">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="segments-search"
                    name="segments-search"
                    density="dense"
                    aria-label="Rechercher un segment"
                    value={segmentsSearch}
                    placeholder="Rechercher marque, catégorie…"
                    className="border-border pl-8 text-xs"
                    onChange={(event) => {
                      setSegmentsSearch(event.target.value);
                      setSegmentsPage(1);
                    }}
                  />
                </div>
                <Input
                  id="segments-marque"
                  name="segments-marque"
                  density="dense"
                  aria-label="Filtrer par marque"
                  value={segmentsMarque}
                  placeholder="Marque"
                  className="w-28 border-border text-xs"
                  onChange={(event) => {
                    setSegmentsMarque(event.target.value);
                    setSegmentsPage(1);
                  }}
                />
                <Input
                  id="segments-cat-fab"
                  name="segments-cat-fab"
                  density="dense"
                  aria-label="Filtrer par catégorie fabricant"
                  value={segmentsCatFab}
                  placeholder="Cat fab"
                  className="w-28 border-border text-xs"
                  onChange={(event) => {
                    setSegmentsCatFab(event.target.value);
                    setSegmentsPage(1);
                  }}
                />
                <NativeSelect
                  id="segments-link-status"
                  label="Filtrer par statut de liaison"
                  hideLabel
                  triggerClassName={cn(
                    'w-40 border-border bg-background text-xs transition-colors hover:border-border/90',
                    segmentsLinkStatus !== 'all' && 'border-amber-300 bg-amber-50 text-amber-900'
                  )}
                  value={segmentsLinkStatus}
                  options={[
                    { value: 'all', label: 'Liaison : toutes' },
                    ...pricingReferenceLinkStatusSchema.options.map((status) => ({
                      value: status,
                      label: linkStatusLabels[status]
                    }))
                  ]}
                  onChange={(value) => {
                    setSegmentsLinkStatus(value as PricingReferenceLinkStatus | 'all');
                    setSegmentsPage(1);
                  }}
                />
                {hasSegmentFilters ? (
                  <button
                    type="button"
                    onClick={resetSegmentFilters}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Réinitialiser
                  </button>
                ) : null}
                <DirectorySavedViewsBar
                  views={segmentsSavedViewsQuery.data?.views ?? []}
                  currentState={currentSegmentsViewState}
                  isLoading={segmentsSavedViewsQuery.isLoading}
                  isMutating={isSegmentsViewMutating}
                  triggerLabel="Vues"
                  title="Vues Segments"
                  description="Sauvegardez vos colonnes, filtres, tri et densité."
                  saveButtonLabel="Sauvegarder la vue actuelle"
                  emptyLabel="Aucune vue Segments sauvegardée."
                  createDialogTitle="Sauvegarder une vue Segments"
                  updateDialogTitle="Mettre à jour la vue Segments"
                  dialogDescription="Les filtres, le tri, la pagination, la densité, l'ordre, les largeurs et le pinning des colonnes seront conservés."
                  onApplyView={applySegmentsView}
                  onSaveView={saveSegmentsView}
                  onDeleteView={deleteSegmentsView}
                  onSetDefaultView={setDefaultSegmentsView}
                />
                <SegmentsViewOptions
                  density={segmentsDensity}
                  columnVisibility={segmentsColumnVisibility}
                  columnOrder={segmentsColumnOrder}
                  columnPinning={segmentsColumnPinning}
                  onDensityChange={setSegmentsDensity}
                  onColumnVisibilityChange={(visibility) =>
                    setSegmentsColumnVisibility(normalizeSegmentColumnVisibility(visibility))
                  }
                  onColumnOrderChange={(order) => setSegmentsColumnOrder(normalizeSegmentColumnOrder(order))}
                  onColumnPinningChange={setSegmentsColumnPinning}
                  onColumnSizingChange={setSegmentsColumnSizing}
                />
                <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatCount(segmentsQuery.data?.total)} segments · {formatCount(Object.values(segmentsColumnVisibility).filter(Boolean).length)} colonnes · {segmentsDensity === 'compact' ? 'compacte' : 'confort'}
                </span>
              </>
            }
            onRowClick={(row) => setSelectedSegment(row)}
            onSort={(sortBy) => {
              setSegmentsSort((current) =>
                toggleSort(
                  current.sort_by,
                  current.sort_direction,
                  sortBy as PricingReferenceSegmentsSortBy
                )
              );
              setSegmentsPage(1);
            }}
            onPageChange={setSegmentsPage}
            onPageSizeChange={(nextPageSize) => {
              setSegmentsPageSize(nextPageSize);
              setSegmentsPage(1);
            }}
            onColumnVisibilityChange={(visibility) =>
              setSegmentsColumnVisibility(normalizeSegmentColumnVisibility(visibility))
            }
            onColumnOrderChange={(order) => setSegmentsColumnOrder(normalizeSegmentColumnOrder(order))}
            onColumnSizingChange={setSegmentsColumnSizing}
            onColumnPinningChange={setSegmentsColumnPinning}
          />
          <SegmentDetailDialog segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
        </TabsContent>

        {/* Tab 4: Anomalies */}
        <TabsContent
          value="anomalies"
          className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden pt-2"
        >
          <AnomaliesTriage importId={selectedImportId} severityPreset={anomalySeverityPreset} />
        </TabsContent>

        {/* Tab 5: Changements */}
        <TabsContent
          value="changements"
          className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden pt-2"
        >
          <ChangesTriage userRole={userRole} selectedImportId={selectedImportId} />
        </TabsContent>
      </Tabs>

      <AssistantChatDialog
        open={isAssistantOpen}
        onOpenChange={setIsAssistantOpen}
        pageContext={assistantPageContext}
        status={assistantStatusQuery.data}
        statusLoading={assistantStatusQuery.isLoading}
        statusError={assistantStatusQuery.isError}
      />

      {/* Import dialogs */}
      <PricingReferenceImportDialog
        fileKind="classification"
        userRole={userRole}
        open={isClassificationImportOpen}
        onOpenChange={setIsClassificationImportOpen}
        onImported={handleImportSelected}
        onViewChanges={handleViewChanges}
      />
      <PricingReferenceImportDialog
        fileKind="segments_grids"
        userRole={userRole}
        open={isSegmentsImportOpen}
        onOpenChange={setIsSegmentsImportOpen}
        onImported={handleImportSelected}
        onViewChanges={handleViewChanges}
      />
    </div>
  );
};

export default PricingReferencesPage;
