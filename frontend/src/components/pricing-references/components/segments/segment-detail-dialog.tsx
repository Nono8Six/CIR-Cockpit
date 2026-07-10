import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Factory,
  Info,
  Loader2,
  RefreshCw,
  Store
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/feedback/Tooltip';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/Table';
import { cn } from '@/lib/utils';
import { getPricingReferenceSegmentDetail } from '@/services/pricingReferences';
import { pricingReferenceSegmentDetailKey } from '@/services/query/queryKeys';
import type { PricingReferenceSegmentDetailResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { formatCount, linkStatusLabels } from '../../utils/pricing-references-formatters';
import type { SegmentRow } from './segment-grid-config';

type SegmentDetail = PricingReferenceSegmentDetailResponse['segment'];
type PurchaseGridRow = PricingReferenceSegmentDetailResponse['purchase_grid_rows'][number];

interface SegmentDetailDialogProps {
  segment: SegmentRow | null;
  onClose: () => void;
}

interface DetailField {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}

const decimalFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  signDisplay: 'always'
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const formatEmpty = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const parseDecimal = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.').replace(/^x/i, '');
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCoefficient = (value: string | null | undefined): string => {
  const parsed = parseDecimal(value);
  return parsed === null ? formatEmpty(value) : `× ${decimalFormatter.format(parsed)}`;
};

const formatCoefficientImpact = (value: string | null | undefined): string | null => {
  const parsed = parseDecimal(value);
  return parsed === null ? null : `${percentFormatter.format((parsed - 1) * 100)} %`;
};

const formatDate = (normalized: string | null, raw: string | null): string => {
  const value = normalized ?? raw;
  if (!value) return '-';
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

const CompactField = ({ label, value, mono = false }: DetailField) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-medium text-muted-foreground">{label}</dt>
    <dd
      className={cn(
        'mt-0.5 truncate text-xs font-medium text-foreground',
        mono && 'font-mono tabular-nums'
      )}
      title={formatEmpty(value)}
    >
      {formatEmpty(value)}
    </dd>
  </div>
);

const DetailBand = ({
  title,
  fields,
  className
}: {
  title: string;
  fields: DetailField[];
  className?: string;
}) => (
  <section className={cn('min-w-0 px-4 py-3', className)}>
    <h3 className="mb-3 text-[11px] font-semibold text-foreground">{title}</h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{fields.map((field) => <CompactField key={field.label} {...field} />)}</dl>
  </section>
);

const buildIdentityFields = (segment: SegmentDetail | SegmentRow): DetailField[] => [
  { label: 'Marque', value: segment.marque },
  { label: 'Catégorie fabricant', value: segment.cat_fab, mono: true },
  { label: 'Libellé catégorie', value: segment.cat_fab_l },
  { label: 'Segment', value: segment.segment, mono: true },
  { label: 'ID numérique', value: segment.idnumerique, mono: true },
  { label: 'Stratégique', value: segment.strategiq },
  { label: 'Codif FAIR', value: segment.codif_fair, mono: true },
  { label: 'Tarif fabricant', value: segment.tarif_fab, mono: true }
];

const buildClassificationFields = (segment: SegmentDetail | SegmentRow): DetailField[] => [
  { label: 'Clé CIR', value: segment.cir_key, mono: true },
  { label: 'Statut liaison', value: segment.link_status ? linkStatusLabels[segment.link_status] : null },
  { label: 'Méga-famille', value: `${formatEmpty(segment.mega_famille)} · ${formatEmpty(segment.mega_libelle)}` },
  { label: 'Famille', value: `${formatEmpty(segment.famille)} · ${formatEmpty(segment.famille_libelle)}` },
  { label: 'Sous-famille', value: `${formatEmpty(segment.sous_famille)} · ${formatEmpty(segment.sfam_libelle)}` },
  { label: 'Grilles achat', value: formatCount(segment.purchase_grid_rows_count), mono: true }
];

const CoefficientHelp = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="Définition du coefficient de rétrocession"
        className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-72 leading-relaxed" side="top">
      Coefficient appliqué par le centre logistique au prix de rétrocession vers les agences CIR. Un coefficient × 1,03 représente une majoration de 3 %.
    </TooltipContent>
  </Tooltip>
);

