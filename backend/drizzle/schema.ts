import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { Database } from '../../shared/supabase.types.ts';

type AccountType = Database['public']['Enums']['account_type'];
type UserRole = Database['public']['Enums']['user_role'];

const timestamptz = { withTimezone: true, mode: 'string' } as const;

export const agencies = pgTable('agencies', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  name: text('name').notNull(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const profiles = pgTable('profiles', {
  id: uuid('id').$type<string>().primaryKey(),
  email: text('email').$type<string>().notNull(),
  role: text('role').$type<UserRole>().notNull(),
  first_name: text('first_name').$type<string | null>(),
  last_name: text('last_name').$type<string>().notNull(),
  display_name: text('display_name').$type<string | null>(),
  active_agency_id: uuid('active_agency_id').$type<string | null>(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  must_change_password: boolean('must_change_password').$type<boolean>().notNull(),
  password_changed_at: timestamp('password_changed_at', timestamptz).$type<string | null>(),
  is_system: boolean('is_system').$type<boolean>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_members = pgTable('agency_members', {
  id: uuid('id').$type<string>().defaultRandom().notNull(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  user_id: uuid('user_id').$type<string>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const entities = pgTable('entities', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  entity_type: text('entity_type').$type<string>().notNull(),
  name: text('name').notNull(),
  agency_id: uuid('agency_id').$type<string | null>(),
  address: text('address').$type<string | null>(),
  postal_code: text('postal_code').$type<string | null>(),
  department: text('department').$type<string | null>(),
  city: text('city').$type<string | null>(),
  country: text('country').$type<string>().default('France').notNull(),
  siret: text('siret').$type<string | null>(),
  notes: text('notes').$type<string | null>(),
  client_number: text('client_number').$type<string | null>(),
  account_type: text('account_type').$type<AccountType | null>(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  created_by: uuid('created_by').$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const entity_contacts = pgTable('entity_contacts', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  entity_id: uuid('entity_id').$type<string>().notNull(),
  first_name: text('first_name').$type<string | null>(),
  last_name: text('last_name').notNull(),
  email: text('email').$type<string | null>(),
  phone: text('phone').$type<string | null>(),
  position: text('position').$type<string | null>(),
  notes: text('notes').$type<string | null>(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const interactions = pgTable('interactions', {
  id: uuid('id').$type<string>().primaryKey(),
  agency_id: uuid('agency_id').$type<string | null>(),
  channel: text('channel').notNull(),
  entity_type: text('entity_type').notNull(),
  contact_service: text('contact_service').notNull(),
  company_name: text('company_name').notNull(),
  contact_name: text('contact_name').notNull(),
  contact_phone: text('contact_phone').$type<string | null>(),
  contact_email: text('contact_email').$type<string | null>(),
  subject: text('subject').notNull(),
  mega_families: text('mega_families').array().$type<string[]>().notNull(),
  status: text('status').$type<string>().notNull(),
  status_id: uuid('status_id').$type<string | null>(),
  status_is_terminal: boolean('status_is_terminal').$type<boolean>().default(false).notNull(),
  interaction_type: text('interaction_type').$type<string>().notNull(),
  order_ref: text('order_ref').$type<string | null>(),
  reminder_at: timestamp('reminder_at', timestamptz).$type<string | null>(),
  last_action_at: timestamp('last_action_at', timestamptz).$type<string>().defaultNow().notNull(),
  notes: text('notes').$type<string | null>(),
  entity_id: uuid('entity_id').$type<string | null>(),
  contact_id: uuid('contact_id').$type<string | null>(),
  created_by: uuid('created_by').$type<string>().notNull(),
  updated_by: uuid('updated_by').$type<string | null>(),
  timeline: jsonb('timeline').$type<Database['public']['Tables']['interactions']['Row']['timeline']>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_statuses = pgTable('agency_statuses', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  is_default: boolean('is_default').notNull(),
  category: text('category').notNull(),
  is_terminal: boolean('is_terminal').notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_services = pgTable('agency_services', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_entities = pgTable('agency_entities', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_families = pgTable('agency_families', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_interaction_types = pgTable('agency_interaction_types', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_system_users = pgTable('agency_system_users', {
  agency_id: uuid('agency_id').$type<string>().primaryKey(),
  user_id: uuid('user_id').$type<string>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const drizzleSchema = {
  agencies,
  profiles,
  agency_members,
  entities,
  entity_contacts,
  interactions,
  agency_statuses,
  agency_services,
  agency_entities,
  agency_families,
  agency_interaction_types,
  agency_system_users
};
