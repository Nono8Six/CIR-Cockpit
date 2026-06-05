import { Search } from 'lucide-react';

import { EntityRecordWizardEmptyState } from '@/components/entity-record-wizard/EntityRecordWizardRows';
import CompanyGroupCard from './company-group-card';
import EstablishmentSubList from './establishment-sub-list';
import type useSupplierSearchFilters from './use-supplier-search-filters';
import type useEstablishmentSelection from './use-establishment-selection';

interface SearchResultsListProps {
  searchFilters: ReturnType<typeof useSupplierSearchFilters>;
  selection: ReturnType<typeof useEstablishmentSelection>;
}

/**
 * Renders the list of search results, including loading skeletons, results headers,
 * company group list items, nested establishment sub-lists, and empty search results.
 * @param {SearchResultsListProps} props - The component props.
 * @returns {JSX.Element} The rendered results list.
 */
const SearchResultsList = ({ searchFilters, selection }: SearchResultsListProps) => {
  const { search, visibleGroups, submittedSearch } = searchFilters.queryState;
  const { selectedGroup } = selection.computed;
  const { handleGroupSelect } = selection.actions;

  if (search.isFetching) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground animate-pulse">
          Recherche en cours…
        </p>
        {[1, 2, 3].map((n) => (
          <div key={n} className="relative overflow-hidden border border-border bg-card p-5 space-y-4">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/20 to-transparent animate-shimmer"
              style={{ transform: 'translateX(-100%)', animation: 'shimmer 1.5s infinite' }}
            />
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
              <div className="h-6 bg-muted rounded w-20" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 bg-muted rounded w-16" />
              <div className="h-5 bg-muted rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col">
      {visibleGroups.length > 0 ? (
        <p aria-live="polite" className="border border-b-0 border-border bg-surface-1/55 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {visibleGroups.length} entreprise{visibleGroups.length > 1 ? 's' : ''} trouvée{visibleGroups.length > 1 ? 's' : ''}
        </p>
      ) : null}

      <div className={visibleGroups.length > 0 ? 'border border-border bg-card' : undefined}>
      {visibleGroups.map((group) => {
        const isActive = selectedGroup?.id === group.id;
        return (
          <div key={group.id}>
            <CompanyGroupCard
              group={group}
              isActive={isActive}
              onSelect={() => handleGroupSelect(group)}
            />
            {isActive ? (
              <EstablishmentSubList group={group} selection={selection} />
            ) : null}
          </div>
        );
      })}
      </div>

      {submittedSearch && visibleGroups.length === 0 ? (
        <EntityRecordWizardEmptyState
          icon={<Search aria-hidden="true" className="size-9" />}
          title="Aucun établissement trouvé"
          body="Ajuste la recherche officielle ou poursuis en saisie manuelle."
        />
      ) : null}
    </div>
  );
};

export default SearchResultsList;
