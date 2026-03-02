import type { Agency, AgencyStatus, Client, ClientContact, Interaction, UserRole } from '@/types';

export type ClientDetailPanelProps = {
  client: Client | null;
  contacts: ClientContact[];
  isContactsLoading: boolean;
  activeAgencyId: string | null;
  statuses: AgencyStatus[];
  agencies: Agency[];
  userRole: UserRole;
  focusedContactId: string | null;
  onEditClient: () => void;
  onToggleArchive: (archived: boolean) => void;
  onDeleteClient: () => void;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
};

export type ClientDetailInteractionsSectionProps = {
  interactions: Interaction[];
  isInteractionsLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalInteractions: number;
  onOpenInteraction: (interaction: Interaction) => void;
  onDeleteInteraction: (interaction: Interaction) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onRetry: () => void;
  hasError: boolean;
};

export type ClientDetailHeaderProps = {
  client: Client;
  agencyName: string;
  isArchived: boolean;
  canDeleteClient: boolean;
  onEditClient: () => void;
  onToggleArchive: (archived: boolean) => void;
  onDeleteClient: () => void;
};

export type ClientDetailContactsSectionProps = {
  contacts: ClientContact[];
  focusedContactId: string | null;
  isContactsLoading: boolean;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
};
