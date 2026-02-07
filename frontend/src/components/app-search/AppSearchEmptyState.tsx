type AppSearchEmptyStateProps = {
  searchQuery: string;
  hasSearchResults: boolean;
};

const AppSearchEmptyState = ({ searchQuery, hasSearchResults }: AppSearchEmptyStateProps) => {
  if (!searchQuery) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Commencez à taper pour rechercher…
      </div>
    );
  }

  if (searchQuery && !hasSearchResults) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Aucun résultat trouvé.
      </div>
    );
  }

  return null;
};

export default AppSearchEmptyState;
