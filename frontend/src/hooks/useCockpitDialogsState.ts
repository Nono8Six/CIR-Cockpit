import { useCallback, useState } from 'react';

import { Entity, EntityContact } from '@/types';

export const useCockpitDialogsState = () => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedContact, setSelectedContact] = useState<EntityContact | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Entity | null>(null);

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

  return {
    showSuggestions,
    servicePickerOpen,
    selectedEntity,
    selectedContact,
    isClientDialogOpen,
    isContactDialogOpen,
    isConvertDialogOpen,
    convertTarget,
    setShowSuggestions,
    setServicePickerOpen,
    setSelectedEntity,
    setSelectedContact,
    setIsClientDialogOpen,
    setIsContactDialogOpen,
    handleOpenConvertDialog,
    closeConvertDialog,
    handleConvertDialogChange
  };
};
