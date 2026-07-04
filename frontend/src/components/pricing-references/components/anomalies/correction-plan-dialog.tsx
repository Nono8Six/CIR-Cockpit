import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Search,
  Sparkles
} from 'lucide-react';

import type {
  PricingReferenceAnomaliesListResponse,
  PricingReferenceAnomalySeverity,
  PricingReferenceCorrectionPlanResponse
} from '../../../../../../shared/schemas/pricing/references.schema';

import { Badge } from '@/components/ui/data-display/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import { cn } from '@/lib/utils';
import {
  getPricingReferenceCorrectionPlan,
  listPricingReferenceAnomalies
} from '@/services/pricingReferences';
import { pricingReferenceCorrectionPlanKey } from '@/services/query/queryKeys';

const severityLabels: Record<PricingReferenceAnomalySeverity, string> = {
  bloquante: 'Bloquante',
  haute: 'Haute',
  moyenne: 'Moyenne',
  faible: 'Faible'
};

const severityClasses: Record<PricingReferenceAnomalySeverity, string> = {
  bloquante: 'border-rose-200 bg-rose-50 text-rose-700',
  haute: 'border-red-200 bg-red-50 text-red-700',
  moyenne: 'border-amber-200 bg-amber-50 text-amber-700',
  faible: 'border-stone-200 bg-stone-50 text-stone-600'
};

type AnomalyRow = PricingReferenceAnomaliesListResponse['rows'][number];
type CorrectionPlanGroup = PricingReferenceCorrectionPlanResponse['groups'][number];
type GroupSortMode = 'priority' | 'volume' | 'marque' | 'line';

const groupPageSizes = [5, 10, 20] as const;
const numberFormatter = new Intl.NumberFormat('fr-FR');
const sourceFileKindLabels: Record<CorrectionPlanGroup['source_files'][number]['file_kind'], string> = {
  classification: 'Classification CIR',
  segments_grids: 'Segments et grilles fabricant'
};

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const anomalyContext = (row: AnomalyRow) => {
  const rawValues = readRecord(row.details.raw_values);
  const segmentKeyParts = readString(row.details, 'segment_key')?.split('|') ?? [];
  return {
    segment: readString(rawValues, 'SEGMENT') ?? segmentKeyParts[0] ?? null,
    marque: readString(rawValues, 'MARQUE') ?? segmentKeyParts[2] ?? null,
    category: readString(rawValues, 'CAT_FAB') ?? segmentKeyParts[3] ?? null
  };
};

