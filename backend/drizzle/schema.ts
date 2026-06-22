import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { Database } from '../../shared/supabase.types.ts';
import type { DirectorySavedViewState } from '../../shared/schemas/system/directory.schema.ts';
import type {
  PricingReferenceAnomalySeverity,
  PricingReferenceAnomalyStatus,
  PricingReferenceAnomalyType,
  PricingReferenceFileKind,
  PricingReferenceHealthReport
} from '../../shared/schemas/pricing/references.schema.ts';

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

export const cir_agencies = pgTable('cir_agencies', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  name: text('name').notNull(),
  region: text('region').$type<string | null>(),
  city: text('city').$type<string | null>(),
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
  phone: text('phone').$type<string | null>(),
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
  first_name: text('first_name').$type<string | null>(),
  last_name: text('last_name').$type<string | null>(),
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
  primary_phone: text('primary_phone').$type<string | null>(),
  primary_email: text('primary_email').$type<string | null>(),
  supplier_code: text('supplier_code').$type<string | null>(),
  supplier_number: text('supplier_number').$type<string | null>(),
  client_number: text('client_number').$type<string | null>(),
  account_type: text('account_type').$type<AccountType | null>(),
  cir_commercial_id: uuid('cir_commercial_id').$type<string | null>(),
  cir_agency_id: uuid('cir_agency_id').$type<string | null>(),
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
  service_label: text('service_label').$type<string | null>(),
  is_primary: boolean('is_primary').$type<boolean>().default(false).notNull(),
  notes: text('notes').$type<string | null>(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_reference_imports = pgTable('pricing_reference_imports', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  status: text('status').$type<'brouillon' | 'analyse_en_cours' | 'analyse_ok' | 'analyse_erreur' | 'pret_activation' | 'rejete' | 'archive'>().default('brouillon').notNull(),
  created_by: uuid('created_by').$type<string | null>(),
  analyzed_by: uuid('analyzed_by').$type<string | null>(),
  analysis_started_at: timestamp('analysis_started_at', timestamptz).$type<string | null>(),
  analysis_completed_at: timestamp('analysis_completed_at', timestamptz).$type<string | null>(),
  health_report: jsonb('health_report').$type<PricingReferenceHealthReport | null>(),
  counters: jsonb('counters').$type<Record<string, unknown>>().default({}).notNull(),
  error_code: text('error_code').$type<string | null>(),
  error_message: text('error_message').$type<string | null>(),
  error_details: text('error_details').$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_reference_import_files = pgTable('pricing_reference_import_files', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  import_id: uuid('import_id').$type<string>().notNull(),
  file_kind: text('file_kind').$type<PricingReferenceFileKind>().notNull(),
  original_filename: text('original_filename').$type<string>().notNull(),
  storage_bucket: text('storage_bucket').$type<'pricing-reference-sources'>().default('pricing-reference-sources').notNull(),
  storage_path: text('storage_path').$type<string>().notNull(),
  size_bytes: integer('size_bytes').$type<number>().notNull(),
  sha256: text('sha256').$type<string>().notNull(),
  content_type: text('content_type').$type<string | null>(),
  sheet_name: text('sheet_name').$type<string | null>(),
  detected_columns: text('detected_columns').array().$type<string[]>().default([]).notNull(),
  row_count: integer('row_count').$type<number | null>(),
  uploaded_by: uuid('uploaded_by').$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_reference_snapshots = pgTable('pricing_reference_snapshots', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  import_id: uuid('import_id').$type<string>().notNull(),
  status: text('status').$type<'cree' | 'pret_activation' | 'actif' | 'archive'>().default('cree').notNull(),
  is_active: boolean('is_active').$type<boolean>().default(false).notNull(),
  activated_at: timestamp('activated_at', timestamptz).$type<string | null>(),
  created_by: uuid('created_by').$type<string | null>(),
  counters: jsonb('counters').$type<Record<string, unknown>>().default({}).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_classification_cir = pgTable('pricing_classification_cir', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  snapshot_id: uuid('snapshot_id').$type<string>().notNull(),
  import_id: uuid('import_id').$type<string>().notNull(),
  source_file_id: uuid('source_file_id').$type<string>().notNull(),
  source_row_number: integer('source_row_number').$type<number>().notNull(),
  mega: text('mega').$type<string>().notNull(),
  fam: text('fam').$type<string>().notNull(),
  sfa: text('sfa').$type<string>().notNull(),
  mega_lib: text('mega_lib').$type<string>().notNull(),
  fam_lib: text('fam_lib').$type<string>().notNull(),
  sfa_lib: text('sfa_lib').$type<string>().notNull(),
  cir_key: text('cir_key').$type<string>().notNull(),
  raw_values: jsonb('raw_values').$type<Record<string, string>>().default({}).notNull(),
  normalized_values: jsonb('normalized_values').$type<Record<string, string>>().default({}).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_supplier_segments = pgTable('pricing_supplier_segments', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  snapshot_id: uuid('snapshot_id').$type<string>().notNull(),
  import_id: uuid('import_id').$type<string>().notNull(),
  source_file_id: uuid('source_file_id').$type<string>().notNull(),
  source_row_number: integer('source_row_number').$type<number>().notNull(),
  segment: text('segment').$type<string>().notNull(),
  idnumerique: text('idnumerique').$type<string>().notNull(),
  marque: text('marque').$type<string>().notNull(),
  cat_fab: text('cat_fab').$type<string>().notNull(),
  cat_fab_l: text('cat_fab_l').$type<string | null>(),
  strategiq: text('strategiq').$type<string | null>(),
  codif_fair: text('codif_fair').$type<string | null>(),
  tarif_fab: text('tarif_fab').$type<string | null>(),
  segment_key: text('segment_key').$type<string>().notNull(),
  raw_values: jsonb('raw_values').$type<Record<string, string>>().default({}).notNull(),
  normalized_values: jsonb('normalized_values').$type<Record<string, string>>().default({}).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_segment_classification_links = pgTable('pricing_segment_classification_links', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  snapshot_id: uuid('snapshot_id').$type<string>().notNull(),
  import_id: uuid('import_id').$type<string>().notNull(),
  segment_id: uuid('segment_id').$type<string>().notNull(),
  classification_id: uuid('classification_id').$type<string | null>(),
  source_file_id: uuid('source_file_id').$type<string>().notNull(),
  source_row_number: integer('source_row_number').$type<number>().notNull(),
  mega_famille: text('mega_famille').$type<string | null>(),
  famille: text('famille').$type<string | null>(),
  sous_famille: text('sous_famille').$type<string | null>(),
  cir_key: text('cir_key').$type<string>().notNull(),
  link_status: text('link_status').$type<'complete_valid' | 'missing' | 'partial' | 'unknown_key' | 'ambiguous'>().notNull(),
  raw_values: jsonb('raw_values').$type<Record<string, string>>().default({}).notNull(),
  normalized_values: jsonb('normalized_values').$type<Record<string, string>>().default({}).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_segment_purchase_grids = pgTable('pricing_segment_purchase_grids', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  snapshot_id: uuid('snapshot_id').$type<string>().notNull(),
  import_id: uuid('import_id').$type<string>().notNull(),
  segment_id: uuid('segment_id').$type<string>().notNull(),
  source_file_id: uuid('source_file_id').$type<string>().notNull(),
  source_row_number: integer('source_row_number').$type<number>().notNull(),
  num_four: text('num_four').$type<string | null>(),
  remise_ha: text('remise_ha').$type<string | null>(),
  col_ha: text('col_ha').$type<string | null>(),
  priorite: text('priorite').$type<string | null>(),
  type_grill: text('type_grill').$type<string | null>(),
  date_debut_raw: text('date_debut_raw').$type<string | null>(),
  date_fin_raw: text('date_fin_raw').$type<string | null>(),
  date_debut_normalized: text('date_debut_normalized').$type<string | null>(),
  date_fin_normalized: text('date_fin_normalized').$type<string | null>(),
  borne_acha: text('borne_acha').$type<string | null>(),
  coef_retro: text('coef_retro').$type<string | null>(),
  coef_ha: text('coef_ha').$type<string | null>(),
  coef_majvte: text('coef_majvte').$type<string | null>(),
  raw_values: jsonb('raw_values').$type<Record<string, string>>().default({}).notNull(),
  normalized_values: jsonb('normalized_values').$type<Record<string, string>>().default({}).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_reference_anomalies = pgTable('pricing_reference_anomalies', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  import_id: uuid('import_id').$type<string>().notNull(),
  snapshot_id: uuid('snapshot_id').$type<string | null>(),
  source_file_id: uuid('source_file_id').$type<string | null>(),
  source_row_number: integer('source_row_number').$type<number | null>(),
  type: text('type').$type<PricingReferenceAnomalyType>().notNull(),
  severity: text('severity').$type<PricingReferenceAnomalySeverity>().notNull(),
  status: text('status').$type<PricingReferenceAnomalyStatus>().default('nouvelle').notNull(),
  object_type: text('object_type').$type<string | null>(),
  object_id: text('object_id').$type<string | null>(),
  columns: text('columns').array().$type<string[]>().default([]).notNull(),
  message: text('message').$type<string>().notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const pricing_reference_diffs = pgTable('pricing_reference_diffs', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  base_snapshot_id: uuid('base_snapshot_id').$type<string | null>(),
  target_snapshot_id: uuid('target_snapshot_id').$type<string>().notNull(),
  diff_type: text('diff_type').$type<string>().notNull(),
  object_type: text('object_type').$type<string>().notNull(),
  object_key: text('object_key').$type<string>().notNull(),
  severity: text('severity').$type<PricingReferenceAnomalySeverity>().notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull()
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
  is_active: boolean('is_active').$type<boolean>().default(true).notNull(),
  deactivated_at: timestamp('deactivated_at', timestamptz).$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_services = pgTable('agency_services', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_families = pgTable('agency_families', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_interaction_types = pgTable('agency_interaction_types', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  archived_at: timestamp('archived_at', timestamptz).$type<string | null>(),
  label: text('label').notNull(),
  sort_order: integer('sort_order').notNull(),
  requires_product_families: boolean('requires_product_families').$type<boolean>().default(false).notNull(),
  created_at: timestamp('created_at', timestamptz).$type<string>().defaultNow().notNull(),
  updated_at: timestamp('updated_at', timestamptz).$type<string>().defaultNow().notNull()
});

export const agency_reference_resolutions = pgTable('agency_reference_resolutions', {
  id: uuid('id').$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').$type<string>().notNull(),
  dimension: text('dimension').$type<'statuses' | 'services' | 'families' | 'interaction_types'>().notNull(),
  source_label: text('source_label').notNull(),
  target_status_id: uuid('target_status_id').$type<string | null>(),
  target_service_id: uuid('target_service_id').$type<string | null>(),
  target_family_id: uuid('target_family_id').$type<string | null>(),
  target_interaction_type_id: uuid('target_interaction_type_id').$type<string | null>(),
  resolved_by: uuid('resolved_by').$type<string | null>(),
  resolved_at: timestamp('resolved_at', timestamptz).$type<string>().defaultNow().notNull(),
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
  cir_agencies,
  profiles,
  agency_members,
  audit_logs,
  directory_saved_views,
  reference_departments,
  pricing_reference_imports,
  pricing_reference_import_files,
  pricing_reference_snapshots,
  pricing_classification_cir,
  pricing_supplier_segments,
  pricing_segment_classification_links,
  pricing_segment_purchase_grids,
  pricing_reference_anomalies,
  pricing_reference_diffs,
  entities,
  entity_contacts,
  interactions,
  interaction_drafts,
  agency_statuses,
  agency_services,
  agency_families,
  agency_interaction_types,
  agency_reference_resolutions,
  agency_system_users
};
