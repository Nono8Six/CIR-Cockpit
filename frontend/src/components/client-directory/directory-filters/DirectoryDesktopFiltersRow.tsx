import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { DirectoryListInput } from 'shared/schemas/directory.schema';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import DirectoryCityAutocomplete from './DirectoryCityAutocomplete';
import {
  DirectoryFilterComboboxContent,
  getDirectoryFilterTriggerLabel
} from './DirectoryFilterCombobox';
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

type DesktopFilterKey = 'agency' | 'department' | 'commercial' | 'city';

interface DirectoryDesktopSmartPillProps {
  label: string;
  summary?: string;
  open: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onClear?: () => void;
  children: ReactNode;
}

const SMART_PILLS_ROW_CLASS_NAME = 'hidden xl:flex xl:flex-wrap xl:items-center xl:gap-2';

const getSummaryLabel = (
  items: DirectoryFilterOption[],
  values: string[],
  selectionSummaryLabel: string
): string | undefined => {
  const label = getDirectoryFilterTriggerLabel({
    items,
    values,
    placeholder: '',
    multiple: true,
    selectionSummaryLabel
  }).trim();

  return label || undefined;
};

const DirectoryDesktopSmartPill = ({
  label,
  summary,
  open,
  disabled = false,
  onOpenChange,
  onClear,
  children
}: DirectoryDesktopSmartPillProps) => {
  const isActive = Boolean(summary);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          'inline-flex min-w-0 items-center rounded-md border shadow-sm transition-colors',
          isActive
            ? 'border-primary/35 bg-primary/5 text-foreground'
            : 'border-border/60 bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground',
          open && 'border-primary/50 ring-1 ring-primary/20',
          disabled && 'opacity-60'
        )}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex h-8 max-w-[280px] items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              disabled ? 'cursor-not-allowed' : 'hover:text-foreground'
            )}
          >
            {isActive ? null : <Plus className="size-3.5 shrink-0 text-muted-foreground/70" />}
            <span className="truncate">{isActive ? <><span className="font-normal text-muted-foreground">{label}:</span> {summary}</> : label}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/70" />
          </button>
        </PopoverTrigger>

        {isActive && onClear ? (
          <>
            <div className="h-4 w-px bg-primary/20" aria-hidden="true" />
            <button
              type="button"
              className="mr-1 ml-1 inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Effacer filtre ${label}`}
              onClick={(event) => {
                event.stopPropagation();
                onClear();
                onOpenChange(false);
              }}
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : null}
      </div>

      <PopoverContent align="start" className="w-[340px] p-0">
        {children}
      </PopoverContent>
    </Popover>
  );
};

const DirectoryDesktopFiltersRow = ({
  search,
  departmentItems,
  commercialItems,
  agencyItems,
  canFilterAgency,
  cityDraft,
  onCityDraftChange,
  onSearchPatch
}: DirectoryDesktopFiltersRowProps) => {
  const [openFilter, setOpenFilter] = useState<DesktopFilterKey | null>(null);

  const agencySummary = useMemo(
    () => getSummaryLabel(agencyItems, search.agencyIds, 'agences'),
    [agencyItems, search.agencyIds]
  );
  const departmentSummary = useMemo(
    () => getSummaryLabel(departmentItems, search.departments, 'departements'),
    [departmentItems, search.departments]
  );
  const commercialSummary = useMemo(
    () => getSummaryLabel(commercialItems, search.cirCommercialIds, 'commerciaux'),
    [commercialItems, search.cirCommercialIds]
  );
  const citySummary = search.city?.trim() || undefined;

  return (
    <div className={SMART_PILLS_ROW_CLASS_NAME}>
      {canFilterAgency ? (
        <DirectoryDesktopSmartPill
          label="Agence"
          summary={agencySummary}
          open={openFilter === 'agency'}
          onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'agency' : null)}
          onClear={() => onSearchPatch({ agencyIds: [], page: 1 })}
        >
          <DirectoryFilterComboboxContent
            items={agencyItems}
            values={search.agencyIds}
            onValuesChange={(values) => onSearchPatch({ agencyIds: values, page: 1 })}
            allLabel="Toutes les agences"
            searchPlaceholder="Rechercher une agence…"
            emptyLabel="Aucune agence trouvee."
            multiple
          />
        </DirectoryDesktopSmartPill>
      ) : null}

      <DirectoryDesktopSmartPill
        label="Departement"
        summary={departmentSummary}
        open={openFilter === 'department'}
        onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'department' : null)}
        onClear={() => onSearchPatch({ departments: [], page: 1 })}
      >
        <DirectoryFilterComboboxContent
          items={departmentItems}
          values={search.departments}
          onValuesChange={(values) => onSearchPatch({ departments: values, page: 1 })}
          allLabel="Tous les departements"
          searchPlaceholder="Rechercher un departement…"
          emptyLabel="Aucun departement trouve."
          multiple
        />
      </DirectoryDesktopSmartPill>

      <DirectoryDesktopSmartPill
        label="Ville"
        summary={citySummary}
        open={openFilter === 'city'}
        onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'city' : null)}
        onClear={() => {
          onCityDraftChange('');
          onSearchPatch({ city: undefined, page: 1 });
        }}
      >
        <div className="p-3">
          <DirectoryCityAutocomplete
            draftValue={cityDraft}
            committedValue={search.city}
            type={search.type}
            agencyIds={search.agencyIds}
            includeArchived={search.includeArchived}
            onDraftChange={onCityDraftChange}
            onCommit={(value) => onSearchPatch({ city: value, page: 1 })}
            onCommitComplete={() => setOpenFilter(null)}
          />
        </div>
      </DirectoryDesktopSmartPill>

      <DirectoryDesktopSmartPill
        label="Commercial"
        summary={commercialSummary}
        open={search.type === 'prospect' ? false : openFilter === 'commercial'}
        disabled={search.type === 'prospect'}
        onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'commercial' : null)}
        onClear={() => onSearchPatch({ cirCommercialIds: [], page: 1 })}
      >
        <DirectoryFilterComboboxContent
          items={commercialItems}
          values={search.cirCommercialIds}
          onValuesChange={(values) => onSearchPatch({ cirCommercialIds: values, page: 1 })}
          allLabel="Tous les commerciaux"
          searchPlaceholder="Rechercher un commercial…"
          emptyLabel="Aucun commercial trouve."
          multiple
        />
      </DirectoryDesktopSmartPill>

      <button
        type="button"
        aria-pressed={search.includeArchived}
        className={cn(
          'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          search.includeArchived
            ? 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
            : 'border-border/60 bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
        )}
        onClick={() => onSearchPatch({ includeArchived: !search.includeArchived, page: 1 })}
      >
        {search.includeArchived ? 'Archives incluses' : 'Archives'}
      </button>
    </div>
  );
};

export default DirectoryDesktopFiltersRow;
