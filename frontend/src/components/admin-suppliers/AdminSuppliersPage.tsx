import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Loader2, Plus } from 'lucide-react';
import type { DirectoryListRow, DirectorySearchState } from 'shared/schemas/directory.schema';

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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useDeleteSupplier, useSaveSupplier, useSetSupplierArchived } from '@/hooks/useSaveSupplier';
import { notifySuccess } from '@/services/errors/notify';

import AdminSuppliersTable from './AdminSuppliersTable';
import { useSupplierDirectoryWorkspace } from './useSupplierDirectoryWorkspace';

type SupplierEditDraft = {
  id: string;
  name: string;
  supplier_code: string;
  supplier_number: string;
  primary_phone: string;
  primary_email: string;
  address: string;
  postal_code: string;
  department: string;
  city: string;
  siren: string;
  siret: string;
  naf_code: string;
  official_name: string;
  official_data_source: 'api-recherche-entreprises' | null;
  official_data_synced_at: string | null;
  notes: string;
};

const toEditDraft = (row: DirectoryListRow): SupplierEditDraft => ({
  id: row.id,
  name: row.name,
  supplier_code: row.supplier_code ?? '',
  supplier_number: row.supplier_number ?? '',
  primary_phone: row.primary_phone ?? '',
  primary_email: row.primary_email ?? '',
  address: row.address ?? '',
  postal_code: row.postal_code ?? '',
  department: row.department ?? '',
  city: row.city ?? '',
  siren: row.siren ?? '',
  siret: row.siret ?? '',
  naf_code: row.naf_code ?? '',
  official_name: row.official_name ?? '',
  official_data_source: row.official_data_source ?? null,
  official_data_synced_at: row.official_data_synced_at ?? null,
  notes: row.notes ?? ''
});

const normalizeSupplierCode = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);

const normalizeSupplierNumber = (value: string): string =>
  value.replace(/\D/g, '').slice(0, 15);

const normalizeNafCode = (value: string): string =>
  value.trim().replace(/\s+/g, '').toUpperCase().replace(/^(\d{2})\.?(\d{2})([A-Z])$/, '$1.$2$3');

