import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Database,
  ListTree,
  Search,
  UploadCloud,
  X
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
import { NativeSelect } from './components/inputs/form-field';
import { SegmentedControl } from './components/inputs/segmented-control';
import { ReferenceTable, type DataColumn } from './components/table/reference-table';

import { ImportRows } from './components/imports/import-rows';
import { PaginationBar } from './components/table/pagination-bar';
import { SegmentDetailDialog } from './components/segments/segment-detail-dialog';
import { HealthStrip, type TabId } from './components/health/health-strip';
import { PricingReferenceImportDialog } from './pricing-reference-import-dialog';
import { ClassificationDrillDown } from './components/classification/classification-drilldown';
import { AnomaliesTriage, type AnomalySeverityPreset } from './components/anomalies/anomalies-triage';

// Formatters and label mappings
import { formatCount, formatDateTime, linkStatusLabels } from './utils/pricing-references-formatters';

type ClassificationRow = PricingReferenceClassificationListResponse['rows'][number];
type SegmentRow = PricingReferenceSegmentsListResponse['rows'][number];
const DEFAULT_PAGE_SIZE = 50;

const tabItems: Array<{ id: TabId; label: string }> = [
  { id: 'segments', label: 'Segments' },
  { id: 'classification', label: 'Classification' },
  { id: 'anomalies', label: 'Anomalies' },
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
  const [localActiveTab, setLocalActiveTab] = useState<TabId>(DEFAULT_TAB);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
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

  const canImport = userRole === 'super_admin';

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
  const visibleImports = useMemo(
    () => importsQuery.data?.imports ?? [],
    [importsQuery.data]
  );
  const totalImports = importsQuery.data?.total ?? 0;
  const activeImport = useMemo(
    () =>
      visibleImports.find(
        (row) => row.status === 'analyse_ok' || row.status === 'pret_activation'
      ) ?? null,
    [visibleImports]
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

  const segmentColumns = useMemo<Array<DataColumn<SegmentRow>>>(
    () => [
      {
        id: 'marque',
        label: 'Marque',
        sortBy: 'marque',
        className: 'font-medium text-foreground',
        render: (row) => row.marque
      },
      {
        id: 'cat_fab',
        label: 'Cat fab',
        sortBy: 'cat_fab',
        className: 'text-muted-foreground',
        render: (row) => row.cat_fab
      },
      {
        id: 'segment',
        label: 'Segment',
        sortBy: 'segment',
        className: 'text-muted-foreground tabular-nums',
        render: (row) => row.segment
      },
      {
        id: 'idnumerique',
        label: 'ID',
        sortBy: 'idnumerique',
        className: 'font-mono text-muted-foreground tabular-nums',
        render: (row) => row.idnumerique
      },
      { id: 'cat_fab_l', label: 'Libellé', render: (row) => row.cat_fab_l ?? '-' },
      { id: 'cir_key', label: 'Clé CIR', className: 'font-mono tabular-nums text-foreground', render: (row) => row.cir_key ?? '-' },
      {
        id: 'link_status',
        label: 'Liaison',
        sortBy: 'link_status',
        render: (row) => {
          if (!row.link_status || row.link_status === 'complete_valid') {
            return (
              <span className="text-muted-foreground/45" aria-label={row.link_status ? 'Liaison complète valide' : 'Liaison inconnue'}>
                —
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-amber-800">
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              {linkStatusLabels[row.link_status]}
            </span>
          );
        }
      },
      {
        id: 'grids',
        label: 'Grilles',
        sortBy: 'purchase_grid_rows_count',
        className: 'text-right font-mono text-muted-foreground tabular-nums',
        render: (row) => formatCount(row.purchase_grid_rows_count)
      }
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
            <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  selectedImportId ? 'bg-stone-300' : 'bg-emerald-500'
                )}
                aria-hidden="true"
              />
              {selectedImportId ? 'Import sélectionné' : 'Snapshot actif'}
            </span>
          </div>

          {canImport ? (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
            </div>
          ) : null}
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
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab 4: Imports */}
        <TabsContent
          value="imports"
          className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 pt-1"
        >
          {/* Active snapshot summary */}
          {(activeImport || importStatus === 'all') && (
            <section className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-lg border border-border/70 bg-surface-1 px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-lg',
                    activeImport ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Database className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    {activeImport
                      ? `Snapshot actif — import du ${formatDateTime(activeImport.analysis_completed_at ?? activeImport.created_at)}`
                      : 'Aucun snapshot actif'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {activeImport
                      ? `${formatCount(activeImport.classification_rows_count)} lignes classification · ${formatCount(activeImport.segments_rows_count)} lignes segments · ${formatCount(activeImport.anomalies_total)} anomalies`
                      : 'Importez la classification CIR puis les segments et grilles pour initialiser le référentiel.'}
                  </p>
                </div>
              </div>
              {!canImport && (
                <span className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Réservé super admin
                </span>
              )}
            </section>
          )}

          {/* Import History list */}
          <div className="flex min-h-0 flex-1 flex-col gap-3.5">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
                Historique des imports
              </h2>
              <SegmentedControl
                ariaLabel="Filtrer les imports par statut"
                value={importStatus}
                options={importStatusFilters.map((filter) => ({
                  value: filter.value,
                  label: filter.label,
                  ariaLabel: `Filtrer les imports : ${filter.label}`,
                  prefix:
                    filter.value === 'all' ? (
                      <span className="mr-1.5 font-mono text-[10px] tabular-nums">
                        {formatCount(totalImports)}
                      </span>
                    ) : undefined
                }))}
                onChange={(value) => {
                  setImportStatus(value);
                  setImportPage(1);
                }}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-between">
              <div className="flex-1 overflow-y-auto pb-2">
                <ImportRows
                  rows={visibleImports}
                  selectedImportId={selectedImportId}
                  onSelect={handleImportSelected}
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
          <ReferenceTable
            rows={segmentsQuery.data?.rows ?? []}
            columns={segmentColumns}
            rowKey={(row) => row.id}
            isLoading={segmentsQuery.isLoading}
            isFetching={segmentsQuery.isFetching}
            page={segmentsPage}
            pageSize={segmentsPageSize}
            total={segmentsQuery.data?.total ?? 0}
            sortBy={segmentsSort.sort_by}
            sortDirection={segmentsSort.sort_direction}
            emptyLabel="Aucun segment trouvé"
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
                <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatCount(segmentsQuery.data?.total)} segments
                </span>
              </>
            }
            onRowClick={(row) => setSelectedSegment(row)}
            rowActionLabel="Voir le détail du segment"
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
          <SegmentDetailDialog segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
        </TabsContent>

        {/* Tab 4: Anomalies */}
        <TabsContent
          value="anomalies"
          className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden pt-2"
        >
          <AnomaliesTriage importId={selectedImportId} severityPreset={anomalySeverityPreset} />
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
