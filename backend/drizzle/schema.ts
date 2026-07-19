import {
  bigint,
  boolean,
  date,
  integer,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { Database } from "../../shared/supabase.types.ts";
import type { DirectorySavedViewState } from "../../shared/schemas/system/directory.schema.ts";
import type {
  PricingReferenceAnomalySeverity,
  PricingReferenceAnomalyType,
  PricingReferenceColumnAliases,
  PricingReferenceColumnMapping,
  PricingReferenceDiffObjectType,
  PricingReferenceDiffsSummaryResponse,
  PricingReferenceDiffType,
  PricingReferenceFileKind,
  PricingReferenceHealthReport,
  PricingReferenceImportMappingStatus,
} from "../../shared/schemas/pricing/references.schema.ts";
import type {
  AiDiagnosisResult,
  AiFeature,
  AiPromptStatus,
  AiProvider,
  AiUsageStatus,
} from "../../shared/schemas/ai.schema.ts";
import type { AiAssistantAskResponse } from "../../shared/schemas/aiAssistant.schema.ts";

type AccountType = Database["public"]["Enums"]["account_type"];
type UserRole = Database["public"]["Enums"]["user_role"];
type PricingReferenceDiffRunSummary = Omit<
  PricingReferenceDiffsSummaryResponse,
  "ok" | "request_id"
>;

const timestamptz = { withTimezone: true, mode: "string" } as const;

export const agencies = pgTable("agencies", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  name: text("name").notNull(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const cir_agencies = pgTable("cir_agencies", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  name: text("name").notNull(),
  region: text("region").$type<string | null>(),
  city: text("city").$type<string | null>(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").$type<string>().primaryKey(),
  email: text("email").$type<string>().notNull(),
  role: text("role").$type<UserRole>().notNull(),
  first_name: text("first_name").$type<string | null>(),
  last_name: text("last_name").$type<string>().notNull(),
  display_name: text("display_name").$type<string | null>(),
  phone: text("phone").$type<string | null>(),
  active_agency_id: uuid("active_agency_id").$type<string | null>(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  must_change_password: boolean("must_change_password").$type<boolean>()
    .notNull(),
  password_changed_at: timestamp("password_changed_at", timestamptz).$type<
    string | null
  >(),
  is_system: boolean("is_system").$type<boolean>().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const agency_members = pgTable("agency_members", {
  id: uuid("id").$type<string>().defaultRandom().notNull(),
  agency_id: uuid("agency_id").$type<string>().notNull(),
  user_id: uuid("user_id").$type<string>().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const audit_logs = pgTable("audit_logs", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  action: text("action").notNull(),
  actor_id: uuid("actor_id").$type<string | null>(),
  actor_is_super_admin: boolean("actor_is_super_admin").$type<boolean>()
    .default(false).notNull(),
  agency_id: uuid("agency_id").$type<string | null>(),
  entity_table: text("entity_table").notNull(),
  entity_id: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<
    Database["public"]["Tables"]["audit_logs"]["Row"]["metadata"]
  >().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const directory_saved_views = pgTable("directory_saved_views", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  user_id: uuid("user_id").$type<string>().notNull(),
  name: text("name").notNull(),
  state: jsonb("state").$type<DirectorySavedViewState>().notNull(),
  is_default: boolean("is_default").$type<boolean>().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const reference_departments = pgTable("reference_departments", {
  code: text("code").$type<string>().primaryKey(),
  label: text("label").$type<string>().notNull(),
  sort_order: integer("sort_order").$type<number>().notNull(),
  is_active: boolean("is_active").$type<boolean>().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const entities = pgTable("entities", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  entity_type: text("entity_type").$type<string>().notNull(),
  client_kind: text("client_kind").$type<"company" | "individual" | null>(),
  first_name: text("first_name").$type<string | null>(),
  last_name: text("last_name").$type<string | null>(),
  name: text("name").notNull(),
  agency_id: uuid("agency_id").$type<string | null>(),
  address: text("address").$type<string | null>(),
  postal_code: text("postal_code").$type<string | null>(),
  department: text("department").$type<string | null>(),
  city: text("city").$type<string | null>(),
  country: text("country").$type<string>().default("France").notNull(),
  siret: text("siret").$type<string | null>(),
  siren: text("siren").$type<string | null>(),
  naf_code: text("naf_code").$type<string | null>(),
  official_name: text("official_name").$type<string | null>(),
  official_data_source: text("official_data_source").$type<string | null>(),
  official_data_synced_at: timestamp("official_data_synced_at", timestamptz)
    .$type<string | null>(),
  notes: text("notes").$type<string | null>(),
  primary_phone: text("primary_phone").$type<string | null>(),
  primary_email: text("primary_email").$type<string | null>(),
  supplier_code: text("supplier_code").$type<string | null>(),
  supplier_number: text("supplier_number").$type<string | null>(),
  client_number: text("client_number").$type<string | null>(),
  account_type: text("account_type").$type<AccountType | null>(),
  cir_commercial_id: uuid("cir_commercial_id").$type<string | null>(),
  cir_agency_id: uuid("cir_agency_id").$type<string | null>(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  created_by: uuid("created_by").$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const entity_contacts = pgTable("entity_contacts", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  entity_id: uuid("entity_id").$type<string>().notNull(),
  first_name: text("first_name").$type<string | null>(),
  last_name: text("last_name").notNull(),
  email: text("email").$type<string | null>(),
  phone: text("phone").$type<string | null>(),
  position: text("position").$type<string | null>(),
  service_label: text("service_label").$type<string | null>(),
  is_primary: boolean("is_primary").$type<boolean>().default(false).notNull(),
  notes: text("notes").$type<string | null>(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const pricing_reference_imports = pgTable("pricing_reference_imports", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  status: text("status").$type<
    | "brouillon"
    | "analyse_en_cours"
    | "analyse_ok"
    | "analyse_erreur"
    | "pret_activation"
    | "rejete"
    | "archive"
  >().default("brouillon").notNull(),
  created_by: uuid("created_by").$type<string | null>(),
  analyzed_by: uuid("analyzed_by").$type<string | null>(),
  analysis_started_at: timestamp("analysis_started_at", timestamptz).$type<
    string | null
  >(),
  analysis_completed_at: timestamp("analysis_completed_at", timestamptz).$type<
    string | null
  >(),
  health_report: jsonb("health_report").$type<
    PricingReferenceHealthReport | null
  >(),
  counters: jsonb("counters").$type<Record<string, unknown>>().default({})
    .notNull(),
  error_code: text("error_code").$type<string | null>(),
  error_message: text("error_message").$type<string | null>(),
  error_details: text("error_details").$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const pricing_reference_import_files = pgTable(
  "pricing_reference_import_files",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    import_id: uuid("import_id").$type<string>().notNull(),
    file_kind: text("file_kind").$type<PricingReferenceFileKind>().notNull(),
    original_filename: text("original_filename").$type<string>().notNull(),
    storage_bucket: text("storage_bucket").$type<"pricing-reference-sources">()
      .default("pricing-reference-sources").notNull(),
    storage_path: text("storage_path").$type<string>().notNull(),
    size_bytes: integer("size_bytes").$type<number>().notNull(),
    sha256: text("sha256").$type<string>().notNull(),
    content_type: text("content_type").$type<string | null>(),
    sheet_name: text("sheet_name").$type<string | null>(),
    detected_columns: text("detected_columns").array().$type<string[]>()
      .default([]).notNull(),
    row_count: integer("row_count").$type<number | null>(),
    mapping_profile_id: uuid("mapping_profile_id").$type<string | null>(),
    column_mapping: jsonb("column_mapping").$type<
      PricingReferenceColumnMapping
    >().default({}).notNull(),
    mapping_status: text("mapping_status").$type<
      PricingReferenceImportMappingStatus
    >().default("non_configure").notNull(),
    mapping_confirmed_by: uuid("mapping_confirmed_by").$type<string | null>(),
    mapping_confirmed_at: timestamp("mapping_confirmed_at", timestamptz).$type<
      string | null
    >(),
    uploaded_by: uuid("uploaded_by").$type<string | null>(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
    updated_at: timestamp("updated_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const pricing_reference_column_mapping_profiles = pgTable(
  "pricing_reference_column_mapping_profiles",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    file_kind: text("file_kind").$type<PricingReferenceFileKind>().notNull(),
    name: text("name").$type<string>().default("Mapping referentiel CIR")
      .notNull(),
    column_mapping: jsonb("column_mapping").$type<
      PricingReferenceColumnMapping
    >().default({}).notNull(),
    aliases: jsonb("aliases").$type<PricingReferenceColumnAliases>().default({})
      .notNull(),
    is_default: boolean("is_default").$type<boolean>().default(false).notNull(),
    created_by: uuid("created_by").$type<string | null>(),
    updated_by: uuid("updated_by").$type<string | null>(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
    updated_at: timestamp("updated_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const pricing_reference_snapshots = pgTable(
  "pricing_reference_snapshots",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    import_id: uuid("import_id").$type<string>().notNull(),
    status: text("status").$type<
      "cree" | "pret_activation" | "actif" | "archive"
    >().default("cree").notNull(),
    is_active: boolean("is_active").$type<boolean>().default(false).notNull(),
    activated_at: timestamp("activated_at", timestamptz).$type<string | null>(),
    activated_by: uuid("activated_by").$type<string | null>(),
    deactivated_at: timestamp("deactivated_at", timestamptz).$type<
      string | null
    >(),
    created_by: uuid("created_by").$type<string | null>(),
    counters: jsonb("counters").$type<Record<string, unknown>>().default({})
      .notNull(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
    updated_at: timestamp("updated_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const pricing_classification_cir = pgTable(
  "pricing_classification_cir",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    snapshot_id: uuid("snapshot_id").$type<string>().notNull(),
    import_id: uuid("import_id").$type<string>().notNull(),
    source_file_id: uuid("source_file_id").$type<string>().notNull(),
    source_row_number: integer("source_row_number").$type<number>().notNull(),
    mega: text("mega").$type<string>().notNull(),
    fam: text("fam").$type<string>().notNull(),
    sfa: text("sfa").$type<string>().notNull(),
    mega_lib: text("mega_lib").$type<string>().notNull(),
    fam_lib: text("fam_lib").$type<string>().notNull(),
    sfa_lib: text("sfa_lib").$type<string>().notNull(),
    cir_key: text("cir_key").$type<string>().notNull(),
    raw_values: jsonb("raw_values").$type<Record<string, string>>().default({})
      .notNull(),
    normalized_values: jsonb("normalized_values").$type<
      Record<string, string>
    >().default({}).notNull(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const pricing_supplier_segments = pgTable("pricing_supplier_segments", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  snapshot_id: uuid("snapshot_id").$type<string>().notNull(),
  import_id: uuid("import_id").$type<string>().notNull(),
  source_file_id: uuid("source_file_id").$type<string>().notNull(),
  source_row_number: integer("source_row_number").$type<number>().notNull(),
  segment: text("segment").$type<string>().notNull(),
  idnumerique: text("idnumerique").$type<string>().notNull(),
  marque: text("marque").$type<string>().notNull(),
  cat_fab: text("cat_fab").$type<string>().notNull(),
  cat_fab_l: text("cat_fab_l").$type<string | null>(),
  strategiq: text("strategiq").$type<string | null>(),
  codif_fair: text("codif_fair").$type<string | null>(),
  tarif_fab: text("tarif_fab").$type<string | null>(),
  segment_key: text("segment_key").$type<string>().notNull(),
  raw_values: jsonb("raw_values").$type<Record<string, string>>().default({})
    .notNull(),
  normalized_values: jsonb("normalized_values").$type<Record<string, string>>()
    .default({}).notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const pricing_segment_classification_links = pgTable(
  "pricing_segment_classification_links",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    snapshot_id: uuid("snapshot_id").$type<string>().notNull(),
    import_id: uuid("import_id").$type<string>().notNull(),
    segment_id: uuid("segment_id").$type<string>().notNull(),
    classification_id: uuid("classification_id").$type<string | null>(),
    source_file_id: uuid("source_file_id").$type<string>().notNull(),
    source_row_number: integer("source_row_number").$type<number>().notNull(),
    mega_famille: text("mega_famille").$type<string | null>(),
    famille: text("famille").$type<string | null>(),
    sous_famille: text("sous_famille").$type<string | null>(),
    cir_key: text("cir_key").$type<string>().notNull(),
    link_status: text("link_status").$type<
      "complete_valid" | "missing" | "partial" | "unknown_key" | "ambiguous"
    >().notNull(),
    raw_values: jsonb("raw_values").$type<Record<string, string>>().default({})
      .notNull(),
    normalized_values: jsonb("normalized_values").$type<
      Record<string, string>
    >().default({}).notNull(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const pricing_segment_purchase_grids = pgTable(
  "pricing_segment_purchase_grids",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    snapshot_id: uuid("snapshot_id").$type<string>().notNull(),
    import_id: uuid("import_id").$type<string>().notNull(),
    segment_id: uuid("segment_id").$type<string>().notNull(),
    source_file_id: uuid("source_file_id").$type<string>().notNull(),
    source_row_number: integer("source_row_number").$type<number>().notNull(),
    num_four: text("num_four").$type<string | null>(),
    remise_ha: text("remise_ha").$type<string | null>(),
    col_ha: text("col_ha").$type<string | null>(),
    priorite: text("priorite").$type<string | null>(),
    type_grill: text("type_grill").$type<string | null>(),
    date_debut_raw: text("date_debut_raw").$type<string | null>(),
    date_fin_raw: text("date_fin_raw").$type<string | null>(),
    date_debut_normalized: text("date_debut_normalized").$type<string | null>(),
    date_fin_normalized: text("date_fin_normalized").$type<string | null>(),
    borne_acha: text("borne_acha").$type<string | null>(),
    coef_retro: text("coef_retro").$type<string | null>(),
    coef_ha: text("coef_ha").$type<string | null>(),
    coef_majvte: text("coef_majvte").$type<string | null>(),
    raw_values: jsonb("raw_values").$type<Record<string, string>>().default({})
      .notNull(),
    normalized_values: jsonb("normalized_values").$type<
      Record<string, string>
    >().default({}).notNull(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const pricing_reference_anomalies = pgTable(
  "pricing_reference_anomalies",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    import_id: uuid("import_id").$type<string>().notNull(),
    snapshot_id: uuid("snapshot_id").$type<string | null>(),
    source_file_id: uuid("source_file_id").$type<string | null>(),
    source_row_number: integer("source_row_number").$type<number | null>(),
    type: text("type").$type<PricingReferenceAnomalyType>().notNull(),
    severity: text("severity").$type<PricingReferenceAnomalySeverity>()
      .notNull(),
    object_type: text("object_type").$type<string | null>(),
    object_id: text("object_id").$type<string | null>(),
    columns: text("columns").array().$type<string[]>().default([]).notNull(),
    message: text("message").$type<string>().notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({})
      .notNull(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
    updated_at: timestamp("updated_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const pricing_reference_diffs = pgTable("pricing_reference_diffs", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  base_snapshot_id: uuid("base_snapshot_id").$type<string | null>(),
  target_snapshot_id: uuid("target_snapshot_id").$type<string>().notNull(),
  diff_type: text("diff_type").$type<PricingReferenceDiffType>().notNull(),
  object_type: text("object_type").$type<PricingReferenceDiffObjectType>()
    .notNull(),
  object_key: text("object_key").$type<string>().notNull(),
  severity: text("severity").$type<PricingReferenceAnomalySeverity>().notNull(),
  changed_columns: text("changed_columns").array().$type<string[]>().default([])
    .notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({})
    .notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const pricing_reference_diff_runs = pgTable(
  "pricing_reference_diff_runs",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    base_snapshot_id: uuid("base_snapshot_id").$type<string | null>(),
    target_snapshot_id: uuid("target_snapshot_id").$type<string>().notNull(),
    status: text("status").$type<"computed" | "failed">().default("computed")
      .notNull(),
    initial_import: boolean("initial_import").$type<boolean>().default(false)
      .notNull(),
    skipped_file_kinds: text("skipped_file_kinds").array().$type<
      PricingReferenceFileKind[]
    >().default([]).notNull(),
    summary: jsonb("summary").$type<PricingReferenceDiffRunSummary>().default(
      {} as PricingReferenceDiffRunSummary,
    ).notNull(),
    computed_at: timestamp("computed_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const ai_provider_configs = pgTable("ai_provider_configs", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  provider: text("provider").$type<AiProvider>().notNull(),
  label: text("label").$type<string>().notNull(),
  enabled: boolean("enabled").$type<boolean>().default(false).notNull(),
  encrypted_api_key: text("encrypted_api_key").$type<string | null>(),
  api_key_last4: text("api_key_last4").$type<string | null>(),
  api_key_hash: text("api_key_hash").$type<string | null>(),
  base_url: text("base_url").$type<string | null>(),
  organization_id: text("organization_id").$type<string | null>(),
  last_test_status: text("last_test_status").$type<
    "success" | "failed" | null
  >(),
  last_test_at: timestamp("last_test_at", timestamptz).$type<string | null>(),
  last_error_code: text("last_error_code").$type<string | null>(),
  last_error_message: text("last_error_message").$type<string | null>(),
  created_by: uuid("created_by").$type<string | null>(),
  updated_by: uuid("updated_by").$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_model_configs = pgTable("ai_model_configs", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  provider_config_id: uuid("provider_config_id").$type<string>().notNull(),
  provider: text("provider").$type<AiProvider>().notNull(),
  model_id: text("model_id").$type<string>().notNull(),
  label: text("label").$type<string>().notNull(),
  enabled: boolean("enabled").$type<boolean>().default(true).notNull(),
  is_default: boolean("is_default").$type<boolean>().default(false).notNull(),
  currency: text("currency").$type<string>().default("USD").notNull(),
  input_price_per_million: numeric("input_price_per_million").$type<
    string | null
  >(),
  output_price_per_million: numeric("output_price_per_million").$type<
    string | null
  >(),
  cached_input_price_per_million: numeric("cached_input_price_per_million")
    .$type<string | null>(),
  reasoning_price_per_million: numeric("reasoning_price_per_million").$type<
    string | null
  >(),
  price_effective_at: timestamp("price_effective_at", timestamptz).$type<
    string | null
  >(),
  max_output_tokens: integer("max_output_tokens").$type<number>().default(2000)
    .notNull(),
  temperature: numeric("temperature").$type<string>().default("0.2").notNull(),
  created_by: uuid("created_by").$type<string | null>(),
  updated_by: uuid("updated_by").$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_feature_model_assignments = pgTable(
  "ai_feature_model_assignments",
  {
    feature: text("feature").$type<AiFeature>().primaryKey(),
    model_config_id: uuid("model_config_id").$type<string>().notNull()
      .references(() => ai_model_configs.id, { onDelete: "restrict" }),
    created_by: uuid("created_by").$type<string | null>(),
    updated_by: uuid("updated_by").$type<string | null>(),
    created_at: timestamp("created_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
    updated_at: timestamp("updated_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
  (table) => [
    index("ai_feature_model_assignments_model_config_id_idx").on(
      table.model_config_id,
    ),
  ],
);

export const ai_prompt_templates = pgTable("ai_prompt_templates", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  feature: text("feature").$type<
    | "pricing.references.diagnose"
    | "pricing.references.diagnose.classification"
    | "pricing.references.diagnose.segments"
    | "assistant.referentiels"
  >().notNull(),
  label: text("label").$type<string>().notNull(),
  description: text("description").$type<string | null>(),
  allowed_variables: text("allowed_variables").array().$type<string[]>()
    .default([]).notNull(),
  created_by: uuid("created_by").$type<string | null>(),
  updated_by: uuid("updated_by").$type<string | null>(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  archived_by: uuid("archived_by").$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_prompt_versions = pgTable("ai_prompt_versions", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  template_id: uuid("template_id").$type<string>().notNull(),
  version: integer("version").$type<number>().notNull(),
  status: text("status").$type<AiPromptStatus>().default("draft").notNull(),
  body: text("body").$type<string>().notNull(),
  change_note: text("change_note").$type<string | null>(),
  created_by: uuid("created_by").$type<string | null>(),
  published_by: uuid("published_by").$type<string | null>(),
  published_at: timestamp("published_at", timestamptz).$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_quota_policies = pgTable("ai_quota_policies", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  scope: text("scope").$type<"global" | "agency" | "user">().notNull(),
  agency_id: uuid("agency_id").$type<string | null>(),
  user_id: uuid("user_id").$type<string | null>(),
  feature: text("feature").$type<
    | "pricing.references.diagnose"
    | "pricing.references.diagnose.classification"
    | "pricing.references.diagnose.segments"
    | "assistant.referentiels"
    | null
  >(),
  enabled: boolean("enabled").$type<boolean>().default(true).notNull(),
  daily_call_limit: integer("daily_call_limit").$type<number | null>(),
  monthly_call_limit: integer("monthly_call_limit").$type<number | null>(),
  daily_token_limit: integer("daily_token_limit").$type<number | null>(),
  monthly_token_limit: integer("monthly_token_limit").$type<number | null>(),
  daily_cost_limit: numeric("daily_cost_limit").$type<string | null>(),
  monthly_cost_limit: numeric("monthly_cost_limit").$type<string | null>(),
  currency: text("currency").$type<string>().default("USD").notNull(),
  created_by: uuid("created_by").$type<string | null>(),
  updated_by: uuid("updated_by").$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_usage_events = pgTable("ai_usage_events", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  request_id: text("request_id").$type<string>().notNull(),
  feature: text("feature").$type<
    | "pricing.references.diagnose"
    | "pricing.references.diagnose.classification"
    | "pricing.references.diagnose.segments"
    | "assistant.referentiels"
  >().notNull(),
  provider: text("provider").$type<AiProvider>().notNull(),
  model_id: text("model_id").$type<string>().notNull(),
  model_config_id: uuid("model_config_id").$type<string | null>(),
  prompt_version_id: uuid("prompt_version_id").$type<string | null>(),
  user_id: uuid("user_id").$type<string | null>(),
  agency_id: uuid("agency_id").$type<string | null>(),
  input_tokens: integer("input_tokens").$type<number>().default(0).notNull(),
  output_tokens: integer("output_tokens").$type<number>().default(0).notNull(),
  cached_input_tokens: integer("cached_input_tokens").$type<number>().default(0)
    .notNull(),
  reasoning_tokens: integer("reasoning_tokens").$type<number>().default(0)
    .notNull(),
  cost_amount: numeric("cost_amount").$type<string | null>(),
  currency: text("currency").$type<string>().default("USD").notNull(),
  cache_hit: boolean("cache_hit").$type<boolean>().default(false).notNull(),
  status: text("status").$type<AiUsageStatus>().notNull(),
  error_code: text("error_code").$type<string | null>(),
  error_message: text("error_message").$type<string | null>(),
  latency_ms: integer("latency_ms").$type<number | null>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({})
    .notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_usage_daily_aggregates = pgTable("ai_usage_daily_aggregates", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  usage_date: date("usage_date").$type<string>().notNull(),
  feature: text("feature").$type<AiFeature>().notNull(),
  provider: text("provider").$type<AiProvider>().notNull(),
  model_id: text("model_id").$type<string>().notNull(),
  agency_id: uuid("agency_id").$type<string | null>(),
  user_id: uuid("user_id").$type<string | null>(),
  status: text("status").$type<AiUsageStatus>().notNull(),
  calls: bigint("calls", { mode: "number" }).$type<number>().default(0)
    .notNull(),
  input_tokens: bigint("input_tokens", { mode: "number" }).$type<number>()
    .default(0).notNull(),
  output_tokens: bigint("output_tokens", { mode: "number" }).$type<number>()
    .default(0).notNull(),
  cached_input_tokens: bigint("cached_input_tokens", { mode: "number" }).$type<
    number
  >().default(0).notNull(),
  reasoning_tokens: bigint("reasoning_tokens", { mode: "number" }).$type<
    number
  >().default(0).notNull(),
  cost_amount: numeric("cost_amount").$type<string>().default("0").notNull(),
  currency: text("currency").$type<string>().default("USD").notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_feature_grants = pgTable("ai_feature_grants", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  feature: text("feature").$type<AiFeature>().notNull(),
  scope: text("scope").$type<"global" | "agency" | "user">().notNull(),
  agency_id: uuid("agency_id").$type<string | null>(),
  user_id: uuid("user_id").$type<string | null>(),
  allowed: boolean("allowed").$type<boolean>().default(true).notNull(),
  created_by: uuid("created_by").$type<string | null>(),
  updated_by: uuid("updated_by").$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_response_cache = pgTable("ai_response_cache", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  feature: text("feature").$type<
    | "pricing.references.diagnose"
    | "pricing.references.diagnose.classification"
    | "pricing.references.diagnose.segments"
    | "assistant.referentiels"
  >().notNull(),
  cache_key: text("cache_key").$type<string>().notNull(),
  provider: text("provider").$type<AiProvider>().notNull(),
  model_id: text("model_id").$type<string>().notNull(),
  prompt_version_id: uuid("prompt_version_id").$type<string | null>(),
  input_hash: text("input_hash").$type<string>().notNull(),
  response: jsonb("response").$type<AiDiagnosisResult>().notNull(),
  usage: jsonb("usage").$type<Record<string, unknown>>().default({}).notNull(),
  expires_at: timestamp("expires_at", timestamptz).$type<string>().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const ai_request_reservations = pgTable("ai_request_reservations", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  feature: text("feature").$type<"assistant.referentiels">().notNull(),
  user_id: uuid("user_id").$type<string>().notNull(),
  agency_id: uuid("agency_id").$type<string | null>(),
  client_request_id: uuid("client_request_id").$type<string>().notNull(),
  status: text("status").$type<"reserved" | "success" | "error" | "blocked">()
    .notNull(),
  estimated_tokens: integer("estimated_tokens").$type<number>().notNull(),
  estimated_cost_amount: numeric("estimated_cost_amount").$type<string>()
    .notNull(),
  actual_tokens: integer("actual_tokens").$type<number | null>(),
  actual_cost_amount: numeric("actual_cost_amount").$type<string | null>(),
  response: jsonb("response").$type<AiAssistantAskResponse | null>(),
  error_code: text("error_code").$type<string | null>(),
  error_message: text("error_message").$type<string | null>(),
  expires_at: timestamp("expires_at", timestamptz).$type<string>().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const interactions = pgTable("interactions", {
  id: text("id").$type<string>().primaryKey(),
  agency_id: uuid("agency_id").$type<string | null>(),
  channel: text("channel").notNull(),
  entity_type: text("entity_type").notNull(),
  contact_service: text("contact_service").notNull(),
  company_name: text("company_name").notNull(),
  contact_name: text("contact_name").notNull(),
  contact_phone: text("contact_phone").$type<string | null>(),
  contact_email: text("contact_email").$type<string | null>(),
  subject: text("subject").notNull(),
  mega_families: text("mega_families").array().$type<string[]>().notNull(),
  status: text("status").$type<string>().notNull(),
  status_id: uuid("status_id").$type<string | null>(),
  status_is_terminal: boolean("status_is_terminal").$type<boolean>().default(
    false,
  ).notNull(),
  interaction_type: text("interaction_type").$type<string>().notNull(),
  order_ref: text("order_ref").$type<string | null>(),
  // Le driver renvoie les numeric en string ; la coercition vers number se fait
  // dans interactionRowSchema (api-responses.ts) cote consommateur.
  amount: numeric("amount", { precision: 12, scale: 2 }).$type<number | null>(),
  stage: text("stage").$type<string | null>(),
  stage_changed_at: timestamp("stage_changed_at", timestamptz).$type<
    string | null
  >(),
  quote_sent_at: timestamp("quote_sent_at", timestamptz).$type<string | null>(),
  lost_reason: text("lost_reason").$type<string | null>(),
  reminder_at: timestamp("reminder_at", timestamptz).$type<string | null>(),
  last_action_at: timestamp("last_action_at", timestamptz).$type<string>()
    .defaultNow().notNull(),
  notes: text("notes").$type<string | null>(),
  entity_id: uuid("entity_id").$type<string | null>(),
  contact_id: uuid("contact_id").$type<string | null>(),
  created_by: uuid("created_by").$type<string>().notNull(),
  updated_by: uuid("updated_by").$type<string | null>(),
  timeline: jsonb("timeline").$type<
    Database["public"]["Tables"]["interactions"]["Row"]["timeline"]
  >().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const interaction_drafts = pgTable("interaction_drafts", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  user_id: uuid("user_id").$type<string>().notNull(),
  agency_id: uuid("agency_id").$type<string>().notNull(),
  form_type: text("form_type").$type<string>().default("interaction").notNull(),
  payload: jsonb("payload").$type<
    Database["public"]["Tables"]["interaction_drafts"]["Row"]["payload"]
  >().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const agency_statuses = pgTable("agency_statuses", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid("agency_id").$type<string>().notNull(),
  label: text("label").notNull(),
  sort_order: integer("sort_order").notNull(),
  is_default: boolean("is_default").notNull(),
  category: text("category").notNull(),
  is_terminal: boolean("is_terminal").notNull(),
  is_active: boolean("is_active").$type<boolean>().default(true).notNull(),
  deactivated_at: timestamp("deactivated_at", timestamptz).$type<
    string | null
  >(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const agency_services = pgTable("agency_services", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid("agency_id").$type<string>().notNull(),
  label: text("label").notNull(),
  sort_order: integer("sort_order").notNull(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const agency_families = pgTable("agency_families", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid("agency_id").$type<string>().notNull(),
  label: text("label").notNull(),
  sort_order: integer("sort_order").notNull(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const agency_interaction_types = pgTable("agency_interaction_types", {
  id: uuid("id").$type<string>().defaultRandom().primaryKey(),
  agency_id: uuid("agency_id").$type<string>().notNull(),
  archived_at: timestamp("archived_at", timestamptz).$type<string | null>(),
  label: text("label").notNull(),
  sort_order: integer("sort_order").notNull(),
  requires_product_families: boolean("requires_product_families").$type<
    boolean
  >().default(false).notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
});

export const agency_reference_resolutions = pgTable(
  "agency_reference_resolutions",
  {
    id: uuid("id").$type<string>().defaultRandom().primaryKey(),
    agency_id: uuid("agency_id").$type<string>().notNull(),
    dimension: text("dimension").$type<
      "statuses" | "services" | "families" | "interaction_types"
    >().notNull(),
    source_label: text("source_label").notNull(),
    target_status_id: uuid("target_status_id").$type<string | null>(),
    target_service_id: uuid("target_service_id").$type<string | null>(),
    target_family_id: uuid("target_family_id").$type<string | null>(),
    target_interaction_type_id: uuid("target_interaction_type_id").$type<
      string | null
    >(),
    resolved_by: uuid("resolved_by").$type<string | null>(),
    resolved_at: timestamp("resolved_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
    updated_at: timestamp("updated_at", timestamptz).$type<string>()
      .defaultNow().notNull(),
  },
);

export const agency_system_users = pgTable("agency_system_users", {
  agency_id: uuid("agency_id").$type<string>().primaryKey(),
  user_id: uuid("user_id").$type<string>().notNull(),
  created_at: timestamp("created_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", timestamptz).$type<string>().defaultNow()
    .notNull(),
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
  pricing_reference_column_mapping_profiles,
  pricing_reference_snapshots,
  pricing_classification_cir,
  pricing_supplier_segments,
  pricing_segment_classification_links,
  pricing_segment_purchase_grids,
  pricing_reference_anomalies,
  pricing_reference_diffs,
  pricing_reference_diff_runs,
  ai_provider_configs,
  ai_model_configs,
  ai_feature_model_assignments,
  ai_prompt_templates,
  ai_prompt_versions,
  ai_quota_policies,
  ai_usage_events,
  ai_usage_daily_aggregates,
  ai_feature_grants,
  ai_response_cache,
  ai_request_reservations,
  entities,
  entity_contacts,
  interactions,
  interaction_drafts,
  agency_statuses,
  agency_services,
  agency_families,
  agency_interaction_types,
  agency_reference_resolutions,
  agency_system_users,
};
