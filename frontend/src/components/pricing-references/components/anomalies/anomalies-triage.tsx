import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CircleCheck, Download, Search, X } from 'lucide-react';

import type {
  PricingReferenceAnomaliesSummaryGetInput,
  PricingReferenceAnomalySeverity,
  PricingReferenceAnomalyType
} from '../../../../../../shared/schemas/pricing/references.schema';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import {
  exportPricingReferenceAnomalies,
  getPricingReferenceAnomaliesSummary
} from '@/services/pricingReferences';
import { pricingReferenceAnomaliesSummaryKey } from '@/services/query/queryKeys';
import {
  anomalyTypeLabels,
  formatCount,
  severityLabels
} from '../../utils/pricing-references-formatters';
import { anomalySeverityDotClassName, anomalySeverityRank } from './anomaly-utils';
import { FacetedFilter, type FacetedFilterOption } from './faceted-filter';
import { AnomalyGroup, type AnomalyGroupFilters } from './anomaly-group';

export interface AnomalySeverityPreset {
  id: number;
  severities: PricingReferenceAnomalySeverity[];
}

interface AnomaliesTriageProps {
  importId?: string | null;
  severityPreset?: AnomalySeverityPreset | null;
}

const isKnownSeverity = (value: string): value is PricingReferenceAnomalySeverity =>
  value in anomalySeverityRank;

const withSelectedFallback = (
  options: FacetedFilterOption[],
  selectedValues: string[],
  labelFor: (value: string) => string
): FacetedFilterOption[] => {
  const knownValues = new Set(options.map((option) => option.value));
  const missing = selectedValues
    .filter((value) => !knownValues.has(value))
    .map((value) => ({ value, label: labelFor(value), count: 0 }));
  return [...options, ...missing];
};

const startSignedDownload = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Anomalies triage workspace: faceted toolbar (severity/type/marque + server search),
 * groups by anomaly type from the server summary, lazy row loading per group,
 * annotated XLSX export and distinct empty states. Header navigation can preselect
 * severities through `severityPreset`; the user can always reset the facets.
 */
