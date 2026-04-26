import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type {
  AgencyOnboardingOverrides,
  ProductFeatureFlags,
  ProductOnboardingConfig
} from '../../shared/schemas/config.schema.ts';
import type { Database } from '../../shared/supabase.types.ts';
import type { DirectorySavedViewState } from '../../shared/schemas/directory.schema.ts';

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

export const audit_logs = pgTable('audit_logs', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  action: text('action').notNull(),
  actor_id: uuid('actor_id').$type<string | null>(),
  actor_is_super_admin: boolean('actor_is_super_admin').$type<boolean>().default(false).notNull(),
  agency_id: uuid('agency_id').$type<string | null>(),
  entity_table: text('entity_table').notNull(),
  entity_id: text('entity_id').notNull(),
  metadata: jsonb('metadata').$type<Database['public']['Tables']['audit_logs']['Row']['metadata']>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const directory_saved_views = pgTable('directory_saved_views', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  user_id: uuid('user_id').$type<string>().notNull(),
  name: text('name').notNull(),
  state: jsonb('state').$type<DirectorySavedViewState>().notNull(),
  is_default: boolean('is_default').$type<boolean>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const app_settings = pgTable('app_settings', {
  id: integer('id').$type<number>().primaryKey(),
  feature_flags: jsonb('feature_flags').$type<ProductFeatureFlags>().notNull(),
  onboarding: jsonb('onboarding').$type<ProductOnboardingConfig>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_settings = pgTable('agency_settings', {
  agency_id: uuid('agency_id').$type<string>().primaryKey(),
  onboarding: jsonb('onboarding').$type<AgencyOnboardingOverrides>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const reference_departments = pgTable('reference_departments', {
  code: text('code').$type<string>().primaryKey(),
  label: text('label').$type<string>().notNull(),
  sort_order: integer('sort_order').$type<number>().notNull(),
  is_active: boolean('is_active').$type<boolean>().notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const entities = pgTable('entities', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  entity_type: text('entity_type').$type<string>().notNull(),
  client_kind: text('client_kind').$type<'company' | 'individual' | null>(),
  name: text('name').notNull(),
  agency_id: uuid('agency_id').$type<string | null>(),
  address: text('address').$type<string | null>(),
  postal_code: text('postal_code').$type<string | null>(),
  department: text('department').$type<string | null>(),
  city: text('city').$type<string | null>(),
  country: text('country').$type<string>().default('France').notNull(),
  siret: text('siret').$type<string | null>(),
  siren: text('siren').$type<string | null>(),
  naf_code: text('naf_code').$type<string | null>(),
  official_name: text('official_name').$type<string | null>(),
  official_data_source: text('official_data_source').$type<string | null>(),
  official_data_synced_at: timestamp('official_data_synced_at', timestamptz).$type<string | null>(),
  notes: text('notes').$type<string | null>(),
  client_number: text('client_number').$type<string | null>(),
  account_type: text('account_type').$type<AccountType | null>(),
  cir_commercial_id: uuid('cir_commercial_id').$type<string | null>(),
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
  id: text('id').$type<string>().primaryKey(),
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

export const interaction_drafts = pgTable('interaction_drafts', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  user_id: uuid('user_id').$type<string>().notNull(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  form_type: text('form_type').$type<string>().default('interaction').notNull(),
  payload: jsonb('payload').$type<Database['public']['Tables']['interaction_drafts']['Row']['payload']>().notNull(),
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
  audit_logs,
  directory_saved_views,
  app_settings,
  agency_settings,
  reference_departments,
  entities,
  entity_contacts,
  interactions,
  interaction_drafts,
  agency_statuses,
  agency_services,
  agency_entities,
  agency_families,
  agency_interaction_types,
  agency_system_users
};
