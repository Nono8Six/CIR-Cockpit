import type { Agency, ClientContact, Entity } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';

export type ProspectDetailPanelProps = {
  prospect: Entity | null;
  contacts: ClientContact[];
  isContactsLoading: boolean;
  agencies: Agency[];
  focusedContactId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  onEditProspect: () => void;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
};

export type ProspectDetailHeaderProps = {
  prospect: Entity;
  agencyName: string;
  addressLine: string;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  onEditProspect: () => void;
};

export type ProspectDetailContactsSectionProps = {
  contacts: ClientContact[];
  focusedContactId: string | null;
  isContactsLoading: boolean;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
};
