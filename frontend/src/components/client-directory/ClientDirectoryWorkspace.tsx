import { Plus } from 'lucide-react';
import type { DirectoryListRow, DirectorySearchState } from 'shared/schemas/directory.schema';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';

import ClientDirectoryFilters from './ClientDirectoryFilters';
import ClientDirectoryTable from './ClientDirectoryTable';
import DirectorySavedViewsBar from './DirectorySavedViewsBar';
import { useClientDirectoryWorkspace } from './useClientDirectoryWorkspace';

export interface ClientDirectoryWorkspaceProps {
  search: DirectorySearchState;
  onSearchChange: (updater: (previous: DirectorySearchState) => DirectorySearchState) => void;
  onOpenRecord: (row: DirectoryListRow, effectiveSearch: DirectorySearchState) => void;
  onCreateRecord: (effectiveSearch: DirectorySearchState) => void;
}

const ClientDirectoryWorkspace = ({
  search,
  onSearchChange,
  onOpenRecord,
  onCreateRecord,
}: ClientDirectoryWorkspaceProps) => {
  const {
    userRole,
    canLoadDirectory,
    effectiveSearch,
    uiSearch,
    searchDraft,
    setSearchDraft,
    density,
    setDensity,
    columnVisibility,
    filtersSyncToken,
    totalResults,
    viewOptionColumns,
    agencies,
    directoryRows,
    directoryPage,
    directoryPageSize,
    directoryIsFetching,
    directoryIsPending,
    commercials,
    departments,
    savedViews,
    savedViewsIsLoading,
    savedViewsState,
    isSavedViewsMutating,
    handleSearchPatch,
    handleApplySavedView,
    handleSaveView,
    handleDeleteView,
    handleSetDefaultView,
    handleToggleColumn,
    handleResetFilters,
    requestDirectoryOptions,
  } = useClientDirectoryWorkspace({ search, onSearchChange });

  const renderSavedViewsControl = () => (
    <DirectorySavedViewsBar
      views={savedViews}
      currentState={savedViewsState}
      isLoading={savedViewsIsLoading}
      isMutating={isSavedViewsMutating}
      onApplyView={handleApplySavedView}
      onSaveView={handleSaveView}
      onDeleteView={handleDeleteView}
      onSetDefaultView={handleSetDefaultView}
    />
  );

  if (!canLoadDirectory) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Agence active requise pour afficher l annuaire.
      </section>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <section className="flex min-h-0 flex-1 flex-col gap-2 px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">Clients et prospects</h1>
            <div className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <span className="tabular-nums">{typeof totalResults === 'number' ? totalResults : '...'}</span>
              <span className="ml-1 hidden sm:inline">
                {typeof totalResults === 'number' ? `résultat${totalResults > 1 ? 's' : ''}` : 'résultats'}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button type="button" size="sm" onClick={() => onCreateRecord(effectiveSearch)}>
              <Plus className="size-4" />
              Nouvelle fiche
            </Button>
          </div>

          <div className="sm:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" aria-label="Ajouter un client ou un prospect">
                  <Plus className="size-4" />
                  Ajouter
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[220px] space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onCreateRecord(effectiveSearch)}
                >
                  <Plus className="size-4" />
                  Nouvelle fiche
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border/50 bg-muted/20 px-3 py-2.5 sm:px-4 sm:py-3">
              <ClientDirectoryFilters
                key={`directory-filters-${filtersSyncToken}`}
                search={uiSearch}
                cityDraftSeed={effectiveSearch.city ?? ''}
                searchDraft={searchDraft}
                agencies={agencies}
                commercials={commercials}
                departments={departments}
                canFilterAgency={userRole === 'super_admin'}
                isFetching={directoryIsFetching}
                density={density}
                viewOptionColumns={viewOptionColumns}
                renderSavedViews={renderSavedViewsControl}
                onToggleColumn={handleToggleColumn}
                onDensityChange={setDensity}
                onSearchDraftChange={setSearchDraft}
                onSearchPatch={handleSearchPatch}
                onRequestOptions={requestDirectoryOptions}
                onReset={handleResetFilters}
              />
            </div>

            <ClientDirectoryTable
              rows={directoryRows}
              sorting={effectiveSearch.sorting}
              page={directoryPage}
              pageSize={directoryPageSize}
              total={totalResults}
              isFetching={directoryIsFetching}
              isInitialLoading={directoryIsPending}
              columnVisibility={columnVisibility}
              density={density}
              onSortChange={(nextSorting) => handleSearchPatch({ sorting: nextSorting, page: 1 })}
              onPageChange={(page) => handleSearchPatch({ page })}
              onPageSizeChange={(nextPageSize) => handleSearchPatch({ pageSize: nextPageSize, page: 1 })}
              onOpenRecord={(row) => onOpenRecord(row, effectiveSearch)}
            />
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
};

export default ClientDirectoryWorkspace;
