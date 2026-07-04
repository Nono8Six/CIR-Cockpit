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
  pricingReferenceImportStatusSchema,
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





/**
 * Main Pricing References workspace component.
 * Allows super-admins to import raw classifications/grids, and all admins to view and analyze anomalies.
 */
const PricingReferencesPage = ({ userRole }: { userRole: UserRole }) => {
  const [isClassificationImportOpen, setIsClassificationImportOpen] = useState(false);
  const [isSegmentsImportOpen, setIsSegmentsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('imports');
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
      setActiveTab(tab);
      if (tab === 'links') {
        if (filters?.linkStatus !== undefined) {
          setSegmentsLinkStatus(filters.linkStatus);
        }
        setSegmentsPage(1);
      }
    },
    []
  );

  // Column definitions for ReferenceTable
  const classificationColumns = useMemo<Array<DataColumn<ClassificationRow>>>(
    () => [
      {
        id: 'cir_key',
        label: 'Clé CIR',
        sortBy: 'cir_key',
        className: 'font-mono text-slate-700 tracking-tight font-semibold',
        render: (row) => row.cir_key
      },
      {
        id: 'mega',
        label: 'Mega',
        sortBy: 'mega',
        className: 'font-mono text-slate-500 tabular-nums',
        render: (row) => row.mega
      },
      { id: 'mega_lib', label: 'Libellé mega', render: (row) => row.mega_lib },
      {
        id: 'fam',
        label: 'Fam',
        sortBy: 'fam',
        className: 'font-mono text-slate-500 tabular-nums',
        render: (row) => row.fam
      },
      { id: 'fam_lib', label: 'Libellé famille', render: (row) => row.fam_lib },
      {
        id: 'sfa',
        label: 'SFA',
        sortBy: 'sfa',
        className: 'font-mono text-slate-500 tabular-nums',
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
        className: 'font-bold text-slate-900',
        render: (row) => row.marque
      },
      {
        id: 'cat_fab',
        label: 'Cat fab',
        sortBy: 'cat_fab',
        className: 'font-mono text-slate-600',
        render: (row) => row.cat_fab
      },
      {
        id: 'segment',
        label: 'Segment',
        sortBy: 'segment',
        className: 'font-mono text-slate-500 tabular-nums',
        render: (row) => row.segment
      },
      {
        id: 'idnumerique',
        label: 'ID',
        sortBy: 'idnumerique',
        className: 'font-mono text-slate-500 tabular-nums',
        render: (row) => row.idnumerique
      },
      { id: 'cat_fab_l', label: 'Libellé', render: (row) => row.cat_fab_l ?? '-' },
      { id: 'cir_key', label: 'Clé CIR', className: 'font-mono text-slate-700', render: (row) => row.cir_key ?? '-' },
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
        className: 'font-mono text-slate-600 tabular-nums text-right pr-4',
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
            className="h-7 text-xs px-2.5 bg-background shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
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
      className="flex h-full min-h-0 flex-col gap-4 overflow-hidden"
      data-testid="pricing-references-page"
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 shrink-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Référentiels CIR
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Importation, contrôle d&apos;intégrité et consultations paginées des exports de classification et segments.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={selectedImportId ? 'default' : 'secondary'}
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white"
          >
            {selectedImportId ? 'Import sélectionné' : 'Dernier snapshot actif'}
          </Badge>
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
        onValueChange={(value) => setActiveTab(value as TabId)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="overflow-x-auto shrink-0 select-none">
          <TabsList className="flex h-9 w-full justify-start gap-5 border-b border-slate-200 bg-transparent p-0 rounded-none">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-xs font-semibold text-muted-foreground/80 transition-all duration-200 hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none active:scale-[0.98] flex items-center gap-1.5"
              >
                <tab.icon className="size-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="pricing-references-active-tab-line"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab 1: Imports */}
        <TabsContent
          value="imports"
          className="min-h-0 flex-1 flex flex-col gap-4 overflow-y-auto pr-1 pt-2"
        >
          {/* Action cards for import files */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-slate-200 bg-surface-1 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-slate-300 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ListTree className="size-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">
                    Classification produit CIR
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Importez les codes MEGA/FAM/SFA et les libellés de classification produit.
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                {!canImport && (
                  <span className="text-[9px] text-muted-foreground/80 font-bold uppercase tracking-wide">
                    Réservé super admin
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={!canImport}
                  onClick={() => setIsClassificationImportOpen(true)}
                  className="h-8 text-xs font-semibold active:scale-[0.98] transition-all"
                >
                  Importer la classification
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 bg-surface-1 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-slate-300 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Database className="size-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">
                    Segments et grilles fabricant
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Importez les segments fabricant, les liaisons de classification et les grilles
                  d&apos;achat.
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                {!canImport && (
                  <span className="text-[9px] text-muted-foreground/80 font-bold uppercase tracking-wide">
                    Réservé super admin
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={!canImport}
                  onClick={() => setIsSegmentsImportOpen(true)}
                  className="h-8 text-xs font-semibold active:scale-[0.98] transition-all"
                >
                  Importer les segments et grilles
                </Button>
              </div>
            </div>
          </div>

          {/* Import History lists */}
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200/80 bg-slate-50/50 p-3 rounded-xl shadow-sm shrink-0">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Historique des imports
              </h2>
              <NativeSelect
                id="pricing-import-status"
                label="Filtrer par statut"
                value={importStatus}
                options={[
                  { value: 'all', label: 'Tous les statuts' },
                  ...pricingReferenceImportStatusSchema.options.map((status) => ({
                    value: status,
                    label: importStatusLabels[status]
                  }))
                ]}
                onChange={(value) => {
                  setImportStatus(value as PricingReferenceImportStatus | 'all');
                  setImportPage(1);
                }}
              />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="hidden md:grid gap-3 px-4 py-2 border border-slate-200/80 border-b-0 bg-slate-50/50 rounded-t-xl text-[9px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 select-none">
                <span>Statut</span>
                <span>Date d&apos;import</span>
                <span>ID / Message d&apos;erreur</span>
                <span>Lignes importées</span>
                <span>Anomalies</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ImportRows
                  rows={importsQuery.data?.imports ?? []}
                  selectedImportId={selectedImportId}
                  onSelect={handleImportSelected}
                />
              </div>
              <div className="shrink-0 bg-background border border-slate-200/80 rounded-b-xl">
                <ReferenceTable
                  rows={[]}
                  columns={[]}
                  isLoading={false}
                  isFetching={false}
                  page={importPage}
                  pageSize={importPageSize}
                  total={importsQuery.data?.total ?? 0}
                  sortBy=""
                  sortDirection="asc"
                  emptyLabel=""
                  onSort={() => {}}
                  onPageChange={setImportPage}
                  onPageSizeChange={(nextPageSize) => {
                    setImportPageSize(nextPageSize);
                    setImportPage(1);
                  }}
                />
              </div>
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
            <div className="flex items-center gap-1 border border-slate-200 bg-slate-100 p-0.5 rounded-lg text-xs select-none">
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
              <div className="grid gap-3.5 border border-slate-200/80 bg-slate-50/40 p-3.5 rounded-xl shadow-sm lg:grid-cols-[minmax(14rem,1fr)_8rem_8rem_auto] items-end shrink-0">
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
          <div className="grid gap-3.5 border border-slate-200/80 bg-slate-50/40 p-3.5 rounded-xl shadow-sm lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_12rem] items-end shrink-0">
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
          <div className="grid gap-3.5 border border-slate-200/80 bg-slate-50/40 p-3.5 rounded-xl shadow-sm lg:grid-cols-[12rem_minmax(14rem,1fr)] items-end shrink-0">
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
                className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-[background-color,border-color,color,transform] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98]"
              >
                <Sparkles className="size-3.5 text-slate-500" aria-hidden="true" />
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
          <section className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">
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
                className="grid gap-3 border border-slate-200 bg-background p-4 rounded-xl shadow-sm hover:shadow-md transition-all md:grid-cols-[10rem_minmax(0,1fr)_10rem_10rem] items-center"
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
                  <p className="truncate font-mono text-xs text-slate-900 font-semibold">
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