const PricingFlow = ({ rows }: { rows: PurchaseGridRow[] }) => {
  const singleRetro = rows.length === 1 ? rows[0]?.coef_retro : null;
  const singleImpact = formatCoefficientImpact(singleRetro);

  return (
    <div className="grid min-h-16 grid-cols-1 border-b border-border/60 bg-muted/20 sm:grid-cols-[1fr_auto_1.25fr_auto_1fr] sm:items-stretch">
      <div className="flex min-w-0 items-center gap-3 px-4 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
          <Factory className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground">Étape 1</p>
          <p className="truncate text-xs font-semibold text-foreground">Achat fabricant</p>
          <p className="truncate text-[10px] text-muted-foreground">Remise, borne et coef. HA</p>
        </div>
      </div>
      <ArrowRight className="mx-1 hidden size-4 self-center text-muted-foreground/55 sm:block" aria-hidden="true" />
      <div className="flex min-w-0 items-center gap-3 border-y border-border/60 bg-background px-4 py-2.5 sm:border-x sm:border-y-0">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/5 text-primary">
          <Building2 className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-medium text-muted-foreground">Étape 2 · Centre logistique CIR</p>
            <CoefficientHelp />
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="truncate text-xs font-semibold text-foreground">
              {singleRetro ? `Rétrocession ${formatCoefficient(singleRetro)}` : 'Rétrocession vers le réseau'}
            </p>
            {singleImpact ? <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-primary">{singleImpact}</span> : null}
          </div>
        </div>
      </div>
      <ArrowRight className="mx-1 hidden size-4 self-center text-muted-foreground/55 sm:block" aria-hidden="true" />
      <div className="flex min-w-0 items-center gap-3 px-4 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
          <Store className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground">Étape 3</p>
          <p className="truncate text-xs font-semibold text-foreground">Agence CIR</p>
          <p className="truncate text-[10px] text-muted-foreground">Coefficient de majoration vente</p>
        </div>
      </div>
    </div>
  );
};

const RawGridCell = ({ value, className }: { value: string | number | null | undefined; className?: string }) => (
  <TableCell className={cn('h-11 whitespace-nowrap px-3 py-2 font-mono text-[11.5px] tabular-nums text-foreground', className)} title={formatEmpty(value)}>
    {formatEmpty(value)}
  </TableCell>
);

const CoefficientCell = ({ value, highlight = false }: { value: string | null; highlight?: boolean }) => {
  const impact = formatCoefficientImpact(value);
  return (
    <TableCell className={cn('h-11 whitespace-nowrap px-3 py-1.5', highlight && 'bg-primary/[0.035]')}>
      <div className={cn('font-mono text-[11.5px] font-semibold tabular-nums', highlight ? 'text-primary' : 'text-foreground')}>
        {formatCoefficient(value)}
      </div>
      {impact ? <div className="mt-0.5 font-mono text-[9.5px] tabular-nums text-muted-foreground">{impact}</div> : null}
    </TableCell>
  );
};

const PurchaseGridTable = ({ rows, isLoading }: { rows: PurchaseGridRow[]; isLoading: boolean }) => (
  <section className="min-h-0 border-t border-border/70 bg-background" aria-labelledby="purchase-grid-heading">
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <h3 id="purchase-grid-heading" className="text-xs font-semibold text-foreground">Conditions d’achat & rétrocession</h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Une ligne représente une condition fournisseur applicable au segment.</p>
      </div>
      <span className="shrink-0 rounded-md border border-border bg-muted/25 px-2 py-1 font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
        {formatCount(rows.length)} {rows.length === 1 ? 'grille' : 'grilles'}
      </span>
    </div>
    <PricingFlow rows={rows} />
    {isLoading ? (
      <div className="space-y-2 px-4 py-4" aria-live="polite">
        <div className="h-8 animate-pulse rounded bg-muted/65" />
        <div className="h-11 animate-pulse rounded bg-muted/45" />
      </div>
    ) : rows.length === 0 ? (
      <div className="flex min-h-28 items-center justify-center px-4 py-6 text-xs text-muted-foreground">Aucune condition d’achat rattachée à ce segment.</div>
    ) : (
      <div className="max-h-[36vh] overflow-auto overscroll-contain border-t border-border/60">
        <Table scrollArea={false} className="min-w-[1160px] border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="hover:bg-transparent">
              <TableHead colSpan={4} className="h-6 border-r border-border/60 bg-muted/30 px-3 text-[9px] font-semibold uppercase text-muted-foreground">Condition fournisseur</TableHead>
              <TableHead colSpan={3} className="h-6 border-r border-border/60 bg-muted/30 px-3 text-[9px] font-semibold uppercase text-muted-foreground">Achat fabricant</TableHead>
              <TableHead className="h-6 border-r border-primary/10 bg-primary/[0.045] px-3 text-[9px] font-semibold uppercase text-primary">Centre logistique</TableHead>
              <TableHead className="h-6 border-r border-border/60 bg-muted/30 px-3 text-[9px] font-semibold uppercase text-muted-foreground">Agence CIR</TableHead>
              <TableHead className="h-6 bg-muted/30 px-3 text-[9px] font-semibold uppercase text-muted-foreground">Source</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              {['Priorité', 'N° fournisseur', 'Type / colonne', 'Période de validité', 'Remise HA', 'Borne achat', 'Coef. HA'].map((label) => (
                <TableHead key={label} className="h-8 whitespace-nowrap border-b border-border/60 bg-white px-3 text-[10px] font-medium normal-case">{label}</TableHead>
              ))}
              <TableHead className="h-8 whitespace-nowrap border-b border-primary/10 bg-primary/[0.035] px-3 text-[10px] font-medium normal-case">
                <span className="inline-flex items-center gap-1">Coef. rétro <CoefficientHelp /></span>
              </TableHead>
              <TableHead className="h-8 whitespace-nowrap border-b border-border/60 bg-white px-3 text-[10px] font-medium normal-case">Coef. maj. vente</TableHead>
              <TableHead className="h-8 whitespace-nowrap border-b border-border/60 bg-white px-3 text-[10px] font-medium normal-case">Ligne</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/45">
            {rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/20">
                <TableCell className="h-11 px-3 py-2">
                  <span className="inline-flex min-w-6 items-center justify-center rounded border border-border bg-muted/35 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-foreground">{formatEmpty(row.priorite)}</span>
                </TableCell>
                <RawGridCell value={row.num_four} />
                <TableCell className="h-11 whitespace-nowrap px-3 py-2 text-[11.5px] text-foreground">
                  <div className="font-medium">{formatEmpty(row.type_grill)}</div>
                  <div className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">Col. {formatEmpty(row.col_ha)}</div>
                </TableCell>
                <TableCell className="h-11 whitespace-nowrap px-3 py-2 font-mono text-[10.5px] tabular-nums text-foreground">
                  {formatDate(row.date_debut_normalized, row.date_debut_raw)}
                  <ArrowRight className="mx-1.5 inline size-3 text-muted-foreground" aria-hidden="true" />
                  {formatDate(row.date_fin_normalized, row.date_fin_raw)}
                </TableCell>
                <RawGridCell value={row.remise_ha} />
                <RawGridCell value={row.borne_acha} />
                <CoefficientCell value={row.coef_ha} />
                <CoefficientCell value={row.coef_retro} highlight />
                <CoefficientCell value={row.coef_majvte} />
                <RawGridCell value={row.source_row_number} className="text-muted-foreground" />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </section>
);

const SourceTrace = ({ segment }: { segment: SegmentDetail | SegmentRow }) => {
  const fields: DetailField[] = [
    { label: 'Clé segment', value: segment.segment_key, mono: true },
    { label: 'Ligne segment', value: segment.source_row_number, mono: true },
    { label: 'Ligne liaison', value: 'link_source_row_number' in segment ? segment.link_source_row_number : null, mono: true },
    { label: 'Snapshot', value: segment.snapshot_id, mono: true },
    { label: 'Import', value: segment.import_id, mono: true },
    { label: 'Fichier source', value: 'source_file_id' in segment ? segment.source_file_id : null, mono: true }
  ];

  return (
    <section className="border-t border-border/70 bg-muted/15 px-4 py-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold text-foreground">Traçabilité source</span>
        <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 xl:grid-cols-6">
        {fields.map((field) => <CompactField key={field.label} {...field} />)}
      </dl>
    </section>
  );
};

export const SegmentDetailDialog = ({ segment, onClose }: SegmentDetailDialogProps) => {
  const segmentId = segment?.id ?? null;
  const detailQuery = useQuery({
    queryKey: pricingReferenceSegmentDetailKey({ segment_id: segmentId }),
    queryFn: () => getPricingReferenceSegmentDetail({ segment_id: segmentId ?? '' }),
    enabled: segmentId !== null
  });
  const detailSegment = detailQuery.data?.segment ?? segment;
  const purchaseRows = detailQuery.data?.purchase_grid_rows ?? [];

  return (
    <TooltipProvider delayDuration={250}>
      <Dialog open={segment !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent
          className="flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[1480px] flex-col gap-0 overflow-hidden rounded-lg border-border/70 bg-white p-0 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)]"
          overlayClassName="bg-foreground/30 backdrop-blur-[2px]"
        >
          {detailSegment ? (
            <>
              <DialogHeader className="border-b border-border/70 px-5 py-3.5 pr-14 text-left">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <div className="min-w-0">
                    <div className="mb-0.5 text-[10px] font-medium uppercase text-muted-foreground">Segment fabricant</div>
                    <DialogTitle className="truncate text-base font-semibold text-foreground">
                      {detailSegment.marque} · {detailSegment.cat_fab_l ?? detailSegment.cat_fab}
                    </DialogTitle>
                  </div>
                  <span className="rounded-md border border-border bg-muted/25 px-2 py-1 font-mono text-[10px] font-medium tabular-nums text-foreground">
                    {detailSegment.segment}
                  </span>
                  <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                    ID {detailSegment.idnumerique}
                  </span>
                  {detailSegment.link_status === 'complete_valid' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-success/20 bg-success/5 px-2 py-1 text-[10px] font-medium text-success">
                      <CheckCircle2 className="size-3" aria-hidden="true" /> Liaison CIR valide
                    </span>
                  ) : detailSegment.link_status ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning/5 px-2 py-1 text-[10px] font-medium text-warning">
                      <AlertCircle className="size-3" aria-hidden="true" /> {linkStatusLabels[detailSegment.link_status]}
                    </span>
                  ) : null}
                </div>
                <DialogDescription className="sr-only">Détail complet du segment, de sa classification CIR et de ses conditions d’achat.</DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {detailQuery.isError ? (
                  <div className="m-4 flex items-center justify-between gap-3 rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive" role="alert">
                    <span className="inline-flex items-center gap-2"><AlertCircle className="size-4" aria-hidden="true" />Impossible de charger les données complètes du segment.</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void detailQuery.refetch()}><RefreshCw className="size-3.5" aria-hidden="true" />Réessayer</Button>
                  </div>
                ) : (
                  <>
                    <div className="grid border-b border-border/70 bg-white md:grid-cols-2">
                      <DetailBand title="Identité fabricant" fields={buildIdentityFields(detailSegment)} className="border-b border-border/60 md:border-b-0 md:border-r" />
                      <DetailBand title="Classification CIR" fields={buildClassificationFields(detailSegment)} />
                    </div>
                    {detailQuery.isLoading ? (
                      <div className="sr-only" aria-live="polite"><Loader2 className="animate-spin" />Chargement du détail segment…</div>
                    ) : null}
                    <PurchaseGridTable rows={purchaseRows} isLoading={detailQuery.isLoading} />
                    <SourceTrace segment={detailSegment} />
                  </>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
