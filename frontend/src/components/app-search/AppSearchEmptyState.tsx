import { Archive, FilterX, Plus } from 'lucide-react';

import AppSearchGroup from './AppSearchGroup';
import AppSearchRow from './AppSearchRow';

type AppSearchEmptyStateProps = {
  query: string;
  isScoped: boolean;
  includeArchived: boolean;
  onCreateEntity: () => void;
  onIncludeArchived: () => void;
  onClearScope: () => void;
};

const AppSearchEmptyState = ({
  query,
  isScoped,
  includeArchived,
  onCreateEntity,
  onIncludeArchived,
  onClearScope
}: AppSearchEmptyStateProps) => (
  <div data-testid="app-search-empty">
    <p className="px-3 pb-1 pt-3 text-[13px] text-muted-foreground">
      Aucun résultat pour <span className="font-medium text-foreground">{query}</span>.
    </p>
    <AppSearchGroup heading="Suites possibles">
      <AppSearchRow
        value="creer une fiche client prospect"
        onSelect={onCreateEntity}
        icon={Plus}
        label={`Créer une fiche « ${query} »`}
        detail="Annuaire des tiers"
        testId="app-search-empty-create"
      />
      {!includeArchived ? (
        <AppSearchRow
          value="elargir archives archivees"
          onSelect={onIncludeArchived}
          icon={Archive}
          label="Élargir aux fiches archivées"
          detail="Relance la recherche"
          testId="app-search-empty-archived"
        />
      ) : null}
      {isScoped ? (
        <AppSearchRow
          value="effacer le filtre"
          onSelect={onClearScope}
          icon={FilterX}
          label="Chercher dans tout"
          detail="Retire le filtre actif"
          testId="app-search-empty-clear-scope"
        />
      ) : null}
    </AppSearchGroup>
  </div>
);

export default AppSearchEmptyState;