const buildFallbackCorrectionPlan = (
  rows: AnomalyRow[],
  importId: string | null
): PricingReferenceCorrectionPlanResponse => {
  const totals = rows.reduce(
    (accumulator, row) => ({
      total: accumulator.total + 1,
      bloquante: accumulator.bloquante + (row.severity === 'bloquante' ? 1 : 0),
      haute: accumulator.haute + (row.severity === 'haute' ? 1 : 0),
      moyenne: accumulator.moyenne + (row.severity === 'moyenne' ? 1 : 0),
      faible: accumulator.faible + (row.severity === 'faible' ? 1 : 0)
    }),
    { total: 0, bloquante: 0, haute: 0, moyenne: 0, faible: 0 }
  );
  const severityWeight: Record<PricingReferenceAnomalySeverity, number> = {
    bloquante: 4,
    haute: 3,
    moyenne: 2,
    faible: 1
  };
  const groups = new Map<string, { row: AnomalyRow; rows: AnomalyRow[]; columns: string[]; context: ReturnType<typeof anomalyContext> }>();
  rows.forEach((row) => {
    const context = anomalyContext(row);
    const columns = [...new Set(row.columns)].sort();
    const key = [
      row.type,
      row.severity,
      context.marque ?? '-',
      context.segment ?? '-',
      context.category ?? '-',
      columns.join(','),
      row.message
    ].join('|');
    const group = groups.get(key);
    if (group) {
      group.rows.push(row);
      return;
    }
    groups.set(key, { row, rows: [row], columns, context });
  });
  const mappedGroups = [...groups.values()]
    .sort((left, right) =>
      severityWeight[right.row.severity] - severityWeight[left.row.severity] ||
      right.rows.length - left.rows.length ||
      left.row.message.localeCompare(right.row.message)
    )
    .slice(0, 40)
    .map((group, index) => {
      const sourceRows = [...new Set(group.rows
        .map((row) => row.source_row_number)
        .filter((rowNumber): rowNumber is number => typeof rowNumber === 'number'))]
        .sort((left, right) => left - right)
        .slice(0, 20);
      const sourceFiles = [...new Set(group.rows
        .map((row) => row.source_file)
        .filter((sourceFile): sourceFile is NonNullable<AnomalyRow['source_file']> => Boolean(sourceFile))
        .map((sourceFile) => `${sourceFile.file_kind}|${sourceFile.original_filename}`))]
        .map((sourceFileKey) => {
          const [file_kind, original_filename] = sourceFileKey.split('|');
          return {
            file_kind: file_kind as CorrectionPlanGroup['source_files'][number]['file_kind'],
            original_filename
          };
        });
      return {
        id: `fallback-${index + 1}`,
        rank: index + 1,
        type: group.row.type,
        severity: group.row.severity,
        marque: group.context.marque,
        segment: group.context.segment,
        category: group.context.category,
        columns: group.columns,
        anomaly_count: group.rows.length,
        impacted_rows: sourceRows.length || group.rows.length,
        source_rows: sourceRows,
        source_files: sourceFiles,
        message: group.row.message,
        evidence: [
          `${group.rows.length} anomalie(s) dans ce groupe.`,
          group.context.marque ? `Marque: ${group.context.marque}.` : null,
          sourceFiles.length > 0
            ? `Fichier source: ${sourceFiles.map((file) => file.original_filename).join(', ')}.`
            : null,
          sourceRows.length > 0 ? `Lignes sources: ${sourceRows.join(', ')}.` : null
        ].filter((value): value is string => Boolean(value)),
        excel_action: group.columns.length > 0
          ? `Completer dans Excel les champs concernes: ${group.columns.join(', ')}.`
          : 'Corriger les valeurs source signalees dans Excel, puis relancer un import controle.',
        can_suggest_values: false,
        value_suggestion_reason: 'Aucune valeur proposee sans preuve deterministe majoritaire ou historique valide.'
      };
    });

  return {
    ok: true,
    request_id: 'client-fallback',
    import_id: rows[0]?.import_id ?? importId,
    snapshot_id: rows[0]?.snapshot_id ?? null,
    generated_at: new Date().toISOString(),
    totals,
    groups: mappedGroups,
    deterministic_recommendations: mappedGroups.length > 0
      ? [
        `Commencer par le groupe #${mappedGroups[0].rank}: ${mappedGroups[0].message}`,
        'Relancer un import controle apres correction du fichier Excel source.'
      ]
      : ['Aucune anomalie detectee sur le perimetre courant.'],
    ai_policy: {
      mode: 'secondary_interpretation_only',
      can_modify_source: false,
      can_modify_database: false,
      can_invent_values: false
    }
  };
};

type CorrectionPlanDialogProps = {
  open: boolean;
  importId: string | null;
  onOpenChange: (open: boolean) => void;
};

