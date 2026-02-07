import type { Agency, Client, ClientContact, UserRole } from '@/types';

export type ClientDetailPanelProps = {
  client: Client | null;
  contacts: ClientContact[];
  isContactsLoading: boolean;
  agencies: Agency[];
  userRole: UserRole;
  focusedContactId: string | null;
  onEditClient: () => void;
  onToggleArchive: (archived: boolean) => void;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
};

export type ClientDetailHeaderProps = {
  client: Client;
  agencyName: string;
  isArchived: boolean;
  onEditClient: () => void;
  onToggleArchive: (archived: boolean) => void;
};

export type ClientDetailContactsSectionProps = {
  contacts: ClientContact[];
  focusedContactId: string | null;
  isContactsLoading: boolean;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
};
