import SearchFiltersForm from './search-filters-form';
import SearchResultsList from './search-results-list';
import type useSupplierSearchFilters from './use-supplier-search-filters';
import type useEstablishmentSelection from './use-establishment-selection';

interface SupplierSearchStepProps {
  searchFilters: ReturnType<typeof useSupplierSearchFilters>;
  selection: ReturnType<typeof useEstablishmentSelection>;
}

/**
 * Step 1 component of the supplier creation wizard. Orchestrates the search filter form
 * and the list of search results.
 * @param {SupplierSearchStepProps} props - The component props.
 * @returns {JSX.Element} The rendered Step 1 search layout.
 */
const SupplierSearchStep = ({ searchFilters, selection }: SupplierSearchStepProps) => {
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étape 1</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Recherche officielle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recherche l&apos;établissement dans la base officielle des entreprises françaises pour pré-remplir les données.
        </p>
      </div>
      <SearchFiltersForm searchFilters={searchFilters} />
      <SearchResultsList searchFilters={searchFilters} selection={selection} />
    </>
  );
};

export default SupplierSearchStep;
