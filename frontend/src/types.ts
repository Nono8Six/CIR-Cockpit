import { Enums, Json, Tables, TablesInsert, TablesUpdate } from './types/supabase';

export enum Channel {
  PHONE = 'Téléphone',
  EMAIL = 'Email',
  COUNTER = 'Comptoir',
  VISIT = 'Visite'
}

export type StatusCategory = 'todo' | 'in_progress' | 'done';
export type AppTab = 'cockpit' | 'dashboard' | 'settings' | 'clients' | 'admin';

export type AgencyStatus = {
  id?: string;
  agency_id?: string;
  label: string;
  category: StatusCategory;
  is_terminal: boolean;
  is_default: boolean;
  sort_order: number;
};

export interface TimelineEvent {
  [key: string]: Json | undefined;
  id: string;
  date: string; // ISO String
  type: 'note' | 'status_change' | 'reminder_change' | 'creation' | 'file' | 'order_ref_change';
  content: string; // The message or description
  author?: string; // Display label or identifier
  meta?: Record<string, Json>; // For storing old/new status values etc
}

export type UserRole = Enums<'user_role'>;
export type AccountType = Enums<'account_type'>;

export type Agency = Tables<'agencies'>;
export type UserProfile = Tables<'profiles'>;
export type AgencyMember = Tables<'agency_members'>;
export type Entity = Tables<'entities'>;
export type EntityContact = Tables<'entity_contacts'>;

export type EntityInsert = TablesInsert<'entities'>;
export type EntityUpdate = TablesUpdate<'entities'>;
export type EntityContactInsert = TablesInsert<'entity_contacts'>;
export type EntityContactUpdate = TablesUpdate<'entity_contacts'>;

export type Client = Entity;
export type ClientContact = EntityContact;
export type ClientInsert = EntityInsert;
export type ClientUpdate = EntityUpdate;
export type ClientContactInsert = EntityContactInsert;
export type ClientContactUpdate = EntityContactUpdate;

export type InteractionRow = Tables<'interactions'>;

export type Interaction = Omit<InteractionRow, 'timeline' | 'channel'> & {
  timeline: TimelineEvent[];
  channel: Channel;
};

type InteractionInsertRow = TablesInsert<'interactions'>;
type InteractionUpdateRow = TablesUpdate<'interactions'>;

export type InteractionInsert = Omit<
  InteractionInsertRow,
  'id' | 'timeline' | 'channel' | 'status' | 'status_is_terminal'
> & {
  id?: string;
  timeline?: TimelineEvent[];
  channel: Channel;
  status?: string;
  status_is_terminal?: boolean;
};

export type InteractionUpdate = Omit<
  InteractionUpdateRow,
  'timeline' | 'channel'
> & {
  timeline?: TimelineEvent[];
  channel?: Channel;
};

export type InteractionDraft = Omit<
  InteractionInsert,
  'id' | 'agency_id' | 'created_by' | 'timeline'
> & {
  id?: string;
  agency_id?: string;
  created_by?: string;
  timeline: TimelineEvent[];
};

export type AgencyMembershipSummary = {
  agency_id: string;
  agency_name: string;
};

export type AgencyContext = AgencyMembershipSummary;
