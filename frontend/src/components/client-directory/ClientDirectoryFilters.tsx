import { useEffect, useState } from 'react';
import { type DirectoryDensity } from 'shared/schemas/directory.schema';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DEFAULT_DIRECTORY_DENSITY, countActiveDirectoryFilters } from './clientDirectorySearch';
import DirectoryMobileFilterSheet from './DirectoryMobileFilterSheet';
import DirectoryTableViewOptions from './data-table/DirectoryTableViewOptions';
import DirectoryDesktopFiltersRow from './directory-filters/DirectoryDesktopFiltersRow';
import DirectoryFilterPopover from './directory-filters/DirectoryFilterPopover';
import DirectorySearchInput from './directory-filters/DirectorySearchInput';
import DirectoryTypeFilter from './directory-filters/DirectoryTypeFilter';
import type { ClientDirectoryFiltersProps } from './directory-filters/DirectoryFilters.types';

const ClientDirectoryFilters = ({
  search,
  cityDraftSeed,
  searchDraft,
  agencies,
  commercials,
  departments,
  canFilterAgency,
  isFetching,
  density,
  viewOptionColumns,
  renderSavedViews,
  onToggleColumn,
  onDensityChange,
  onSearchDraftChange,
  onSearchPatch,
  onRequestOptions,
  onReset
}: ClientDirectoryFiltersProps) => {
  const routeCityValue = cityDraftSeed ?? search.city ?? '';
  const [cityDraft, setCityDraft] = useState(routeCityValue);

  useEffect(() => {
    setCityDraft(routeCityValue);
  }, [routeCityValue]);

  const activeFilterCount = countActiveDirectoryFilters(search);
  const hasHiddenOptionalColumns = viewOptionColumns.some((column) => column.canHide && !column.isVisible);
  const hasResettableState = Boolean(searchDraft.trim())
    || Boolean(cityDraft.trim())
    || activeFilterCount > 0
    || density !== DEFAULT_DIRECTORY_DENSITY
    || hasHiddenOptionalColumns;

  const agencyItems = agencies.map((agency) => ({
    value: agency.id,
    label: agency.name
  }));
  const commercialItems = commercials.map((commercial) => ({
    value: commercial.id,
    label: commercial.display_name
  }));
  const departmentItems = departments.map((department) => ({
    value: department,
    label: department
  }));

  const applyPatch = (patch: Partial<typeof search>) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'city')) {
      setCityDraft(patch.city ?? '');
    }

    onSearchPatch(patch);
  };

  const handleReset = () => {
    onSearchDraftChange('');
    setCityDraft('');
    onReset();
  };

  const handleTypeChange = (value: typeof search.type) => {
    applyPatch({
      type: value,
      cirCommercialIds: value === 'prospect' ? [] : search.cirCommercialIds,
      page: 1
    });
  };

  const renderSyncIndicator = (size: DirectoryDensity = 'comfortable') => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={isFetching ? 'Synchronisation en cours' : 'Données synchronisées'}
          className={cn(
            'inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            size === 'compact' ? 'size-5' : 'size-6'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-block rounded-full',
              size === 'compact' ? 'size-2' : 'size-2.5',
              isFetching ? 'bg-warning animate-pulse' : 'bg-success'
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isFetching ? 'Synchronisation en cours…' : 'Données synchronisées'}
      </TooltipContent>
    </Tooltip>
  );

  const resetButton = (
    <Button
      type="button"
      variant={hasResettableState ? 'outline' : 'ghost'}
      size="dense"
      className="h-8 rounded-md px-3 text-xs shadow-none"
      disabled={!hasResettableState}
      onClick={handleReset}
    >
      Réinitialiser
    </Button>
  );

  const utilityControls = (
    <>
      {renderSavedViews?.()}
      <DirectoryTableViewOptions
        columns={viewOptionColumns}
        density={density}
        onToggleColumn={onToggleColumn}
        onDensityChange={onDensityChange}
      />
      {renderSyncIndicator('compact')}
      {resetButton}
    </>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center xl:items-end">
          <div className="min-w-0 flex-1 xl:min-w-[360px] xl:max-w-[440px]">
            <div className="space-y-1.5">
              <p className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 xl:block">
                RECHERCHE
              </p>
              <DirectorySearchInput
                value={searchDraft}
                placeholder="Nom, n° client, ville…"
                ariaLabel="Recherche annuaire"
                className="min-w-0"
                onValueChange={onSearchDraftChange}
                onCommit={(value) => applyPatch({ q: value, page: 1 })}
              />
            </div>
          </div>

          <DirectoryTypeFilter value={search.type} onValueChange={handleTypeChange} />
        </div>

        <div className="hidden items-center gap-1 md:flex xl:hidden">
          <DirectoryFilterPopover
            search={search}
            activeFilterCount={activeFilterCount}
            departmentItems={departmentItems}
            commercialItems={commercialItems}
            agencyItems={agencyItems}
            canFilterAgency={canFilterAgency}
            cityDraft={cityDraft}
            onCityDraftChange={setCityDraft}
            onSearchPatch={(patch) => applyPatch(patch)}
            onRequestOptions={onRequestOptions}
            onResetFilters={handleReset}
          />
          <div className="h-5 w-px bg-border/50" aria-hidden="true" />
          {utilityControls}
        </div>

        <div className="hidden items-center gap-1 xl:flex">
          {utilityControls}
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <DirectoryMobileFilterSheet
          search={search}
          activeFilterCount={activeFilterCount}
          departmentItems={departmentItems}
          commercialItems={commercialItems}
          agencyItems={agencyItems}
          canFilterAgency={canFilterAgency}
          cityDraft={cityDraft}
          onCityDraftChange={setCityDraft}
          renderSavedViews={renderSavedViews}
          onSearchPatch={(patch) => applyPatch(patch)}
          onRequestOptions={onRequestOptions}
          onReset={handleReset}
        />
        <span className="ml-auto">{renderSyncIndicator('compact')}</span>
      </div>

      <DirectoryDesktopFiltersRow
        search={search}
        departmentItems={departmentItems}
        commercialItems={commercialItems}
        agencyItems={agencyItems}
        canFilterAgency={canFilterAgency}
        cityDraft={cityDraft}
        onCityDraftChange={setCityDraft}
        onSearchPatch={(patch) => applyPatch(patch)}
        onRequestOptions={onRequestOptions}
      />
    </div>
  );
};

export default ClientDirectoryFilters;
