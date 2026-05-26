import { Building2, Archive } from 'lucide-react';
import AgenciesManagerDialogs from './agencies/AgenciesManagerDialogs';
import AgenciesManagerHeader from './agencies/AgenciesManagerHeader';
import AgenciesManagerList from './agencies/AgenciesManagerList';
import AgenciesManagerSearch from './agencies/AgenciesManagerSearch';
import { useAgenciesManager } from '../hooks/admin/agencies/core/useAgenciesManager';

const AgenciesManager = () => {
  const {
    showArchived,
    searchTerm,
    createOpen,
    renameOpen,
    selectedAgency,
    confirmArchive,
    confirmDelete,
    agenciesQuery,
    filteredAgencies,
    setShowArchived,
    setSearchTerm,
    setCreateOpen,
    setRenameOpen,
    setConfirmArchive,
    setConfirmDelete,
    openRenameDialog,
    handleCreate,
    handleRename,
    handleArchiveToggle,
    executeArchiveToggle,
    handleHardDelete,
    executeHardDelete
  } = useAgenciesManager();

  return (
    <div className="space-y-6 pb-6 w-full" data-testid="admin-agencies-panel">
      <AgenciesManagerHeader
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(prev => !prev)}
        onCreate={() => setCreateOpen(true)}
      />

      {/* Statistiques rapides */}
      {!agenciesQuery.isLoading && !agenciesQuery.isError && agenciesQuery.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="group rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:border-border/80 transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Total</span>
              <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {agenciesQuery.data.length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/30 text-muted-foreground/80 group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300">
              <Building2 size={20} />
            </div>
          </div>
          <div className="group rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:border-success/30 transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Actives</span>
              <span className="text-2xl font-bold tracking-tight text-success font-mono">
                {agenciesQuery.data.filter((a) => !a.archived_at).length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-success/10 text-success group-hover:bg-success/20 transition-colors duration-300">
              <Building2 size={20} />
            </div>
          </div>
          <div className="group rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:border-warning/30 transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Archivées</span>
              <span className="text-2xl font-bold tracking-tight text-warning font-mono">
                {agenciesQuery.data.filter((a) => !!a.archived_at).length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning group-hover:bg-warning/20 transition-colors duration-300">
              <Archive size={20} />
            </div>
          </div>
        </div>
      )}

      <AgenciesManagerSearch value={searchTerm} onChange={setSearchTerm} />

      <AgenciesManagerList
        agencies={filteredAgencies}
        isLoading={agenciesQuery.isLoading}
        isError={agenciesQuery.isError}
        onRetry={() => {
          void agenciesQuery.refetch();
        }}
        onRename={openRenameDialog}
        onToggleArchive={handleArchiveToggle}
        onDelete={handleHardDelete}
      />

      <AgenciesManagerDialogs
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        renameOpen={renameOpen}
        onRenameOpenChange={setRenameOpen}
        selectedAgency={selectedAgency}
        onCreate={handleCreate}
        onRename={handleRename}
        confirmArchive={confirmArchive}
        onConfirmArchiveChange={setConfirmArchive}
        onConfirmArchive={executeArchiveToggle}
        confirmDelete={confirmDelete}
        onConfirmDeleteChange={setConfirmDelete}
        onConfirmDelete={executeHardDelete}
      />
    </div>
  );
};

export default AgenciesManager;
