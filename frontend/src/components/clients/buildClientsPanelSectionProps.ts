import type { ComponentProps } from 'react';

import ClientsPanelContent from './ClientsPanelContent';
import ClientsPanelDialogs from './ClientsPanelDialogs';
import ClientsPanelToolbar from './ClientsPanelToolbar';
import type { ClientsPanelState } from './ClientsPanel.types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { UserRole } from '@/types';

type ToolbarProps = ComponentProps<typeof ClientsPanelToolbar>;
type ContentProps = ComponentProps<typeof ClientsPanelContent>;
type DialogsProps = ComponentProps<typeof ClientsPanelDialogs>;

type BuildContentPropsArgs = {
  state: ClientsPanelState;
  focusedContactId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  userRole: UserRole;
};

type BuildDialogsPropsArgs = {
  state: ClientsPanelState;
  activeAgencyId: string | null;
  userRole: UserRole;
};

export const buildClientsPanelToolbarProps = (
  state: ClientsPanelState,
  userRole: UserRole
): ToolbarProps => ({
  viewMode: state.viewMode,
  onViewModeChange: state.setViewMode,
  showArchived: state.showArchived,
  onToggleArchived: () => state.setShowArchived((prev) => !prev),
  onCreateClient: state.handleCreateClient,
  searchTerm: state.searchTerm,
  onSearchTermChange: state.setSearchTerm,
  userRole,
  agencies: state.agencies,
  agencyFilterId: state.agencyFilterId,
  onAgencyFilterChange: state.setAgencyFilterId
});

export const buildClientsPanelContentProps = ({
  state,
  focusedContactId,
  onRequestConvert,
  userRole
}: BuildContentPropsArgs): ContentProps => ({
  viewMode: state.viewMode,
  clientsLoading: state.clientsQuery.isLoading,
  clientsError: state.clientsQuery.isError,
  filteredClients: state.filteredClients,
  selectedClientId: state.selectedClientId,
  onSelectClient: state.setSelectedClientId,
  prospectsLoading: state.prospectsQuery.isLoading,
  prospectsError: state.prospectsQuery.isError,
  filteredProspects: state.filteredProspects,
  selectedProspectId: state.selectedProspectId,
  onSelectProspect: state.setSelectedProspectId,
  selectedClient: state.selectedClient,
  selectedProspect: state.selectedProspect,
  contacts: state.contacts,
  contactsLoading: state.contactsQuery.isLoading,
  agencies: state.agencies,
  userRole,
  focusedContactId,
  onEditClient: state.handleEditClient,
  onToggleArchive: state.handleToggleArchive,
  onAddContact: state.handleAddContact,
  onEditContact: state.handleEditContact,
  onDeleteContact: state.handleDeleteContact,
  onRequestConvert,
  onEditProspect: state.handleEditProspect
});

export const buildClientsPanelDialogsProps = ({
  state,
  activeAgencyId,
  userRole
}: BuildDialogsPropsArgs): DialogsProps => ({
  agencies: state.agencies,
  userRole,
  activeAgencyId,
  clientDialogOpen: state.clientDialogOpen,
  onClientDialogChange: state.setClientDialogOpen,
  clientToEdit: state.clientToEdit,
  onSaveClient: state.handleSaveClient,
  prospectDialogOpen: state.prospectDialogOpen,
  onProspectDialogChange: state.setProspectDialogOpen,
  prospectToEdit: state.prospectToEdit,
  onSaveProspect: state.handleSaveProspect,
  activeEntity: state.activeEntity,
  contactDialogOpen: state.contactDialogOpen,
  onContactDialogChange: state.setContactDialogOpen,
  contactToEdit: state.contactToEdit,
  onSaveContact: state.handleSaveContact,
  confirmArchive: state.confirmArchive,
  onConfirmArchiveChange: state.setConfirmArchive,
  onConfirmArchive: state.executeToggleArchive,
  confirmDeleteContact: state.confirmDeleteContact,
  onConfirmDeleteContactChange: state.setConfirmDeleteContact,
  onConfirmDeleteContact: state.executeDeleteContact
});
