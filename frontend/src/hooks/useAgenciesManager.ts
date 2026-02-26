import { useCallback, useMemo, useState } from 'react';

import { Agency } from '@/types';
import { useAgencies } from './useAgencies';
import { useCreateAgency } from './useCreateAgency';
import { useRenameAgency } from './useRenameAgency';
import { useArchiveAgency } from './useArchiveAgency';
import { useUnarchiveAgency } from './useUnarchiveAgency';
import { useHardDeleteAgency } from './useHardDeleteAgency';
import { notifySuccess } from '@/services/errors/notify';

type ConfirmArchiveState = {
  agency: Agency;
  nextArchived: boolean;
};

export const useAgenciesManager = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<ConfirmArchiveState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Agency | null>(null);

  const agenciesQuery = useAgencies(showArchived, true);
  const agencies = useMemo(() => agenciesQuery.data ?? [], [agenciesQuery.data]);

  const filteredAgencies = useMemo(() => {
    if (!searchTerm) return agencies;
    const lower = searchTerm.toLowerCase();
    return agencies.filter(agency => agency.name.toLowerCase().includes(lower));
  }, [agencies, searchTerm]);

  const createMutation = useCreateAgency();
  const renameMutation = useRenameAgency();
  const archiveMutation = useArchiveAgency();
  const unarchiveMutation = useUnarchiveAgency();
  const deleteMutation = useHardDeleteAgency();

  const handleCreate = useCallback(async (name: string) => {
    await createMutation.mutateAsync(name);
    notifySuccess('Agence creee.');
  }, [createMutation]);

  const handleRename = useCallback(async (name: string) => {
    if (!selectedAgency) return;
    await renameMutation.mutateAsync({ agencyId: selectedAgency.id, name });
    notifySuccess('Agence renommee.');
  }, [renameMutation, selectedAgency]);

  const openRenameDialog = useCallback((agency: Agency) => {
    setSelectedAgency(agency);
    setRenameOpen(true);
  }, []);

  const handleArchiveToggle = useCallback((agency: Agency) => {
    const nextArchived = !agency.archived_at;
    setConfirmArchive({ agency, nextArchived });
  }, []);

  const executeArchiveToggle = useCallback(async () => {
    if (!confirmArchive) return;
    const { agency, nextArchived } = confirmArchive;
    try {
      if (nextArchived) {
        await archiveMutation.mutateAsync(agency.id);
      } else {
        await unarchiveMutation.mutateAsync(agency.id);
      }
      notifySuccess(nextArchived ? 'Agence archivee.' : 'Agence restauree.');
    } catch {
      return;
    }
  }, [archiveMutation, confirmArchive, unarchiveMutation]);

  const handleHardDelete = useCallback((agency: Agency) => {
    setConfirmDelete(agency);
  }, []);

  const executeHardDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      notifySuccess('Agence supprimee.');
    } catch {
      return;
    }
  }, [confirmDelete, deleteMutation]);

  return {
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
  };
};
