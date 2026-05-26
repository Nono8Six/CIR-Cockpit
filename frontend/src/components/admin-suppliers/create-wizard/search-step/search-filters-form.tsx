import { Filter, Loader2, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '../../../ui/inputs/basic/Button';
import { Input } from '../../../ui/inputs/basic/Input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../../../ui/inputs/selects/Select';
import type useSupplierSearchFilters from './use-supplier-search-filters';

const activitySections = [
  ['A', 'A - Agriculture'],
  ['B', 'B - Industries extractives'],
  ['C', 'C - Industrie manufacturière'],
  ['D', 'D - Énergie'],
  ['E', 'E - Eau et déchets'],
  ['F', 'F - Construction'],
  ['G', 'G - Commerce'],
  ['H', 'H - Transports'],
  ['I', 'I - Hébergement'],
  ['J', 'J - Information'],
  ['K', 'K - Finance'],
  ['L', 'L - Immobilier'],
  ['M', 'M - Activités spécialisées'],
  ['N', 'N - Services administratifs'],
  ['O', 'O - Administration'],
  ['P', 'P - Enseignement'],
  ['Q', 'Q - Santé'],
  ['R', 'R - Arts'],
  ['S', 'S - Autres services']
] as const;

interface SearchFiltersFormProps {
  searchFilters: ReturnType<typeof useSupplierSearchFilters>;
  onSearchSubmit?: () => void;
}

/**
 * Renders the filter form for performing company directory searches.
 * @param {SearchFiltersFormProps} props - The component props.
 * @returns {JSX.Element} The rendered form.
 */
const SearchFiltersForm = ({ searchFilters, onSearchSubmit }: SearchFiltersFormProps) => {
  const { filters, actions, queryState } = searchFilters;
  const {
    query,
    department,
    postalCode,
    city,
    nafCode,
    activitySection,
    headOffice,
    statusFilter
  } = filters;
  const {
    setQuery,
    setDepartment,
    setPostalCode,
    setCity,
    setNafCode,
    setActivitySection,
    setHeadOffice,
    setStatusFilter,
    submitSearch
  } = actions;
  const { search } = queryState;

  return (
    <form
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface-1/40 p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch(onSearchSubmit);
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          name="admin-supplier-official-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 pl-10 text-sm bg-background border-border-subtle hover:border-border transition-colors focus-visible:ring-ring/45"
          placeholder="Entrez le nom de l'entreprise, SIREN ou SIRET (min. 3 caractères)..."
          aria-label="Recherche officielle fournisseur admin"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Département</p>
          <Input
            name="admin-supplier-filter-department"
            value={department}
            onChange={(event) => setDepartment(event.target.value.toUpperCase())}
            placeholder="Ex: 69"
            aria-label="Département fournisseur"
            className="focus-visible:ring-ring/45"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code postal</p>
          <Input
            name="admin-supplier-filter-postal-code"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Ex: 69002"
            aria-label="Code postal fournisseur"
            inputMode="numeric"
            className="focus-visible:ring-ring/45"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ville</p>
          <Input
            name="admin-supplier-filter-city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ex: Lyon"
            aria-label="Ville fournisseur"
            className="focus-visible:ring-ring/45"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code NAF</p>
          <Input
            name="admin-supplier-filter-naf"
            value={nafCode}
            onChange={(event) => setNafCode(event.target.value)}
            placeholder="Ex: 46.69B"
            aria-label="Code NAF fournisseur"
            className="font-mono uppercase focus-visible:ring-ring/45"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section d&apos;activité</p>
          <Select
            name="admin-supplier-activity-section"
            value={activitySection || 'all'}
            onValueChange={(value) => setActivitySection(value === 'all' ? '' : value)}
          >
            <SelectTrigger aria-label="Section activité fournisseur" className="bg-background focus-visible:ring-ring/45">
              <SelectValue placeholder="Toutes les sections" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectGroup>
                <SelectItem value="all">Toutes les sections</SelectItem>
                {activitySections.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={query.trim().length < 3 || search.isFetching}
            className="w-full h-9 transition-transform active:scale-[0.98]"
          >
            {search.isFetching ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
            ) : (
              <Filter data-icon="inline-start" aria-hidden="true" />
            )}
            Rechercher
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border-subtle">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type d&apos;établissement</span>
          <div className="flex items-center gap-0.5 bg-surface-2 p-0.5 rounded-lg border border-border-subtle h-9 w-full">
            {(['all', 'head_office', 'secondary'] as const).map((val) => {
              const isSel = headOffice === val;
              const labels = { all: 'Tous', head_office: 'Siège', secondary: 'Secondaire' };
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setHeadOffice(val)}
                  className={cn(
                    'flex-1 h-full rounded-md text-xs font-medium transition-[background-color,color,box-shadow,transform] active:scale-95 cursor-pointer',
                    isSel
                      ? 'bg-card text-foreground font-semibold shadow-sm border border-border/40'
                      : 'text-muted-foreground hover:bg-card/40 hover:text-foreground bg-transparent border border-transparent'
                  )}
                >
                  {labels[val]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Statut d&apos;activité</span>
          <div className="flex items-center gap-0.5 bg-surface-2 p-0.5 rounded-lg border border-border-subtle h-9 w-full">
            {(['all', 'open', 'closed', 'unknown'] as const).map((val) => {
              const isSel = statusFilter === val;
              const labels = { all: 'Tous', open: 'Actifs', closed: 'Fermés', unknown: 'Inconnu' };
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStatusFilter(val)}
                  className={cn(
                    'flex-1 h-full rounded-md text-xs font-medium transition-[background-color,color,box-shadow,transform] active:scale-95 cursor-pointer',
                    isSel
                      ? 'bg-card text-foreground font-semibold shadow-sm border border-border/40'
                      : 'text-muted-foreground hover:bg-card/40 hover:text-foreground bg-transparent border border-transparent'
                  )}
                >
                  {labels[val]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </form>
  );
};

export default SearchFiltersForm;
