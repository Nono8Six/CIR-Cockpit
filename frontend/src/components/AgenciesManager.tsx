import AgenciesManagerDialogs from './agencies/AgenciesManagerDialogs';
import AgenciesManagerHeader from './agencies/AgenciesManagerHeader';
import AgenciesManagerList from './agencies/AgenciesManagerList';
import AgenciesManagerSearch from './agencies/AgenciesManagerSearch';
import { useAgenciesManager } from '@/hooks/useAgenciesManager';

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
    <div className="space-y-4 rounded-lg border border-border bg-card p-3 shadow-sm sm:p-5" data-testid="admin-agencies-panel">
      <AgenciesManagerHeader
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(prev => !prev)}
        onCreate={() => setCreateOpen(true)}
      />

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