export const CorrectionPlanDialog = ({
  open,
  importId,
  onOpenChange
}: CorrectionPlanDialogProps) => {
  const [groupSearch, setGroupSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<PricingReferenceAnomalySeverity | 'all'>('all');
  const [sortMode, setSortMode] = useState<GroupSortMode>('priority');
  const [pageSize, setPageSize] = useState<(typeof groupPageSizes)[number]>(5);
  const [groupPage, setGroupPage] = useState(1);
  const scope = useMemo(() => importId ? { import_id: importId } : {}, [importId]);
  const planQuery = useQuery({
    queryKey: pricingReferenceCorrectionPlanKey(scope),
    queryFn: () => getPricingReferenceCorrectionPlan(scope),
    enabled: open,
    retry: false
  });
  const fallbackAnomaliesQuery = useQuery({
    queryKey: ['pricing-references', 'correction-plan-fallback', scope],
    queryFn: async () => {
      const rows: AnomalyRow[] = [];
      let page = 1;
      let total = 0;
      do {
        const response = await listPricingReferenceAnomalies({
          ...scope,
          page,
          page_size: 100,
          sort_by: 'created_at',
          sort_direction: 'desc'
        });
        rows.push(...response.rows);
        total = response.total;
        page += 1;
      } while (rows.length < total);
      return rows;
    },
    enabled: open && planQuery.isError,
    retry: false
  });
  const fallbackPlan = useMemo(
    () => fallbackAnomaliesQuery.data ? buildFallbackCorrectionPlan(fallbackAnomaliesQuery.data, importId) : null,
    [fallbackAnomaliesQuery.data, importId]
  );
  const plan = planQuery.data ?? fallbackPlan;
  const isLoadingPlan = planQuery.isLoading || (planQuery.isError && fallbackAnomaliesQuery.isLoading);
  const visibleGroups = useMemo(() => {
    if (!plan) return [];
    const search = groupSearch.trim().toLowerCase();
    const matchingGroups = plan.groups.filter((group) => {
      if (severityFilter !== 'all' && group.severity !== severityFilter) return false;
      if (!search) return true;
      const searchable = [
        group.message,
        group.excel_action,
        group.marque,
        group.segment,
        group.category,
        ...group.columns,
        ...group.evidence
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(search);
    });
    return [...matchingGroups].sort((left, right) => sortGroups(left, right, sortMode));
  }, [groupSearch, plan, severityFilter, sortMode]);
  const pageCount = Math.max(1, Math.ceil(visibleGroups.length / pageSize));
  const activePage = Math.min(groupPage, pageCount);
  const paginatedGroups = visibleGroups.slice((activePage - 1) * pageSize, activePage * pageSize);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = paginatedGroups.find((group) => group.id === selectedGroupId) ?? paginatedGroups[0] ?? null;
  const hasActiveGroupFilter = Boolean(groupSearch.trim()) || severityFilter !== 'all' || sortMode !== 'priority';
  const filteredPriorityTotals = visibleGroups.reduce(
    (accumulator, group) => ({
      bloquante: accumulator.bloquante + (group.severity === 'bloquante' ? group.anomaly_count : 0),
      haute: accumulator.haute + (group.severity === 'haute' ? group.anomaly_count : 0)
    }),
    { bloquante: 0, haute: 0 }
  );
  const displayTotals = hasActiveGroupFilter
    ? filteredPriorityTotals
    : { bloquante: plan?.totals.bloquante ?? 0, haute: plan?.totals.haute ?? 0 };
  const resetGroupPage = () => setGroupPage(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-6xl gap-0 overflow-hidden border-stone-200 bg-white p-0 shadow-2xl sm:w-[min(100vw-2rem,72rem)] sm:rounded-md"
        overlayClassName="bg-stone-950/25 backdrop-blur-[2px]"
        showCloseButton
      >
        <div className="border-b border-stone-200 px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-stone-950">
                Plan de correction
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl text-sm text-stone-500">
                Regroupement deterministe des anomalies. L IA reste une aide secondaire pour interpreter et prioriser, sans modifier les donnees.
              </DialogDescription>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 border border-stone-200 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              <Sparkles className="size-3.5 text-stone-500" aria-hidden="true" />
              Interpréter avec IA
            </button>
          </div>
        </div>

        <div className="max-h-[min(78vh,48rem)] overflow-y-auto overscroll-contain bg-stone-50/70">
          {isLoadingPlan ? (
            <div className="p-6 text-sm text-stone-500">Chargement du plan de correction...</div>
          ) : !plan ? (
            <div className="p-6 text-sm text-stone-500">Plan indisponible.</div>
          ) : (
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className="min-w-0 border border-stone-200 bg-white">
                <div className="border-b border-stone-200 px-4 py-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-stone-950">Groupes actionnables</h3>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {numberFormatter.format(visibleGroups.length)} groupe(s) sur {numberFormatter.format(plan.groups.length)}.
                          {plan.totals.total > 0 ? ` ${numberFormatter.format(plan.totals.total)} anomalie(s) source.` : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-sm border-stone-200 text-[10px] uppercase tracking-wider">
                        Lecture seule
                      </Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem_10rem_7rem]">
                      <label className="relative block">
                        <span className="sr-only">Rechercher dans les groupes de correction</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                        <input
                          type="search"
                          name="correction-plan-search"
                          value={groupSearch}
                          onChange={(event) => {
                            setGroupSearch(event.target.value);
                            resetGroupPage();
                          }}
                          placeholder="Filtrer marque, type, colonne…"
                          className="h-9 w-full border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 hover:border-stone-300 focus-visible:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-200"
                          autoComplete="off"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Filtrer par sévérité</span>
                        <select
                          name="correction-plan-severity"
                          value={severityFilter}
                          onChange={(event) => {
                            setSeverityFilter(event.target.value as PricingReferenceAnomalySeverity | 'all');
                            resetGroupPage();
                          }}
                          className="h-9 w-full border border-stone-200 bg-white px-2 text-xs font-medium text-stone-700 outline-none transition-colors hover:border-stone-300 focus-visible:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-200"
                        >
                          <option value="all">Toutes</option>
                          <option value="bloquante">Bloquantes</option>
                          <option value="haute">Hautes</option>
                          <option value="moyenne">Moyennes</option>
                          <option value="faible">Faibles</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="sr-only">Trier les groupes</span>
                        <select
                          name="correction-plan-sort"
                          value={sortMode}
                          onChange={(event) => {
                            setSortMode(event.target.value as GroupSortMode);
                            resetGroupPage();
                          }}
                          className="h-9 w-full border border-stone-200 bg-white px-2 text-xs font-medium text-stone-700 outline-none transition-colors hover:border-stone-300 focus-visible:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-200"
                        >
                          <option value="priority">Priorité</option>
                          <option value="volume">Volume</option>
                          <option value="marque">Marque</option>
                          <option value="line">Ligne source</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="sr-only">Groupes par page</span>
                        <select
                          name="correction-plan-page-size"
                          value={pageSize}
                          onChange={(event) => {
                            setPageSize(Number(event.target.value) as (typeof groupPageSizes)[number]);
                            resetGroupPage();
                          }}
                          className="h-9 w-full border border-stone-200 bg-white px-2 text-xs font-medium text-stone-700 outline-none transition-colors hover:border-stone-300 focus-visible:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-200"
                        >
                          {groupPageSizes.map((size) => (
                            <option key={size} value={size}>{size} / page</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-stone-200">
                  {paginatedGroups.length === 0 ? (
                    <div className="flex items-center gap-3 px-4 py-6 text-sm text-stone-600">
                      <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                      Aucun groupe ne correspond aux filtres.
                    </div>
                  ) : paginatedGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={cn(
                        'grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 md:grid-cols-[6rem_minmax(0,1fr)]',
                        selectedGroup?.id === group.id && 'bg-stone-50'
                      )}
                    >
                    <div>
                      <div className="text-2xl font-semibold tabular-nums tracking-tight text-stone-950">
                        {group.anomaly_count}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('mt-2 rounded-sm border text-[10px] font-semibold uppercase tracking-wider', severityClasses[group.severity])}
                      >
                        {severityLabels[group.severity]}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="min-w-0 text-sm font-semibold text-stone-950">{group.message}</h4>
                        {group.marque && (
                          <span className="border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                            {group.marque}
                          </span>
                        )}
                        {group.category && (
                          <span className="border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                            {group.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-stone-700">{group.excel_action}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {group.columns.map((column) => (
                          <span
                            key={column}
                            className="border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-700"
                          >
                            {column}
                          </span>
                        ))}
                      </div>
                      <ul className="mt-3 grid gap-1 text-xs text-stone-500">
                        {group.evidence.map((evidence) => (
                          <li key={evidence}>{evidence}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs font-medium text-stone-600">
                        Source: {formatSourceFiles(group)} · lignes Excel {formatSourceRows(group)}
                      </p>
                      <p className="mt-3 border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
                        {group.value_suggestion_reason}
                      </p>
                    </div>
                  </button>
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-3 text-xs text-stone-600 md:flex-row md:items-center md:justify-between">
                  <span>
                    Page {activePage} / {pageCount}, {numberFormatter.format(visibleGroups.length)} groupe(s) filtré(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupPage((current) => Math.max(1, current - 1))}
                      disabled={activePage <= 1}
                      className="inline-flex h-8 items-center gap-1 border border-stone-200 bg-white px-2 font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ChevronLeft className="size-3.5" aria-hidden="true" />
                      Précédent
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupPage((current) => Math.min(pageCount, current + 1))}
                      disabled={activePage >= pageCount}
                      className="inline-flex h-8 items-center gap-1 border border-stone-200 bg-white px-2 font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Suivant
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </section>

              <aside className="grid content-start gap-4">
                <section className="border border-stone-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-stone-950">Intérêt du plan</h3>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-600">
                    La page standard montre les anomalies ligne par ligne. Ce plan regroupe les lignes qui ont la même cause,
                    les mêmes colonnes et le même contexte métier pour créer un lot de correction Excel.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="border border-stone-200 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Bloquantes</div>
                      <div className="mt-1 text-xl font-semibold text-stone-950">{displayTotals.bloquante}</div>
                    </div>
                    <div className="border border-stone-200 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Hautes</div>
                      <div className="mt-1 text-xl font-semibold text-stone-950">{displayTotals.haute}</div>
                    </div>
                  </div>
                </section>

                {selectedGroup ? (
                  <section className="border border-stone-200 bg-white">
                    <div className="border-b border-stone-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-stone-950">Lot sélectionné</h3>
                          <p className="mt-1 text-xs leading-5 text-stone-500">
                            {selectedGroup.anomaly_count} ligne(s) à corriger ensemble, sans modification automatique.
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('rounded-sm border text-[10px] font-semibold uppercase tracking-wider', severityClasses[selectedGroup.severity])}
                        >
                          {severityLabels[selectedGroup.severity]}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-4 p-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Où corriger</div>
                        <div className="mt-2 grid gap-2">
                          {sourceFilesForGroup(selectedGroup).map((file) => (
                            <div key={`${file.file_kind}-${file.original_filename ?? 'inferred'}`} className="border border-stone-200 bg-stone-50 p-3">
                              <div className="text-xs font-semibold text-stone-950">{sourceFileKindLabels[file.file_kind]}</div>
                              <div className="mt-1 break-words font-mono text-[11px] text-stone-600">
                                {file.original_filename ?? 'Nom exact non fourni par le rapport actif'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Lignes Excel</div>
                        <div className="border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-700">
                          {formatSourceRows(selectedGroup)}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Contexte métier</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <ContextValue label="Marque" value={selectedGroup.marque} />
                          <ContextValue label="Segment" value={selectedGroup.segment} />
                          <ContextValue label="Catégorie" value={selectedGroup.category} />
                          <ContextValue label="Type" value={selectedGroup.message} />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Colonnes à corriger</div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGroup.columns.map((column) => (
                            <span key={column} className="border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-700">
                              {column}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border border-stone-200 bg-stone-50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Action Excel</div>
                        <p className="mt-2 text-sm leading-5 text-stone-800">{selectedGroup.excel_action}</p>
                      </div>

                      <div className="border border-amber-200 bg-amber-50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Limite déterministe</div>
                        <p className="mt-2 text-xs leading-5 text-amber-900">
                          {selectedGroup.value_suggestion_reason} Le plan indique donc où intervenir et quelles colonnes traiter,
                          mais ne remplit pas de valeur à votre place.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ContextValue = ({ label, value }: { label: string; value: string | null }) => (
  <div className="border border-stone-200 bg-white p-2">
    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</div>
    <div className="mt-1 break-words text-xs font-medium text-stone-900">{value ?? '-'}</div>
  </div>
);

const sourceFilesForGroup = (
  group: CorrectionPlanGroup
): Array<{ file_kind: CorrectionPlanGroup['source_files'][number]['file_kind']; original_filename: string | null }> => {
  if (group.source_files.length > 0) return group.source_files;
  if (group.type.startsWith('classification_')) {
    return [{ file_kind: 'classification', original_filename: null }];
  }
  return [{ file_kind: 'segments_grids', original_filename: null }];
};

const formatSourceFiles = (group: CorrectionPlanGroup): string =>
  sourceFilesForGroup(group)
    .map((file) => file.original_filename
      ? `${sourceFileKindLabels[file.file_kind]} (${file.original_filename})`
      : sourceFileKindLabels[file.file_kind])
    .join(', ');

const formatSourceRows = (group: CorrectionPlanGroup): string =>
  group.source_rows.length > 0 ? group.source_rows.join(', ') : 'Non renseignées';

const firstSourceRow = (group: CorrectionPlanGroup): number =>
  group.source_rows[0] ?? Number.MAX_SAFE_INTEGER;

const sortGroups = (
  left: CorrectionPlanGroup,
  right: CorrectionPlanGroup,
  sortMode: GroupSortMode
): number => {
  switch (sortMode) {
    case 'volume':
      return right.anomaly_count - left.anomaly_count || left.rank - right.rank;
    case 'marque':
      return (left.marque ?? 'zz').localeCompare(right.marque ?? 'zz') || left.rank - right.rank;
    case 'line':
      return firstSourceRow(left) - firstSourceRow(right) || left.rank - right.rank;
    case 'priority':
    default:
      return left.rank - right.rank;
  }
};
