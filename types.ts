
export enum Channel {
  PHONE = 'Téléphone',
  EMAIL = 'Email',
  COUNTER = 'Comptoir',
  VISIT = 'Visite',
}

export enum LeadSource {
  DIRECT = 'Client Direct',
  RETROCESSION = 'Rétrocession Fournisseur',
  WEB = 'Site Web',
}

export interface TimelineEvent {
  id: string;
  date: string; // ISO String
  type: 'note' | 'status_change' | 'reminder_change' | 'creation' | 'file' | 'order_ref_change';
  content: string; // The message or description
  author?: string; // "Moi" for now
  meta?: any; // For storing old/new status values etc
}

export interface Interaction {
  id: string;
  created_at: string; // ISO String
  channel: Channel;
  lead_source: LeadSource;
  supplier_ref?: string;
  entity_type: string; 
  contact_service: string; 
  company_name: string;
  contact_name: string;
  contact_phone: string;
  mega_families: string[]; 
  subject: string;
  order_ref?: string;
  status: string; 
  reminder_at?: string; // ISO String
  notes?: string; // Initial notes
  timeline: TimelineEvent[]; // History of the dossier
}

// --- DEFAULTS FOR INITIALIZATION ---

export const DEFAULT_MEGA_FAMILIES = [
  'PNEUMATIQUE',
  'HYDRAULIQUE',
  'ROULEMENT',
  'TRANSMISSION',
  'ÉTANCHÉITÉ',
  'LINÉAIRE',
  'AUTOMATISME',
  'OUTILLAGE',
  'LUBRIFICATION',
  'ASSEMBLAGE',
  'EPI',
];

export const DEFAULT_SERVICES = [
  'Maintenance/Technique',
  'Achats',
  'Comptabilité',
  'Direction',
  'Magasin/Réception',
];

export const DEFAULT_ENTITY_TYPES = [
  'Client En Compte',
  'Prospect',
  'Client Particulier',
  'Fournisseur',
  'Transporteur',
  'Interne CIR'
];

export const DEFAULT_STATUSES = [
  'À traiter',
  'En attente Info Client',
  'En attente Fournisseur',
  'Devis Envoyé',
  'Clos - Gagné',
  'Clos - Perdu'
];