export const AnomaliesTriage = ({ importId, severityPreset }: AnomaliesTriageProps) => {
  const [severities, setSeverities] = useState<PricingReferenceAnomalySeverity[]>([]);
  const [types, setTypes] = useState<PricingReferenceAnomalyType[]>([]);
  const [marques, setMarques] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [openTypes, setOpenTypes] = useState<ReadonlySet<string> | null>(null);
  const [appliedPresetId, setAppliedPresetId] = useState<number | null>(null);

  // State adjustment during render (React-sanctioned pattern): the header status
  // line pushes a one-shot severity preset; the user keeps full control afterwards.
  if (severityPreset && severityPreset.id !== appliedPresetId) {
    setAppliedPresetId(severityPreset.id);
    setSeverities(severityPreset.severities);
  }

  const summaryInput = useMemo(
    (): PricingReferenceAnomaliesSummaryGetInput => ({
      ...(importId ? { import_id: importId } : {}),
      ...(search ? { search } : {}),
      ...(severities.length > 0 ? { severities } : {}),
      ...(types.length > 0 ? { types } : {}),
      ...(marques.length > 0 ? { marques } : {})
    }),
    [importId, marques, search, severities, types]
  );

  const summaryQuery = useQuery({
    queryKey: pricingReferenceAnomaliesSummaryKey(summaryInput),
    queryFn: () => getPricingReferenceAnomaliesSummary(summaryInput)
  });

  useEffect(() => {
    if (summaryQuery.error) {
      handleUiError(summaryQuery.error, 'Impossible de charger la synthèse des anomalies.');
    }
  }, [summaryQuery.error]);

  const exportMutation = useMutation({
    mutationFn: () => exportPricingReferenceAnomalies(summaryInput),
    onSuccess: (response) => {
      startSignedDownload(response.download_url, response.filename);
      notifySuccess(`Export anomalies généré (${formatCount(response.row_count)} ligne(s)).`);
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de générer l export XLSX des anomalies.');
    }
  });

  const facets = summaryQuery.data?.facets;
  const total = summaryQuery.data?.total ?? 0;
  const hasActiveFilters =
    severities.length > 0 || types.length > 0 || marques.length > 0 || search !== '';

  const groups = useMemo(() => {
    const allGroups = summaryQuery.data?.groups_by_type ?? [];
    const visibleGroups =
      types.length > 0 ? allGroups.filter((group) => types.includes(group.type)) : allGroups;
    return [...visibleGroups].sort(
      (a, b) =>
        anomalySeverityRank[b.max_severity] - anomalySeverityRank[a.max_severity] ||
        b.count - a.count
    );
  }, [summaryQuery.data, types]);

  const severityOptions = useMemo((): FacetedFilterOption[] => {
    const options = (facets?.severities ?? [])
      .map((facet) => ({
        value: facet.value,
        label: facet.label,
        count: facet.count,
        ...(isKnownSeverity(facet.value)
          ? { dotClassName: anomalySeverityDotClassName[facet.value] }
          : {})
      }))
      .sort(
        (a, b) =>
          (isKnownSeverity(b.value) ? anomalySeverityRank[b.value] : -1) -
          (isKnownSeverity(a.value) ? anomalySeverityRank[a.value] : -1)
      );
    return withSelectedFallback(options, severities, (value) =>
      isKnownSeverity(value) ? severityLabels[value] : value
    );
  }, [facets, severities]);

  const typeOptions = useMemo((): FacetedFilterOption[] => {
    const options = (facets?.types ?? [])
      .map((facet) => ({ value: facet.value, label: facet.label, count: facet.count }))
      .sort((a, b) => b.count - a.count);
    return withSelectedFallback(options, types, (value) =>
      value in anomalyTypeLabels ? anomalyTypeLabels[value as PricingReferenceAnomalyType] : value
    );
  }, [facets, types]);

  const marqueOptions = useMemo((): FacetedFilterOption[] => {
    const options = (facets?.marques ?? [])
      .map((facet) => ({ value: facet.value, label: facet.label, count: facet.count }))
      .sort((a, b) => b.count - a.count);
    return withSelectedFallback(options, marques, (value) => value);
  }, [facets, marques]);

  const groupFilters = useMemo(
    (): AnomalyGroupFilters => ({
      ...(importId ? { import_id: importId } : {}),
      ...(search ? { search } : {}),
      ...(severities.length > 0 ? { severities } : {}),
      ...(marques.length > 0 ? { marques } : {})
    }),
    [importId, marques, search, severities]
  );

  const firstGroup = groups[0];
  const effectiveOpenTypes: ReadonlySet<string> =
    openTypes ?? new Set(firstGroup ? [firstGroup.type] : []);

  const handleToggleGroup = (type: string) => {
    const next = new Set(effectiveOpenTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setOpenTypes(next);
  };

  const resetFilters = () => {
    setSeverities([]);
    setTypes([]);
    setMarques([]);
    setSearch('');
  };

  const isHealthy = !summaryQuery.isLoading && !summaryQuery.isError && total === 0 && !hasActiveFilters;
  const isFilteredEmpty =
    !summaryQuery.isLoading && !summaryQuery.isError && hasActiveFilters && groups.length === 0;

  if (isHealthy) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-stone-200/60 bg-white px-6 py-16 text-center">
        <div className="grid size-10 place-items-center rounded-md bg-emerald-50 text-emerald-700">
          <CircleCheck className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold text-stone-950">Aucune anomalie détectée</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Toutes les données du référentiel semblent saines pour cet import.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200/60 bg-white">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-stone-200/60 px-4 py-1.5">
        <div className="relative w-full max-w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="anomalies-search"
            name="anomalies-search"
            density="dense"
            aria-label="Rechercher une anomalie"
            value={search}
            placeholder="Rechercher message, ligne…"
            className="h-7 border-border pl-8 text-xs"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <FacetedFilter
          label="Sévérité"
          options={severityOptions}
          selectedValues={severities}
          onChange={(values) => setSeverities(values.filter(isKnownSeverity))}
        />
        <FacetedFilter
          label="Type"
          options={typeOptions}
          selectedValues={types}
          onChange={(values) => setTypes(values as PricingReferenceAnomalyType[])}
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
          {formatCount(total)} anomalies
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || total === 0}
          className="h-7 shrink-0 gap-1.5 rounded-md border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-800 shadow-none hover:bg-stone-50"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {exportMutation.isPending ? 'Export…' : 'Exporter (XLSX)'}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {summaryQuery.isLoading ? (
          <div aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border-b border-stone-100">
                <div className="flex h-8 items-center bg-stone-50/80 px-4">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-stone-100" />
                </div>
                <div className="flex h-9 items-center px-4">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-50" />
                </div>
              </div>
            ))}
          </div>
        ) : summaryQuery.isError ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="grid size-9 place-items-center rounded-md bg-red-50 text-red-700">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold text-red-950">Anomalies indisponibles</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-red-800/80">
              La synthèse des anomalies n&apos;a pas pu être chargée. Le problème a été transmis au
              pipeline d&apos;erreurs.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void summaryQuery.refetch()}
              className="mt-4 h-8 border-red-200 bg-white text-xs font-semibold text-red-900 hover:bg-red-50"
            >
              Réessayer
            </Button>
          </div>
        ) : isFilteredEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-stone-950">
              Aucune anomalie ne correspond aux filtres
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
          groups.map((group) => (
            <AnomalyGroup
              key={group.type}
              group={group}
              filters={groupFilters}
              isOpen={effectiveOpenTypes.has(group.type)}
              onToggle={() => handleToggleGroup(group.type)}
            />
          ))
        )}
      </div>
    </div>
  );
};
