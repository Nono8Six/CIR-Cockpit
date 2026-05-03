import { SlidersHorizontal } from 'lucide-react';
import type { DirectoryListInput } from 'shared/schemas/directory.schema';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DirectoryCityAutocomplete from './DirectoryCityAutocomplete';
import DirectoryFilterCombobox from './DirectoryFilterCombobox';
import type { DirectoryFilterOption } from './DirectoryFilters.types';

interface DirectoryFilterPopoverProps {
  search: DirectoryListInput;
  activeFilterCount: number;
  departmentItems: DirectoryFilterOption[];
  commercialItems: DirectoryFilterOption[];
  agencyItems: DirectoryFilterOption[];
  canFilterAgency: boolean;
  cityDraft: string;
  onCityDraftChange: (value: string) => void;
  onSearchPatch: (patch: Partial<DirectoryListInput>) => void;
  onRequestOptions: () => void;
  onResetFilters: () => void;
}

const DirectoryFilterPopover = ({
  search,
  activeFilterCount,
  departmentItems,
  commercialItems,
  agencyItems,
  canFilterAgency,
  cityDraft,
  onCityDraftChange,
  onSearchPatch,
  onRequestOptions,
  onResetFilters
}: DirectoryFilterPopoverProps) => {
  return (
    <Popover onOpenChange={(open) => {
      if (open) {
        onRequestOptions();
      }
    }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="dense" className="h-9 rounded-md px-3 text-sm shadow-none">
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filtres</span>
          {activeFilterCount > 0 ? (
            <Badge variant="secondary" density="dense">{activeFilterCount}</Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0">
        <div className="space-y-3 p-4">
          <p className="text-sm font-medium text-foreground">Filtrer par</p>

          <DirectoryFilterCombobox
            items={departmentItems}
            values={search.departments}
            onValuesChange={(values) => onSearchPatch({ departments: values, page: 1 })}
            placeholder="Département"
            allLabel="Tous les départements"
            searchPlaceholder="Rechercher un département…"
            emptyLabel="Aucun département trouvé."
            selectionSummaryLabel="départements"
            multiple
            className="w-full"
          />

          <div className="w-full">
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

          <DirectoryFilterCombobox
            items={commercialItems}
            values={search.cirCommercialIds}
            onValuesChange={(values) => onSearchPatch({ cirCommercialIds: values, page: 1 })}
            placeholder="Commercial CIR"
            allLabel="Tous les commerciaux"
            searchPlaceholder="Rechercher un commercial…"
            emptyLabel="Aucun commercial trouvé."
            selectionSummaryLabel="commerciaux"
            multiple
            disabled={search.type === 'prospect'}
            className="w-full"
          />

          {canFilterAgency ? (
            <DirectoryFilterCombobox
              items={agencyItems}
              values={search.agencyIds}
              onValuesChange={(values) => onSearchPatch({ agencyIds: values, page: 1 })}
              placeholder="Agence"
              allLabel="Toutes les agences"
              searchPlaceholder="Rechercher une agence…"
              emptyLabel="Aucune agence trouvée."
              selectionSummaryLabel="agences"
              multiple
              className="w-full"
            />
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onSearchPatch({ includeArchived: !search.includeArchived, page: 1 })}
          >
            {search.includeArchived ? 'Masquer les archives' : 'Inclure les archives'}
          </Button>

          {activeFilterCount > 0 ? (
            <>
              <div className="border-t border-border/40 pt-3" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onResetFilters}
              >
                Réinitialiser les filtres
              </Button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DirectoryFilterPopover;
