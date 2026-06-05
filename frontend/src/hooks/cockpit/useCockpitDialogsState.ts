import { useCallback, useState } from 'react';

import { Entity, EntityContact } from '@/types';

export const useCockpitDialogsState = () => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedContact, setSelectedContact] = useState<EntityContact | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientDialogKind, setClientDialogKind] = useState<'company' | 'individual'>('company');
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Entity | null>(null);
  const [dialogSearchQuery, setDialogSearchQuery] = useState<string>('');

  const handleOpenConvertDialog = useCallback(() => {
    if (!selectedEntity) return;
    setConvertTarget(selectedEntity);
    setIsConvertDialogOpen(true);
  }, [selectedEntity]);

  const closeConvertDialog = useCallback(() => {
    setIsConvertDialogOpen(false);
    setConvertTarget(null);
  }, []);

  const handleConvertDialogChange = useCallback((open: boolean) => {
    setIsConvertDialogOpen(open);
    if (!open) {
      setConvertTarget(null);
    }
  }, []);

  const openClientDialog = useCallback((kind: 'company' | 'individual' = 'company', query: string = '') => {
    setClientDialogKind(kind);
    setDialogSearchQuery(query);
    setIsClientDialogOpen(true);
  }, []);

  const handleClientDialogChange = useCallback((open: boolean) => {
    setIsClientDialogOpen(open);
    if (!open) {
      setClientDialogKind('company');
      setDialogSearchQuery('');
    }
  }, []);

  const openProspectDialog = useCallback((query: string = '') => {
    setDialogSearchQuery(query);
    setIsProspectDialogOpen(true);
  }, []);

  const handleProspectDialogChange = useCallback((open: boolean) => {
    setIsProspectDialogOpen(open);
    if (!open) {
      setDialogSearchQuery('');
    }
  }, []);

  return {
    showSuggestions,
    servicePickerOpen,
    selectedEntity,
    selectedContact,
    isClientDialogOpen,
    clientDialogKind,
    isProspectDialogOpen,
    isContactDialogOpen,
    isConvertDialogOpen,
    convertTarget,
    dialogSearchQuery,
    setShowSuggestions,
    setServicePickerOpen,
    setSelectedEntity,
    setSelectedContact,
    openClientDialog,
    handleClientDialogChange,
    openProspectDialog,
    handleProspectDialogChange,
    setIsProspectDialogOpen,
    setIsContactDialogOpen,
    handleOpenConvertDialog,
    closeConvertDialog,
    handleConvertDialogChange
  };
};
