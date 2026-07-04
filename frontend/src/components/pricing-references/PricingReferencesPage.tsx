import { useCallback, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Database,
  Filter,
  History,
  Link2,
  ListTree,
  UploadCloud,
  Sparkles,
  type LucideIcon
} from 'lucide-react';

import {
  pricingReferenceLinkStatusSchema,
  type PricingReferenceAnomalySeverity,
  type PricingReferenceClassificationListInput,
  type PricingReferenceClassificationListResponse,
  type PricingReferenceClassificationSortBy,
  type PricingReferenceImportStatus,
  type PricingReferenceImportsListInput,
  type PricingReferenceLinkStatus,
  type PricingReferenceSegmentsListInput,
  type PricingReferenceSegmentsListResponse,
  type PricingReferenceSegmentsSortBy,
  type PricingReferenceSortDirection
} from '../../../../shared/schemas/pricing/references.schema';

import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/inputs/basic/ToggleGroup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/Tabs';
import { cn } from '@/lib/utils';
import {
  getPricingReferenceHealth,
  listPricingReferenceClassification,
  listPricingReferenceImports,
  listPricingReferenceSegments
} from '@/services/pricingReferences';
import {
  pricingReferenceClassificationKey,
  pricingReferenceHealthKey,
  pricingReferenceImportsKey,
  pricingReferenceSegmentsKey
} from '@/services/query/queryKeys';
import type { UserRole } from '@/types';

// UI components extracted for one-fn-per-file compliance
import { FormField, NativeSelect } from './components/inputs/form-field';
import { ReferenceTable, type DataColumn } from './components/table/reference-table';

import { ImportRows } from './components/imports/import-rows';
import { PaginationBar } from './components/table/pagination-bar';
import { SegmentDetailPanel } from './components/segments/segment-detail-panel';
import { HealthStrip, type TabId } from './components/health/health-strip';
import { PricingReferenceImportDialog } from './pricing-reference-import-dialog';
import { ClassificationDrillDown } from './components/classification/classification-drilldown';
import { AnomalyDrillDown } from './components/anomalies/anomaly-drilldown';
import { CorrectionPlanDialog } from './components/anomalies/correction-plan-dialog';

// Formatters and label mappings
import {
  formatCount,
  formatDateTime,
  getStatusVariant,
  importStatusLabels,
  linkStatusLabels
} from './utils/pricing-references-formatters';

type ClassificationRow = PricingReferenceClassificationListResponse['rows'][number];
type SegmentRow = PricingReferenceSegmentsListResponse['rows'][number];
const DEFAULT_PAGE_SIZE = 50;

