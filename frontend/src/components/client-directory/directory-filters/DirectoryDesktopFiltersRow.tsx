import type { DirectoryListInput } from 'shared/schemas/directory.schema';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DirectoryCityAutocomplete from './DirectoryCityAutocomplete';
import DirectoryFilterCombobox from './DirectoryFilterCombobox';
import type { DirectoryFilterOption } from './DirectoryFilters.types';

interface DirectoryDesktopFiltersRowProps {
  search: DirectoryListInput;
  departmentItems: DirectoryFilterOption[];
  commercialItems: DirectoryFilterOption[];
  agencyItems: DirectoryFilterOption[];
  canFilterAgency: boolean;
  cityDraft: string;
  onCityDraftChange: (value: string) => void;
  onSearchPatch: (patch: Partial<DirectoryListInput>) => void;
}

const FIELD_LABEL_CLASS_NAME = 'text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground';
const FILTER_FIELD_CLASS_NAME = 'w-full';
const DESKTOP_GRID_CLASS_NAME = 'hidden xl:grid xl:gap-2.5';

const DirectoryDesktopFiltersRow = ({
  search,
  departmentItems,
  commercialItems,
  agencyItems,
  canFilterAgency,
  cityDraft,
  onCityDraftChange,
  onSearchPatch
}: DirectoryDesktopFiltersRowProps) => (
  <div
    className={cn(
      DESKTOP_GRID_CLASS_NAME,
      canFilterAgency
        ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]'
        : 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]'
    )}
  >
    {canFilterAgency ? (
      <div className="min-w-0 space-y-1">
        <p className={FIELD_LABEL_CLASS_NAME}>Agence</p>
        <DirectoryFilterCombobox
          items={agencyItems}
          values={search.agencyIds}
          onValuesChange={(values) => onSearchPatch({ agencyIds: values, page: 1 })}
          placeholder="Toutes les agences"
          allLabel="Toutes les agences"
          searchPlaceholder="Rechercher une agence…"
          emptyLabel="Aucune agence trouvée."
          selectionSummaryLabel="agences"
          multiple
          className={FILTER_FIELD_CLASS_NAME}
        />
      </div>
    ) : null}

    <div className="min-w-0 space-y-1">
      <p className={FIELD_LABEL_CLASS_NAME}>Département</p>
      <DirectoryFilterCombobox
        items={departmentItems}
        values={search.departments}
        onValuesChange={(values) => onSearchPatch({ departments: values, page: 1 })}
        placeholder="Tous les départements"
        allLabel="Tous les départements"
        searchPlaceholder="Rechercher un département…"
        emptyLabel="Aucun département trouvé."
        selectionSummaryLabel="départements"
        multiple
        className={FILTER_FIELD_CLASS_NAME}
      />
    </div>

    <div className="min-w-0 space-y-1">
      <p className={FIELD_LABEL_CLASS_NAME}>Ville</p>
      <DirectoryCityAutocomplete
        draftValue={cityDraft}
        committedValue={search.city}
        type={search.type}
        agencyIds={search.agencyIds}
        includeArchived={search.includeArchived}
        onDraftChange={onCityDraftChange}
        onCommit={(value) => onSearchPatch({ city: value, page: 1 })}
      />
    </div>

    <div className="min-w-0 space-y-1">
      <p className={FIELD_LABEL_CLASS_NAME}>Commercial CIR</p>
      <DirectoryFilterCombobox
        items={commercialItems}
        values={search.cirCommercialIds}
        onValuesChange={(values) => onSearchPatch({ cirCommercialIds: values, page: 1 })}
        placeholder="Tous les commerciaux"
        allLabel="Tous les commerciaux"
        searchPlaceholder="Rechercher un commercial…"
        emptyLabel="Aucun commercial trouvé."
        selectionSummaryLabel="commerciaux"
        multiple
        disabled={search.type === 'prospect'}
        className={FILTER_FIELD_CLASS_NAME}
      />
    </div>

    <div className="min-w-0 space-y-1">
      <p className={FIELD_LABEL_CLASS_NAME}>Archives</p>
      <Button
        type="button"
        variant="outline"
        size="dense"
        className={cn(
          'h-9 w-full justify-between rounded-lg border-border/70 px-3 text-sm font-normal shadow-none',
          search.includeArchived && 'border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10'
        )}
        onClick={() => onSearchPatch({ includeArchived: !search.includeArchived, page: 1 })}
      >
        {search.includeArchived ? 'Incluses' : 'Masquées'}
      </Button>
    </div>
  </div>
);

export default DirectoryDesktopFiltersRow;