const AdminSuppliersPage = () => {
  const navigate = useNavigate({ from: '/admin/suppliers' });
  const search = useSearch({ from: '/admin/suppliers' });
  const [editingSupplier, setEditingSupplier] = useState<SupplierEditDraft | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DirectoryListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectoryListRow | null>(null);

  const handleSearchChange = useCallback(
    (updater: (previous: DirectorySearchState) => DirectorySearchState) => {
      void navigate({
        search: (previous) => updater({ ...search, ...previous })
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
  const saveSupplier = useSaveSupplier(effectiveSearch.includeArchived);
  const archiveSupplier = useSetSupplierArchived(effectiveSearch.includeArchived);
  const deleteSupplier = useDeleteSupplier(effectiveSearch.includeArchived);
  const canHardDeleteSuppliers = userRole === 'super_admin';
  const canSaveEditedSupplier = Boolean(
    editingSupplier?.name.trim()
      && (editingSupplier.primary_phone.trim() || editingSupplier.primary_email.trim())
  );

  const updateEditingSupplier = useCallback((key: keyof SupplierEditDraft, value: string) => {
    setEditingSupplier((current) => {
      if (!current) return current;
      return { ...current, [key]: value };
    });
  }, []);

  const handleSaveEditedSupplier = useCallback(async () => {
    if (!editingSupplier || !canSaveEditedSupplier || saveSupplier.isPending) return;

    await saveSupplier.mutateAsync({
      id: editingSupplier.id,
      entity_type: 'Fournisseur',
      name: editingSupplier.name,
      supplier_code: editingSupplier.supplier_code,
      supplier_number: editingSupplier.supplier_number,
      primary_phone: editingSupplier.primary_phone,
      primary_email: editingSupplier.primary_email,
      address: editingSupplier.address,
      postal_code: editingSupplier.postal_code,
      department: editingSupplier.department,
      city: editingSupplier.city,
      siren: editingSupplier.siren,
      siret: editingSupplier.siret,
      naf_code: editingSupplier.naf_code,
      official_name: editingSupplier.official_name,
      official_data_source: editingSupplier.official_data_source,
      official_data_synced_at: editingSupplier.official_data_synced_at,
      notes: editingSupplier.notes
    });
    notifySuccess('Fournisseur modifié.');
    setEditingSupplier(null);
  }, [canSaveEditedSupplier, editingSupplier, saveSupplier]);

  const handleConfirmArchive = useCallback(async () => {
    if (!archiveTarget || archiveSupplier.isPending) return;
    const nextArchived = !archiveTarget.archived_at;
    await archiveSupplier.mutateAsync({ supplierId: archiveTarget.id, archived: nextArchived });
    notifySuccess(nextArchived ? 'Fournisseur archivé.' : 'Fournisseur restauré.');
    setArchiveTarget(null);
  }, [archiveSupplier, archiveTarget]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteSupplier.isPending) return;
    await deleteSupplier.mutateAsync(deleteTarget.id);
    notifySuccess('Fournisseur supprimé définitivement.');
    setDeleteTarget(null);
  }, [deleteSupplier, deleteTarget]);

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
              <Link to="/admin/suppliers/new">
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
                  <Link to="/admin/suppliers/new">
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
              onEditSupplier={(row) => setEditingSupplier(toEditDraft(row))}
              onArchiveSupplier={setArchiveTarget}
              onDeleteSupplier={setDeleteTarget}
              canHardDelete={canHardDeleteSuppliers}
            />
          </div>
        </div>

        <Dialog open={Boolean(editingSupplier)} onOpenChange={(open) => !open && setEditingSupplier(null)}>
          <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le fournisseur</DialogTitle>
              <DialogDescription>
                Les changements sont enregistrés dans le référentiel global CIR.
              </DialogDescription>
            </DialogHeader>
            {editingSupplier ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Input name="edit-supplier-name" value={editingSupplier.name} onChange={(event) => updateEditingSupplier('name', event.target.value)} placeholder="Nom fournisseur…" aria-label="Nom fournisseur" autoComplete="off" />
                <Input name="edit-supplier-code" value={editingSupplier.supplier_code} onChange={(event) => updateEditingSupplier('supplier_code', normalizeSupplierCode(event.target.value))} placeholder="Code interne…" aria-label="Code interne fournisseur" className="font-mono uppercase" maxLength={4} autoComplete="off" spellCheck={false} />
                <Input name="edit-supplier-number" value={editingSupplier.supplier_number} onChange={(event) => updateEditingSupplier('supplier_number', normalizeSupplierNumber(event.target.value))} placeholder="N° fournisseur…" aria-label="Numéro fournisseur" inputMode="numeric" maxLength={15} autoComplete="off" />
                <Input name="edit-supplier-phone" value={editingSupplier.primary_phone} onChange={(event) => updateEditingSupplier('primary_phone', event.target.value)} placeholder="Téléphone principal…" aria-label="Téléphone fournisseur" type="tel" autoComplete="off" />
                <Input name="edit-supplier-email" value={editingSupplier.primary_email} onChange={(event) => updateEditingSupplier('primary_email', event.target.value)} placeholder="Email principal…" aria-label="Email fournisseur" type="email" autoComplete="off" spellCheck={false} />
                <Input name="edit-supplier-address" value={editingSupplier.address} onChange={(event) => updateEditingSupplier('address', event.target.value)} placeholder="Adresse…" aria-label="Adresse fournisseur" className="md:col-span-2" autoComplete="off" />
                <Input name="edit-supplier-postal-code" value={editingSupplier.postal_code} onChange={(event) => updateEditingSupplier('postal_code', event.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Code postal…" aria-label="Code postal fournisseur" inputMode="numeric" autoComplete="off" />
                <Input name="edit-supplier-city" value={editingSupplier.city} onChange={(event) => updateEditingSupplier('city', event.target.value)} placeholder="Ville…" aria-label="Ville fournisseur" autoComplete="off" />
                <Input name="edit-supplier-department" value={editingSupplier.department} onChange={(event) => updateEditingSupplier('department', event.target.value.toUpperCase())} placeholder="Département…" aria-label="Département fournisseur" autoComplete="off" />
                <Input name="edit-supplier-naf" value={editingSupplier.naf_code} onChange={(event) => updateEditingSupplier('naf_code', normalizeNafCode(event.target.value))} placeholder="NAF…" aria-label="NAF fournisseur" className="font-mono uppercase" autoComplete="off" spellCheck={false} />
                <Input name="edit-supplier-siren" value={editingSupplier.siren} onChange={(event) => updateEditingSupplier('siren', event.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="SIREN…" aria-label="SIREN fournisseur" inputMode="numeric" autoComplete="off" />
                <Input name="edit-supplier-siret" value={editingSupplier.siret} onChange={(event) => updateEditingSupplier('siret', event.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="SIRET…" aria-label="SIRET fournisseur" inputMode="numeric" autoComplete="off" />
                <Textarea name="edit-supplier-notes" value={editingSupplier.notes} onChange={(event) => updateEditingSupplier('notes', event.target.value)} placeholder="Notes…" aria-label="Notes fournisseur" className="md:col-span-2" />
                {!canSaveEditedSupplier ? (
                  <p className="md:col-span-2 text-sm text-destructive">Nom et téléphone ou email sont requis.</p>
                ) : null}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>
                Annuler
              </Button>
              <Button type="button" disabled={!canSaveEditedSupplier || saveSupplier.isPending} onClick={() => void handleSaveEditedSupplier()}>
                {saveSupplier.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement ce fournisseur ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est réservée aux super admins et supprime la fiche. Si des interactions y sont encore liées, le backend peut refuser la suppression.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
