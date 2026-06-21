import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { DirectoryListRow, DirectorySearchState } from '../../../../shared/schemas/system/directory.schema';

import ClientDirectoryFilters from '@/components/client-directory/ClientDirectoryFilters';
import DirectorySavedViewsBar from '@/components/client-directory/DirectorySavedViewsBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/feedback/AlertDialog';
import { Button } from '../ui/inputs/basic/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/navigation/Popover';
import { TooltipProvider } from '../ui/feedback/Tooltip';
import { useSetSupplierArchived } from '../../hooks/entities/suppliers/useSetSupplierArchived';
import { useDeleteSupplier } from '../../hooks/entities/suppliers/useDeleteSupplier';
import { notifySuccess } from '@/services/errors/notifySuccess';

import AdminSuppliersTable from './AdminSuppliersTable';
import { useSupplierDirectoryWorkspace } from './useSupplierDirectoryWorkspace';

const AdminSuppliersPage = () => {
  const navigate = useNavigate({ from: '/suppliers' });
  const search = useSearch({ from: '/suppliers' }) as DirectorySearchState;
  const [archiveTarget, setArchiveTarget] = useState<DirectoryListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectoryListRow | null>(null);
  const [deleteRelatedInteractions, setDeleteRelatedInteractions] = useState(true);

  const handleSearchChange = useCallback(
    (updater: (previous: DirectorySearchState) => DirectorySearchState) => {
      void navigate({
        search: (previous) => updater({
          ...search,
          ...(previous as Partial<DirectorySearchState>)
        })
      });
    },
    [navigate, search]
  );

  const {
    userRole,
    canManageSuppliers,
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
    requestDirectoryOptions
  } = useSupplierDirectoryWorkspace({ search, onSearchChange: handleSearchChange });
  const archiveSupplier = useSetSupplierArchived(effectiveSearch.includeArchived);
  const deleteSupplier = useDeleteSupplier(effectiveSearch.includeArchived);
  const canHardDeleteSuppliers = userRole === 'super_admin';

  const handleEditSupplier = useCallback((row: DirectoryListRow) => {
    void navigate({
      to: '/suppliers/$supplierId/edit',
      params: { supplierId: row.id }
    });
  }, [navigate]);

  const handleConfirmArchive = useCallback(async () => {
    if (!archiveTarget || archiveSupplier.isPending) return;
    const nextArchived = !archiveTarget.archived_at;
    await archiveSupplier.mutateAsync({ supplierId: archiveTarget.id, archived: nextArchived });
    notifySuccess(nextArchived ? 'Fournisseur archivé.' : 'Fournisseur restauré.');
    setArchiveTarget(null);
  }, [archiveSupplier, archiveTarget]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteSupplier.isPending) return;
    await deleteSupplier.mutateAsync({
      supplierId: deleteTarget.id,
      deleteRelatedInteractions
    });
    notifySuccess('Fournisseur supprimé définitivement.');
    setDeleteTarget(null);
    setDeleteRelatedInteractions(true);
  }, [deleteRelatedInteractions, deleteSupplier, deleteTarget]);

  const renderSavedViewsControl = () => (
    <DirectorySavedViewsBar
      views={savedViews}
      currentState={savedViewsState}
      isLoading={savedViewsIsLoading}
      isMutating={isSavedViewsMutating}
      triggerLabel="Filtres sauvegardés"
      title="Filtres fournisseurs"
      description="Sauvegardez et réappliquez une combinaison de recherche, filtres, tri, densité et colonnes."
      saveButtonLabel="Sauvegarder les filtres actuels"
      emptyLabel="Aucun filtre fournisseur sauvegardé pour le moment."
      createDialogTitle="Sauvegarder des filtres"
      updateDialogTitle="Mettre à jour ces filtres"
      dialogDescription="La recherche, les filtres, le tri, la densité et les colonnes visibles seront conservés pour les fournisseurs."
      onApplyView={handleApplySavedView}
      onSaveView={handleSaveView}
      onDeleteView={handleDeleteView}
      onSetDefaultView={handleSetDefaultView}
    />
  );

  if (userRole === 'tcs' || !canManageSuppliers) {
    return (
      <section className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Gestion fournisseur réservée aux administrateurs.
      </section>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <section className="flex min-h-0 flex-1 flex-col gap-2 px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">Fournisseurs</h1>
            <div className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <span className="tabular-nums">{typeof totalResults === 'number' ? totalResults : '…'}</span>
              <span className="ml-1 hidden sm:inline">
                {typeof totalResults === 'number' ? `résultat${totalResults > 1 ? 's' : ''}` : 'résultats'}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button asChild size="sm">
              <Link to="/suppliers/new">
                <Plus className="size-4" />
                Nouveau fournisseur
              </Link>
            </Button>
          </div>

          <div className="sm:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" aria-label="Ajouter un fournisseur">
                  <Plus className="size-4" />
                  Ajouter
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[220px] space-y-2">
                <Button asChild variant="outline" size="sm" className="w-full justify-start">
                  <Link to="/suppliers/new">
                    <Plus className="size-4" />
                    Nouveau fournisseur
                  </Link>
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border/50 bg-muted/20 px-3 py-2.5 sm:px-4 sm:py-3">
              <ClientDirectoryFilters
                key={`supplier-filters-${filtersSyncToken}`}
                search={uiSearch}
                cityDraftSeed={effectiveSearch.city ?? ''}
                searchDraft={searchDraft}
                agencies={agencies}
                commercials={[]}
                departments={departments}
                canFilterAgency={false}
                showTypeFilter={false}
                showCommercialFilter={false}
                searchLabel="RECHERCHE FOURNISSEUR"
                searchPlaceholder="Nom, référence fournisseur, SIRET, SIREN, ville, NAF…"
                syncReadyLabel="Fournisseurs synchronisés"
                syncPendingLabel="Synchronisation fournisseurs en cours"
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

            <AdminSuppliersTable
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
              onEditSupplier={handleEditSupplier}
              onArchiveSupplier={setArchiveTarget}
              onDeleteSupplier={setDeleteTarget}
              canHardDelete={canHardDeleteSuppliers}
            />
          </div>
        </div>

        <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(open) => !open && setArchiveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{archiveTarget?.archived_at ? 'Restaurer ce fournisseur ?' : 'Archiver ce fournisseur ?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {archiveTarget?.archived_at
                  ? 'Le fournisseur redeviendra visible dans la liste active.'
                  : 'Le fournisseur sera retiré de la liste active, sans supprimer son historique.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction disabled={archiveSupplier.isPending} onClick={() => void handleConfirmArchive()}>
                {archiveTarget?.archived_at ? 'Restaurer' : 'Archiver'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
              setDeleteRelatedInteractions(true);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement ce fournisseur ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est réservée aux super admins et supprime la fiche fournisseur.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-start gap-3 rounded-md border border-border bg-surface-1/60 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-destructive"
                checked={deleteRelatedInteractions}
                onChange={(event) => {
                  setDeleteRelatedInteractions(event.target.checked);
                }}
              />
              <span>Supprimer aussi toutes les interactions rattachées à ce fournisseur.</span>
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteSupplier.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void handleConfirmDelete()}
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </TooltipProvider>
  );
};

export default AdminSuppliersPage;
