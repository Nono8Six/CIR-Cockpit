import { useCallback, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import type {
  MotorCatalogListInput,
  MotorCatalogListResponse
} from 'shared/schemas/configurator/motor.schema';

import { Input } from '@/components/ui/inputs/basic/Input';
import { useDebouncedValue } from '@/hooks/utils/useDebouncedValue';
import { useMotorCatalogList } from '@/hooks/configurator/useMotorCatalogList';
import { cn } from '@/lib/utils';
import { ConfiguratorEmptyState } from './ConfiguratorEmptyState';
import { ConfiguratorErrorState } from './ConfiguratorErrorState';
import { LIFECYCLE_LABELS, SUPPLY_MODE_LABELS } from './configuratorVocabulary';

export type MotorReference = MotorCatalogListResponse['items'][number];

type MotorReferencePickerProps = {
  selected: MotorReference | null;
  onSelect: (reference: MotorReference) => void;
  onClear: () => void;
  className?: string;
};

const RESULT_LIMIT = 12;

const formatCandidate = (candidate: MotorReference['candidate']): string =>
  [candidate.brand, candidate.designation].filter(Boolean).join(' ');

/**
 * Choix du moteur en place, par recherche dans le catalogue technique.
 *
 * Une ligne par point de fonctionnement, pas par modele : c'est le point qui
 * porte la puissance, la polarite et le calibre, et deux points d'un meme
 * modele ne se remplacent pas par les memes moteurs. La variante est donc
 * toujours visible — `LSHRM 160MR1` existe en trois masses.
 */
export const MotorReferencePicker = ({
  selected,
  onSelect,
  onClear,
  className
}: MotorReferencePickerProps) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const listInput = useMemo<MotorCatalogListInput>(
    () => ({
      limit: RESULT_LIMIT,
      ...(debouncedSearch.length > 0 ? { search: debouncedSearch } : {})
    }),
    [debouncedSearch]
  );

  const catalogQuery = useMotorCatalogList(listInput, selected === null);
  const handleRetry = useCallback(() => {
    void catalogQuery.refetch();
  }, [catalogQuery]);

  if (selected) {
    const { candidate } = selected;
    return (
      <div className={cn('tech-raised rounded-xl bg-card p-3', className)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {formatCandidate(candidate)}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {candidate.series ?? 'Série non publiée'}
              {candidate.variant_key ? ` · ${candidate.variant_key}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <X aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Changer de moteur de référence</span>
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-border-subtle pt-3 text-[12px]">
          <dt className="text-muted-foreground">Puissance</dt>
          <dd className="text-right font-mono tabular-nums text-foreground">
            {candidate.power_kw} kW
          </dd>

          <dt className="text-muted-foreground">Pôles</dt>
          <dd className="text-right font-mono tabular-nums text-foreground">{candidate.poles}</dd>

          <dt className="text-muted-foreground">Vitesse</dt>
          <dd className="text-right font-mono tabular-nums text-foreground">
            {candidate.rated_speed_rpm} tr/min
          </dd>

          <dt className="text-muted-foreground">Fréquence</dt>
          <dd className="text-right font-mono tabular-nums text-foreground">
            {candidate.frequency_hz} Hz
          </dd>

          <dt className="text-muted-foreground">Alimentation</dt>
          <dd className="text-right text-foreground">
            {SUPPLY_MODE_LABELS[candidate.supply_mode]}
          </dd>

          <dt className="text-muted-foreground">Classe</dt>
          <dd className="text-right font-mono text-foreground">
            {candidate.efficiency_class ?? '—'}
          </dd>
        </dl>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); }}
          placeholder="Marque, désignation, référence…"
          aria-label="Rechercher le moteur en place"
          className="pl-8"
        />
      </div>

      {catalogQuery.isError ? (
        <ConfiguratorErrorState
          error={catalogQuery.error}
          fallbackMessage="Impossible de lire le catalogue technique."
          onRetry={handleRetry}
        />
      ) : null}

      {catalogQuery.isPending ? (
        <div aria-hidden="true" className="space-y-1">
          {Array.from({ length: 5 }, (_unused, index) => (
            <div
              key={index}
              className="skeleton-shimmer h-[46px] rounded-lg motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : null}

      {catalogQuery.isSuccess && catalogQuery.data.items.length === 0 ? (
        <ConfiguratorEmptyState
          title="Aucun moteur ne correspond"
          description="Aucun moteur du catalogue actif ne correspond à cette recherche. Essayez la désignation seule, sans la marque."
        />
      ) : null}

      {catalogQuery.isSuccess && catalogQuery.data.items.length > 0 ? (
        <ul className="tech-raised min-h-0 flex-1 divide-y divide-border-subtle overflow-y-auto rounded-xl bg-card">
          {catalogQuery.data.items.map((item) => (
            <li key={item.candidate.operating_point_id}>
              <button
                type="button"
                onClick={() => { onSelect(item); }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-100 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {formatCandidate(item.candidate)}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.candidate.variant_key ?? item.candidate.series ?? '—'}
                    {item.candidate.lifecycle === 'legacy'
                      ? ` · ${LIFECYCLE_LABELS.legacy}`
                      : ''}
                  </span>
                </span>
                <span className="shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  <span className="block text-foreground">{item.candidate.power_kw} kW</span>
                  <span className="block">
                    {item.candidate.poles}P · {item.candidate.frequency_hz} Hz
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
