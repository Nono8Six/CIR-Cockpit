import type { AgencyConfig } from '@/services/config';
import type { Channel, Entity } from '@/types';

export const QUICK_SERVICE_COUNT = 6;

export type UseCockpitDerivedStateParams = {
  channel: Channel;
  entityType: string;
  contactService: string;
  interactionType: string;
  companyName: string;
  companyCity: string;
  contactFirstName: string;
  contactLastName: string;
  contactPosition: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  subject: string;
  megaFamilies: string[];
  statusId: string;
  orderRef: string;
  reminderAt: string;
  notes: string;
  entityId: string;
  contactId: string;
  config: AgencyConfig;
  knownCompanies: string[];
  selectedEntity: Entity | null;
  isClientRelation: boolean;
};
