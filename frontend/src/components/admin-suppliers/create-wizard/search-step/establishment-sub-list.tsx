import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

import { formatOfficialNaf } from '../../../../../../shared/reference/officialLabels';
import { cn } from '@/lib/utils';
import type { CompanySearchGroup } from '../../../entity-onboarding/entityOnboarding.types';
import { getCompanySearchStatusLabel } from '../../../entity-onboarding/entityOnboarding.utils';
import { Badge } from '../../../ui/data-display/Badge';
import { Button } from '../../../ui/inputs/basic/Button';
import { Input } from '../../../ui/inputs/basic/Input';
import getEstablishmentLabel from '../get-establishment-label';
import getStatusBadgeVariant from '../get-status-badge-variant';
import type useEstablishmentSelection from './use-establishment-selection';

interface EstablishmentSubListProps {
  group: CompanySearchGroup;
  selection: ReturnType<typeof useEstablishmentSelection>;
}

/**
 * Renders the nested list of establishments for a selected company group,
 * including a local search filter input, establishment cards, and pagination.
 * @param {EstablishmentSubListProps} props - The component props.
 * @returns {JSX.Element} The rendered establishment list section.
 */
const EstablishmentSubList = ({ group, selection }: EstablishmentSubListProps) => {
  const { selectionState, actions, computed } = selection;
  const { localEstablishmentFilter, selectedCompany } = selectionState;
  const { setLocalEstablishmentFilter, setLocalEstablishmentPage, handleEstablishmentSelect } = actions;
  const { filteredEstablishments, paginatedEstablishments, totalPages, currentPage } = computed;

  return (
    <div className="border-b border-border-subtle bg-surface-1/45 px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Établissements</span>
          <span className="text-muted-foreground/60">•</span>
          <span>
            {filteredEstablishments.length} trouvé{filteredEstablishments.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter input inside establishments list */}
        {group.establishments.length > 5 ? (
          <div className="relative w-full md:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" aria-hidden="true" />
            <Input
              name={`filter-establishments-${group.id}`}
              value={localEstablishmentFilter}
              onChange={(e) => {
                setLocalEstablishmentFilter(e.target.value);
                setLocalEstablishmentPage(1);
              }}
              className="h-7 pl-8 pr-2 text-xs bg-background border-border-subtle hover:border-border transition-colors rounded-md focus-visible:ring-ring/45"
              placeholder="Filtrer par ville, CP, adresse…"
              aria-label="Filtrer les établissements"
            />
            {localEstablishmentFilter && (
              <button
                type="button"
                onClick={() => {
                  setLocalEstablishmentFilter('');
                  setLocalEstablishmentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>
        ) : null}
      </div>

      {paginatedEstablishments.length > 0 ? (
        <div className="mt-3 border border-border bg-card">
          {paginatedEstablishments.map((establishment) => {
            const isSelected = selectedCompany?.siret === establishment.siret;
            const formattedNaf = formatOfficialNaf(establishment.naf_code);
            return (
              <button
                key={establishment.siret ?? `${establishment.city}-${establishment.address}`}
                type="button"
                aria-pressed={isSelected}
                className={cn(
                  'group/est relative flex w-full items-start gap-3 border-b border-border-subtle px-3 py-3 text-left transition-[border-color,background-color,box-shadow,color] duration-150 cursor-pointer last:border-b-0',
                  isSelected
                    ? 'bg-primary/[0.035] font-semibold text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]'
                    : 'bg-transparent text-muted-foreground hover:bg-surface-1/55 hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-inset'
                )}
                onClick={() => handleEstablishmentSelect(establishment)}
              >
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      'truncate text-sm font-semibold',
                      isSelected ? 'text-foreground font-bold' : 'text-muted-foreground group-hover/est:text-foreground'
                    )}>
                      {getEstablishmentLabel(establishment)}
                    </span>
                    <Badge variant={getStatusBadgeVariant(establishment.establishment_status)} className="text-[10px] px-1 py-0">
                      {getCompanySearchStatusLabel(establishment.establishment_status)}
                    </Badge>
                    {establishment.is_head_office ? (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary/20 bg-primary/5 text-primary">
                        Siège
                      </Badge>
                    ) : null}
                    {establishment.is_former_head_office ? (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Ancien siège
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground/75 font-medium">
                    {[
                      establishment.address,
                      establishment.siret ? `SIRET ${establishment.siret}` : null,
                      formattedNaf ? `NAF ${formattedNaf}` : null
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-[border-color,background-color,color] duration-150',
                    isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
                  )}
                >
                  {isSelected ? <Check className="size-3 stroke-[3]" aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-4 text-center text-xs font-medium text-muted-foreground">
          Aucun site ne correspond aux critères de filtre.
        </p>
      )}

      {/* Local Pagination Controls */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border-subtle/80 pt-3">
          <span className="text-[11px] font-semibold text-muted-foreground">
            Page {currentPage} sur {totalPages} ({filteredEstablishments.length} site{filteredEstablishments.length > 1 ? 's' : ''})
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="dense"
              className="h-7 w-7 p-0 flex items-center justify-center rounded-md active:scale-90 transition-transform"
              onClick={() => setLocalEstablishmentPage(1)}
              disabled={currentPage === 1}
              aria-label="Première page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="dense"
              className="h-7 w-7 p-0 flex items-center justify-center rounded-md active:scale-90 transition-transform"
              onClick={() => setLocalEstablishmentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              aria-label="Page précédente"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="dense"
              className="h-7 w-7 p-0 flex items-center justify-center rounded-md active:scale-90 transition-transform"
              onClick={() => setLocalEstablishmentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              aria-label="Page suivante"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="dense"
              className="h-7 w-7 p-0 flex items-center justify-center rounded-md active:scale-90 transition-transform"
              onClick={() => setLocalEstablishmentPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Dernière page"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EstablishmentSubList;
