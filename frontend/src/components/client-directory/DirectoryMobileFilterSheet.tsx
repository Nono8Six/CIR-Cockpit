import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { DirectorySearchState } from 'shared/schemas/directory.schema';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import DirectoryCityAutocomplete from './directory-filters/DirectoryCityAutocomplete';
import DirectoryFilterCombobox from './directory-filters/DirectoryFilterCombobox';
import type { DirectoryFilterOption, DirectoryOptionRequest } from './directory-filters/DirectoryFilters.types';
import { getDirectorySelectedAgencyIds, toSelectedAgenciesScope } from './clientDirectorySearch';

interface DirectoryMobileFilterSheetProps {
  search: DirectorySearchState;
  activeFilterCount: number;
  departmentItems: DirectoryFilterOption[];
  commercialItems: DirectoryFilterOption[];
  agencyItems: DirectoryFilterOption[];
  canFilterAgency: boolean;
  cityDraft: string;
  onCityDraftChange: (value: string) => void;
  renderSavedViews?: () => ReactNode;
  onSearchPatch: (patch: Partial<DirectorySearchState>) => void;
  onRequestOptions: (options: DirectoryOptionRequest[]) => void;
  onReset: () => void;
}

const DirectoryMobileFilterSheet = ({
  search,
  activeFilterCount,
  departmentItems,
  commercialItems,
  agencyItems,
  canFilterAgency,
  cityDraft,
  onCityDraftChange,
  renderSavedViews,
  onSearchPatch,
  onRequestOptions,
  onReset
}: DirectoryMobileFilterSheetProps) => {
  const [open, setOpen] = useState(false);
  const selectedAgencyIds = getDirectorySelectedAgencyIds(search.scope);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onRequestOptions(canFilterAgency ? ['agencies', 'commercials', 'departments'] : ['commercials', 'departments']);
        }
        setOpen(nextOpen);
      }}
    >
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="dense" className="h-9 rounded-full px-4 text-sm shadow-none bg-white">
          <SlidersHorizontal className="size-4 mr-2" />
          Filtres
          {activeFilterCount > 0 ? (
            <Badge variant="secondary" className="ml-2 rounded-full px-1.5">{activeFilterCount}</Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(88vw,340px)] space-y-4 p-0 [overscroll-behavior:contain]"
      >
        <SheetHeader className="border-b border-border-subtle px-4 py-3">
          <SheetTitle className="text-sm font-semibold">Filtres</SheetTitle>
          <SheetDescription className="sr-only">
            Affinez la liste clients et prospects avec les filtres disponibles.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 overflow-y-auto px-4 py-3">
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
          />

          <DirectoryCityAutocomplete
            draftValue={cityDraft}
            committedValue={search.city}
            type={search.type}
            scope={search.scope}
            includeArchived={search.includeArchived}
            onDraftChange={onCityDraftChange}
            onCommit={(value) => onSearchPatch({ city: value, page: 1 })}
          />

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
          />

          {canFilterAgency ? (
            <DirectoryFilterCombobox
              items={agencyItems}
              values={selectedAgencyIds}
              onValuesChange={(values) => onSearchPatch({ scope: toSelectedAgenciesScope(values), page: 1 })}
              placeholder="Agence"
              allLabel="Toutes les agences"
              searchPlaceholder="Rechercher une agence…"
              emptyLabel="Aucune agence trouvée."
              selectionSummaryLabel="agences"
              multiple
            />
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onSearchPatch({ includeArchived: !search.includeArchived, page: 1 })}
          >
            {search.includeArchived ? 'Masquer les archives' : 'Inclure les archives'}
          </Button>

          {renderSavedViews ? (
            <div className="border-t border-border/60 pt-4">
              {renderSavedViews()}
            </div>
          ) : null}

          <div className="border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onCityDraftChange('');
                onReset();
                setOpen(false);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DirectoryMobileFilterSheet;
