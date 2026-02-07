import type { Agency, Client, ClientContact, Entity, UserRole } from '@/types';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import type { EntityContactPayload } from '@/services/entities/saveEntityContact';

export type ClientsPanelDialogsProps = {
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  clientDialogOpen: boolean;
  onClientDialogChange: (open: boolean) => void;
  clientToEdit: Client | null;
  onSaveClient: (payload: ClientPayload) => Promise<void>;
  prospectDialogOpen: boolean;
  onProspectDialogChange: (open: boolean) => void;
  prospectToEdit: Entity | null;
  onSaveProspect: (payload: EntityPayload) => Promise<void>;
  activeEntity: Entity | null;
  contactDialogOpen: boolean;
  onContactDialogChange: (open: boolean) => void;
  contactToEdit: ClientContact | null;
  onSaveContact: (payload: EntityContactPayload) => Promise<void>;
  confirmArchive: { nextArchived: boolean } | null;
  onConfirmArchiveChange: (value: { nextArchived: boolean } | null) => void;
  onConfirmArchive: () => Promise<void>;
  confirmDeleteContact: ClientContact | null;
  onConfirmDeleteContactChange: (value: ClientContact | null) => void;
  onConfirmDeleteContact: () => Promise<void>;
};