const tabItems: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'imports', label: 'Imports', icon: UploadCloud },
  { id: 'classification', label: 'Classification CIR', icon: ListTree },
  { id: 'segments', label: 'Segments fabricant', icon: Database },
  { id: 'links', label: 'Liaisons', icon: Link2 },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'history', label: 'Historique', icon: History }
];

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
  const [localActiveTab, setLocalActiveTab] = useState<TabId>('imports');
  const [importSubTab, setImportSubTab] = useState<'classification' | 'segments'>('classification');
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentRow | null>(null);

  // Layout control states
  const [showCorrectionPlan, setShowCorrectionPlan] = useState(false);
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

  const canImport = userRole === 'super_admin';
  const isRouteControlled = onRouteTabChange !== undefined;
  const activeTab = isRouteControlled ? routeTab ?? 'imports' : localActiveTab;

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
      search: classificationSearch || undefined,
      filters: {
        ...(classificationMega ? { mega: classificationMega } : {}),
        ...(classificationFam ? { fam: classificationFam } : {})
      },
      ...classificationSort
    }),
    [
      classificationFam,
      classificationMega,
      classificationPage,
      classificationPageSize,
      classificationSearch,
      classificationSort,
      selectedImportId
    ]
  );

  const segmentsInput = useMemo(
    (): PricingReferenceSegmentsListInput => ({
      page: segmentsPage,
      page_size: segmentsPageSize,
      ...(selectedImportId ? { import_id: selectedImportId } : {}),
      search: segmentsSearch || undefined,
      filters: {
        ...(segmentsMarque ? { marque: segmentsMarque } : {}),
        ...(segmentsCatFab ? { cat_fab: segmentsCatFab } : {}),
        ...(segmentsLinkStatus === 'all' ? {} : { link_status: segmentsLinkStatus })
      },
      ...segmentsSort
    }),
    [
      segmentsCatFab,
      segmentsLinkStatus,
      segmentsMarque,
      segmentsPage,
      segmentsPageSize,
      segmentsSearch,
      segmentsSort,
      selectedImportId
    ]
  );



  // Queries
  const importsQuery = useQuery({
    queryKey: pricingReferenceImportsKey(importsInput),
    queryFn: () => listPricingReferenceImports(importsInput)
  });
  const visibleImports = importsQuery.data?.imports ?? [];
  const totalImports = importsQuery.data?.total ?? 0;

  const healthInput = useMemo(
    () => (selectedImportId ? { import_id: selectedImportId } : {}),
    [selectedImportId]
  );

  const healthQuery = useQuery({
    queryKey: pricingReferenceHealthKey(healthInput),
    queryFn: () => getPricingReferenceHealth(healthInput)
  });

  const classificationQuery = useQuery({
    queryKey: pricingReferenceClassificationKey(classificationInput),
    queryFn: () => listPricingReferenceClassification(classificationInput)
  });

  const segmentsQuery = useQuery({
    queryKey: pricingReferenceSegmentsKey(segmentsInput),
    queryFn: () => listPricingReferenceSegments(segmentsInput)
  });

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
      if (tab === 'links') {
        if (filters?.linkStatus !== undefined) {
          setSegmentsLinkStatus(filters.linkStatus);
        }
        setSegmentsPage(1);
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
        className: 'font-mono text-stone-700 tracking-tight font-semibold',
        render: (row) => row.cir_key
      },
      {
        id: 'mega',
        label: 'Mega',
        sortBy: 'mega',
        className: 'font-mono text-stone-500 tabular-nums',
        render: (row) => row.mega
      },
      { id: 'mega_lib', label: 'Libellé mega', render: (row) => row.mega_lib },
      {
        id: 'fam',
        label: 'Fam',
        sortBy: 'fam',
        className: 'font-mono text-stone-500 tabular-nums',
        render: (row) => row.fam
      },
      { id: 'fam_lib', label: 'Libellé famille', render: (row) => row.fam_lib },
      {
        id: 'sfa',
        label: 'SFA',
        sortBy: 'sfa',
        className: 'font-mono text-stone-500 tabular-nums',
        render: (row) => row.sfa
      },
      { id: 'sfa_lib', label: 'Libellé SFA', render: (row) => row.sfa_lib }
    ],
    []
  );

  const segmentColumns = useMemo<Array<DataColumn<SegmentRow>>>(
    () => [
      {
        id: 'marque',
        label: 'Marque',
        sortBy: 'marque',
        className: 'font-bold text-stone-900',
        render: (row) => row.marque
      },
      {
        id: 'cat_fab',
        label: 'Cat fab',
        sortBy: 'cat_fab',
        className: 'font-mono text-stone-600',
        render: (row) => row.cat_fab
      },
      {
        id: 'segment',
        label: 'Segment',
        sortBy: 'segment',
        className: 'font-mono text-stone-500 tabular-nums',
        render: (row) => row.segment
      },
      {
        id: 'idnumerique',
        label: 'ID',
        sortBy: 'idnumerique',
        className: 'font-mono text-stone-500 tabular-nums',
        render: (row) => row.idnumerique
      },
      { id: 'cat_fab_l', label: 'Libellé', render: (row) => row.cat_fab_l ?? '-' },
      { id: 'cir_key', label: 'Clé CIR', className: 'font-mono text-stone-700', render: (row) => row.cir_key ?? '-' },
      {
        id: 'link_status',
        label: 'Liaison',
        sortBy: 'link_status',
        render: (row) =>
          row.link_status ? (
            <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5">
              {linkStatusLabels[row.link_status]}
            </Badge>
          ) : (
            '-'
          )
      },
      {
        id: 'grids',
        label: 'Grilles',
        sortBy: 'purchase_grid_rows_count',
        className: 'font-mono text-stone-600 tabular-nums text-right pr-4',
        render: (row) => formatCount(row.purchase_grid_rows_count)
      },
      {
        id: 'details',
        label: 'Détail',
        render: (row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedSegment(row)}
            className="h-7 text-xs px-2.5 bg-background shadow-sm hover:bg-stone-50 active:scale-[0.98] transition-all"
          >
            Détail
          </Button>
        )
      }
    ],
    []
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-transparent px-0 text-stone-950"
      data-testid="pricing-references-page"
    >
      {/* Page Header */}
      <div className="shrink-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[1.55rem] font-extrabold leading-none tracking-tight text-stone-950 text-pretty">
                Référentiels CIR
              </h1>
              <Badge
                variant="secondary"
                className={cn(
                  'gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] shadow-none',
                  selectedImportId
                    ? 'border-stone-300 bg-stone-100 text-stone-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                )}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                {selectedImportId ? 'Import sélectionné' : 'Snapshot actif'}
              </Badge>
            </div>
            <p className="mt-2 max-w-[43rem] text-xs leading-snug text-stone-600">
              Import, contrôle d&apos;intégrité et consultation des classifications et segments de
              remises fabricant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canImport}
              onClick={() => setIsClassificationImportOpen(true)}
              className="group h-8 rounded-md border border-stone-200/80 bg-white px-3 text-[11px] font-bold text-stone-900 transition-[background-color,border-color,color,transform] hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98]"
            >
              <UploadCloud className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
              Importer la classification
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canImport}
              onClick={() => setIsSegmentsImportOpen(true)}
              className="group h-8 rounded-md bg-primary text-primary-foreground px-3 text-[11px] font-bold transition-[background-color,box-shadow,transform] hover:bg-primary/95 active:scale-[0.98]"
            >
              <UploadCloud className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
              Importer les segments et grilles
            </Button>
          </div>
        </div>
      </div>

      {/* Global Health strip cards */}
      <div className="shrink-0">
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
        <div className="shrink-0 select-none overflow-x-auto pb-0.5">
          <TabsList className="inline-flex h-10 w-max justify-start gap-1 rounded-xl border border-stone-200/70 bg-surface-3 p-1 text-stone-600 shadow-[0_12px_24px_-22px_rgba(28,25,23,0.65)]">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-stone-600 shadow-none transition-[color,background-color,box-shadow,transform] hover:bg-white/70 hover:text-stone-950 data-[state=active]:bg-stone-950 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_18px_-14px_rgba(28,25,23,0.85)] active:translate-y-px"
              >
                <tab.icon className="size-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {activeTab === tab.id ? (
                  <motion.span
                    layoutId="pricing-references-active-tab-dot"
                    className="absolute inset-x-3 -bottom-1 mx-auto h-0.5 rounded-full bg-stone-950/25"
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  />
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab 1: Imports */}
        <TabsContent
          value="imports"
          className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 pt-1"
        >
          {/* Sub-tabs / Segmented Control */}
          <div className="flex items-center justify-between gap-4 shrink-0 select-none pb-0.5">
            <div className="flex items-center gap-1 border border-stone-200/50 bg-surface-3/60 p-0.5 rounded-lg text-xs h-8">
              <button
                type="button"
                onClick={() => {
                  setImportSubTab('classification');
                  setImportPage(1);
                }}
                className={cn(
                  'h-7 px-3.5 rounded-md font-semibold text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60',
                  importSubTab === 'classification'
                    ? 'bg-white text-stone-950 shadow-sm border border-stone-200/20'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/30'
                )}
              >
                Classification CIR
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportSubTab('segments');
                  setImportPage(1);
                }}
                className={cn(
                  'h-7 px-3.5 rounded-md font-semibold text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60',
                  importSubTab === 'segments'
                    ? 'bg-white text-stone-950 shadow-sm border border-stone-200/20'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/30'
                )}
              >
                Segments & grilles
              </button>
            </div>
          </div>

          {/* Minimalist context banners (Both kept in DOM for automated tests but visual visibility is toggle-controlled) */}
          <div className={cn("flex flex-col gap-3.5 border border-stone-200/50 bg-surface-1 px-4 py-3 rounded-xl shrink-0 transition-opacity", importSubTab !== 'classification' && 'hidden')}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-stone-900">
                  Classification produit CIR
                </h3>
                <p className="mt-0.5 text-[11px] text-stone-500 leading-normal">
                  Codes MEGA, FAM, SFA et libellés produit CIR. Cette classification constitue le socle indispensable pour l&apos;application et le contrôle de cohérence des remises.
                </p>
              </div>
              {!canImport && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-stone-400 border border-stone-200 px-2 py-0.5 rounded bg-surface-1">
                  Réservé super admin
                </span>
              )}
            </div>
          </div>

          <div className={cn("flex flex-col gap-3.5 border border-stone-200/50 bg-surface-1 px-4 py-3 rounded-xl shrink-0 transition-opacity", importSubTab !== 'segments' && 'hidden')}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-stone-900">
                  Segments et grilles fabricant
                </h3>
                <p className="mt-0.5 text-[11px] text-stone-500 leading-normal">
                  Segments fabricant, liaisons vers la classification produit CIR et grilles de taux d&apos;achat associées pour le calcul des remises.
                </p>
              </div>
              {!canImport && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-stone-400 border border-stone-200 px-2 py-0.5 rounded bg-surface-1">
                  Réservé super admin
                </span>
              )}
            </div>
          </div>

          {/* Import History list */}
          <div className="flex min-h-0 flex-1 flex-col gap-3.5">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Historique des imports
              </h2>
              <ToggleGroup
                type="single"
                value={importStatus}
                onValueChange={(value) => {
                  if (!value) return;
                  setImportStatus(value as PricingReferenceImportStatus | 'all');
                  setImportPage(1);
                }}
                spacing={0}
                className="rounded-lg border border-stone-200/50 bg-surface-3/60 p-0.5 h-8 select-none"
              >
                {importStatusFilters.map((filter) => {
                  const suffix = filter.value === 'all' ? formatCount(totalImports) : null;

                  return (
                    <ToggleGroupItem
                      key={filter.value}
                      value={filter.value}
                      aria-label={`Filtrer les imports : ${filter.label}`}
                      className="h-7 rounded-md border-0 px-3 text-[11px] font-semibold text-stone-500 shadow-none transition-colors hover:text-stone-900 data-[state=on]:bg-white data-[state=on]:text-stone-950 data-[state=on]:shadow-sm"
                    >
                      {suffix ? <span className="mr-1.5 font-mono text-[10px] tabular-nums">{suffix}</span> : null}
                      {filter.label}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-between">
              <div className="flex-1 overflow-y-auto pb-2">
                <ImportRows
                  rows={visibleImports}
                  selectedImportId={selectedImportId}
                  onSelect={handleImportSelected}
                  viewMode={importSubTab}
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
          </div>
        </TabsContent>

        {/* Tab 2: Classification */}
        <TabsContent
          value="classification"
          className="min-h-0 flex-1 flex flex-col gap-3.5 overflow-hidden pt-2"
        >
          {/* View mode toggle switcher */}
          <div className="flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-1 border border-stone-200 bg-stone-100 p-0.5 rounded-lg text-xs select-none">
              <button
                type="button"
                onClick={() => setClassificationViewMode('drilldown')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-semibold transition-all active:scale-[0.98]',
                  classificationViewMode === 'drilldown'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Vue Escalier (Hiérarchique)
              </button>
              <button
                type="button"
                onClick={() => setClassificationViewMode('table')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-semibold transition-all active:scale-[0.98]',
                  classificationViewMode === 'table'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Vue Tableau (Plat)
              </button>
            </div>
          </div>

          {classificationViewMode === 'drilldown' ? (
            <ClassificationDrillDown importId={selectedImportId} />
          ) : (
            <>
              <div className="grid gap-3.5 border border-stone-200/80 bg-stone-50/40 p-3.5 rounded-xl shadow-sm lg:grid-cols-[minmax(14rem,1fr)_8rem_8rem_auto] items-end shrink-0">
                <FormField label="Recherche" htmlFor="classification-search">
                  <Input
                    id="classification-search"
                    name="classification-search"
                    density="dense"
                    value={classificationSearch}
                    placeholder="Clé ou libellé..."
                    onChange={(event) => {
                      setClassificationSearch(event.target.value);
                      setClassificationPage(1);
                    }}
                  />
                </FormField>
                <FormField label="Mega" htmlFor="classification-mega">
                  <Input
                    id="classification-mega"
                    name="classification-mega"
                    density="dense"
                    value={classificationMega}
                    onChange={(event) => {
                      setClassificationMega(event.target.value);
                      setClassificationPage(1);
                    }}
                  />
                </FormField>
                <FormField label="Fam" htmlFor="classification-fam">
                  <Input
                    id="classification-fam"
                    name="classification-fam"
                    density="dense"
                    value={classificationFam}
                    onChange={(event) => {
                      setClassificationFam(event.target.value);
                      setClassificationPage(1);
                    }}
                  />
                </FormField>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold active:scale-[0.98] transition-all bg-background shadow-sm"
                  onClick={() => classificationQuery.refetch()}
                >
                  <Filter className="size-3.5 mr-1.5" aria-hidden="true" />
                  Actualiser
                </Button>
              </div>
              <ReferenceTable
                rows={classificationQuery.data?.rows ?? []}
                columns={classificationColumns}
                isLoading={classificationQuery.isLoading}
                isFetching={classificationQuery.isFetching}
                page={classificationPage}
                pageSize={classificationPageSize}
                total={classificationQuery.data?.total ?? 0}
                sortBy={classificationSort.sort_by}
                sortDirection={classificationSort.sort_direction}
                emptyLabel="Aucune classification trouvée"
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
            </>
          )}
        </TabsContent>

        {/* Tab 3: Segments */}
        <TabsContent
          value="segments"
          className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden pt-2"
        >
          <div className="grid gap-3.5 border border-stone-200/80 bg-stone-50/40 p-3.5 rounded-xl shadow-sm lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_12rem] items-end shrink-0">
            <FormField label="Recherche" htmlFor="segments-search">
              <Input
                id="segments-search"
                name="segments-search"
                density="dense"
                value={segmentsSearch}
                placeholder="Marque, catégorie..."
                onChange={(event) => {
                  setSegmentsSearch(event.target.value);
                  setSegmentsPage(1);
                }}
              />
            </FormField>
            <FormField label="Marque" htmlFor="segments-marque">
              <Input
                id="segments-marque"
                name="segments-marque"
                density="dense"
                value={segmentsMarque}
                onChange={(event) => {
                  setSegmentsMarque(event.target.value);
                  setSegmentsPage(1);
                }}
              />
            </FormField>
            <FormField label="Cat fab" htmlFor="segments-cat-fab">
              <Input
                id="segments-cat-fab"
                name="segments-cat-fab"
                density="dense"
                value={segmentsCatFab}
                onChange={(event) => {
                  setSegmentsCatFab(event.target.value);
                  setSegmentsPage(1);
                }}
              />
            </FormField>
            <NativeSelect
              id="segments-link-status"
              label="Liaison"
              value={segmentsLinkStatus}
              options={[
                { value: 'all', label: 'Toutes' },
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
          </div>
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <ReferenceTable
              rows={segmentsQuery.data?.rows ?? []}
              columns={segmentColumns}
              isLoading={segmentsQuery.isLoading}
              isFetching={segmentsQuery.isFetching}
              page={segmentsPage}
              pageSize={segmentsPageSize}
              total={segmentsQuery.data?.total ?? 0}
              sortBy={segmentsSort.sort_by}
              sortDirection={segmentsSort.sort_direction}
              emptyLabel="Aucun segment trouvé"
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
            />
            <SegmentDetailPanel segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
          </div>
        </TabsContent>

        {/* Tab 4: Links */}
        <TabsContent
          value="links"
          className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden pt-2"
        >
          <div className="grid gap-3.5 border border-stone-200/80 bg-stone-50/40 p-3.5 rounded-xl shadow-sm lg:grid-cols-[12rem_minmax(14rem,1fr)] items-end shrink-0">
            <NativeSelect
              id="links-status"
              label="Statut liaison"
              value={segmentsLinkStatus}
              options={[
                { value: 'all', label: 'Toutes' },
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
            <FormField label="Recherche liaison" htmlFor="links-search">
              <Input
                id="links-search"
                name="links-search"
                density="dense"
                value={segmentsSearch}
                placeholder="Marque, catégorie, clé CIR..."
                onChange={(event) => {
                  setSegmentsSearch(event.target.value);
                  setSegmentsPage(1);
                }}
              />
            </FormField>
          </div>
          <ReferenceTable
            rows={segmentsQuery.data?.rows ?? []}
            columns={segmentColumns}
            isLoading={segmentsQuery.isLoading}
            isFetching={segmentsQuery.isFetching}
            page={segmentsPage}
            pageSize={segmentsPageSize}
            total={segmentsQuery.data?.total ?? 0}
            sortBy={segmentsSort.sort_by}
            sortDirection={segmentsSort.sort_direction}
            emptyLabel="Aucune liaison trouvée"
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
          />
        </TabsContent>

        {/* Tab 5: Anomalies & correction plan */}
        <TabsContent
          value="anomalies"
          className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden pt-2"
        >
          <div className="flex shrink-0 justify-end">
            {healthQuery.data?.health_report && (
              <button
                type="button"
                onClick={() => setShowCorrectionPlan(true)}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-700 shadow-sm transition-[background-color,border-color,color,transform] hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950 active:scale-[0.98]"
              >
                <Sparkles className="size-3.5 text-stone-500" aria-hidden="true" />
                Plan de correction
              </button>
            )}
          </div>

          <CorrectionPlanDialog
            open={showCorrectionPlan}
            importId={selectedImportId}
            onOpenChange={setShowCorrectionPlan}
          />

          <div className="flex min-h-0 flex-1 flex-col">
            <AnomalyDrillDown importId={selectedImportId} />
          </div>
        </TabsContent>

        {/* Tab 6: History */}
        <TabsContent value="history" className="min-h-0 flex-1 space-y-4 overflow-auto pt-2">
          <section className="border border-stone-200 bg-stone-50/50 p-4 rounded-xl shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-sans">
              Historique des imports
            </h2>
            <p className="mt-1 text-xs text-muted-foreground font-sans">
              Lecture seule. Les actions diff, activation et archivage restent hors tranche.
            </p>
          </section>
          <div className="grid gap-3">
            {(importsQuery.data?.imports ?? []).map((row) => (
              <article
                key={row.id}
                className="grid gap-3 border border-stone-200 bg-background p-4 rounded-xl shadow-sm hover:shadow-md transition-all md:grid-cols-[10rem_minmax(0,1fr)_10rem_10rem] items-center"
              >
                <div className="shrink-0">
                  <Badge
                    variant={getStatusVariant(row.status)}
                    className="px-2 py-0.5 text-xs font-semibold"
                  >
                    {importStatusLabels[row.status]}
                  </Badge>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-stone-900 font-semibold">
                    {row.id}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground font-medium">
                    {formatDateTime(row.created_at)}
                  </p>
                </div>
                <p className="font-mono text-xs tabular-nums text-muted-foreground font-semibold">
                  {formatCount(row.segments_rows_count)} lignes
                </p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground font-semibold">
                  {formatCount(row.anomalies_total)} anomalies
                </p>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Import dialogs */}
      <PricingReferenceImportDialog
        fileKind="classification"
        open={isClassificationImportOpen}
        onOpenChange={setIsClassificationImportOpen}
        onImported={handleImportSelected}
      />
      <PricingReferenceImportDialog
        fileKind="segments_grids"
        open={isSegmentsImportOpen}
        onOpenChange={setIsSegmentsImportOpen}
        onImported={handleImportSelected}
      />
    </div>
  );
};

export default PricingReferencesPage;
