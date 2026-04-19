import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const failures = [];
const PHASE3_GUARD_START_VERSION = 20260418153000n;
const MODERN_MIGRATION_START_VERSION = 20260126120000n;
const REQUIRED_LEGACY_MIGRATIONS = [
  "202601151500_init_schema.sql",
  "202601151900_security_hardening.sql",
  "202601152000_audit_logs.sql",
  "202601152030_interactions_audit_fields.sql",
  "202601152100_rate_limits.sql",
  "202601152200_remove_seed_defaults.sql",
  "202601161330_profiles_active_agency.sql",
  "202601161800_interaction_label_constraints.sql",
  "202601161900_reference_label_constraints.sql",
  "202601171000_auth_audit_improvements.sql",
  "202601181100_profiles_update_policy.sql",
  "202601181200_config_readonly.sql",
  "202601181230_audit_log_metadata.sql",
  "202601181240_rate_limits_rls.sql",
  "202601181250_rate_limits_fail_closed.sql",
  "202601181300_status_semantics.sql",
  "202601181320_interactions_cleanup.sql",
  "202601221300_audit_actor_fix.sql",
  "202601231200_rate_limits_privileges_fix.sql",
  "202601231210_updated_at_clock_timestamp.sql",
  "202601231400_fix_search_path.sql",
  "202601231410_optimize_rls_helpers.sql",
  "202601231420_optimize_rls_policies.sql",
  "202601231430_add_fk_indexes.sql",
  "202601231520_harden_definer_search_path.sql",
  "202601231530_interactions_status_id.sql",
  "202601231540_fix_sync_interaction_status_logic.sql",
  "202601231550_sync_status_label_on_update.sql",
  "202601231560_interactions_status_terminal_flag.sql",
];
const REMOTE_TO_LOCAL_MODERN_MIGRATION_COMPATIBILITY = {
  20260126164618n: "20260126120000_create_clients.sql",
  20260126164635n: "20260126120500_create_client_contacts.sql",
  20260126164651n: "20260126121000_add_profiles_role_archived.sql",
  20260126164703n: "20260126121500_backfill_profiles_role.sql",
  20260126164734n: "20260126122000_update_helpers_triggers.sql",
  20260126164821n: "20260126122500_drop_legacy_role_columns.sql",
  20260126164843n: "20260126123000_update_agencies_archived.sql",
  20260126164913n: "20260126123500_update_interactions_clients.sql",
  20260126165010n: "20260126124000_audit_logs_nullable_agency.sql",
  20260126165017n: "20260126124500_update_rls_policies.sql",
  20260126175309n: "20260126131000_fix_audit_log_agency_delete.sql",
  20260126183337n: "20260126132000_add_interactions_contact_index_client_created_by.sql",
  20260127041546n: "20260126203000_make_client_number_nullable.sql",
  20260129182725n: "20260129130000_fix_profiles_update_policy.sql",
  20260201071938n: "20260201120000_create_interaction_drafts.sql",
  20260201125608n: "20260201133000_add_account_type_and_require_client_number.sql",
  20260201125634n: "20260201133500_add_interaction_types_and_relations.sql",
  20260201125655n: "20260201134000_add_contact_email_and_checks.sql",
  20260201125708n: "20260201134500_fix_interaction_drafts_policies_and_indexes.sql",
  20260201125841n: "20260201135000_add_interactions_status_id_index.sql",
  20260201134902n: "20260201141000_add_agency_interaction_types_unique.sql",
  20260203084441n: "20260203120000_entities_refactor.sql",
  20260210190712n: "20260210183000_profiles_first_last_name.sql",
  20260211150816n: "20260211120000_hard_delete_agency_rpc.sql",
  20260215124115n: "20260215123000_user_delete_anonymization_system_users.sql",
  20260215190146n: "20260215150000_agency_system_users_rls_policies.sql",
  20260215190920n: "20260215153000_audit_logs_retention_policy.sql",
  20260216135200n: "20260216101000_harden_hard_delete_agency_rpc_privileges.sql",
  20260216135225n: "20260216102000_strict_multi_tenant_rls.sql",
  20260216135230n: "20260216103000_backfill_interaction_agency_id.sql",
  20260222175617n: "20260222110000_layer13_drop_unused_indexes_lot1.sql",
  20260222175755n: "20260222113000_layer13_drop_unused_indexes_lot2.sql",
  20260222175830n: "20260222120000_layer13_rls_policy_and_grants_hardening.sql",
  20260222180406n: "20260222121000_layer13_recreate_fk_safety_indexes.sql",
  20260227191237n: "20260227100000_revoke_excessive_grants.sql",
  20260227191244n: "20260227101000_force_rls_all_tables.sql",
  20260227191300n: "20260227102000_minimal_grants.sql",
  20260227191306n: "20260227103000_cleanup_unused_indexes.sql",
  20260306155458n: "20260301120000_add_interactions_entity_last_action_index.sql",
  20260306184329n: "20260306113000_add_entities_cir_commercial_directory_indexes.sql",
  20260417142106n: "20260306184500_directory_saved_views_and_city_suggestions.sql",
  20260417142109n: "20260309110000_add_entities_official_company_fields.sql",
  20260417142119n: "20260310120000_add_entities_client_kind.sql",
  20260418091644n: "20260418120000_unified_config_snapshot.sql",
  20260418153000n: "20260418153000_phase3_private_schema_hardening.sql",
  20260418154000n: "20260418154000_phase3_pg_trgm_and_fk_indexes.sql",
};

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return readFileSync(absolutePath, "utf8");
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fail(message) {
  failures.push(message);
}

function command(commandName, args) {
  return execFileSync(commandName, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getMigrationVersion(filename) {
  const match = filename.match(/^(\d+)_.*\.sql$/);
  return match ? BigInt(match[1]) : null;
}

function getMigrationVersionsFromSupabaseCli() {
  const output = command("supabase", ["migration", "list", "--linked"]);
  const versions = Array.from(output.matchAll(/\|\s*(\d{14})\s+\|/g), (match) => BigInt(match[1]));
  if (versions.length === 0) {
    fail("Unable to parse remote migration inventory from `supabase migration list --linked`.");
  }
  return versions;
}

function compareImportMaps(rootImports, backendImports, key) {
  if (rootImports[key] !== backendImports[key]) {
    fail(
      `Import map drift for "${key}": root=${JSON.stringify(rootImports[key])} backend=${JSON.stringify(backendImports[key])}.`,
    );
  }
}

if (existsSync(path.join(repoRoot, "migration"))) {
  fail("Shadow repository directory 'migration/' must not exist at the repository root.");
}

const trackedSupabaseTempFiles = git(["ls-files", "--", "supabase/.temp"])
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

if (trackedSupabaseTempFiles.length > 0) {
  fail(`Supabase temp files are tracked by git: ${trackedSupabaseTempFiles.join(", ")}.`);
}

const qaRunbook = readText("docs/qa-runbook.md");
if (qaRunbook.includes("docs/audit-complet.md")) {
  fail("docs/qa-runbook.md still references missing file docs/audit-complet.md.");
}

const configSchemaSource = readText("shared/schemas/config.schema.ts");
for (const requiredSymbol of [
  "configGetInputSchema",
  "configSaveAgencyInputSchema",
  "configSaveProductInputSchema",
  "resolvedConfigSnapshotSchema",
]) {
  if (!configSchemaSource.includes(requiredSymbol)) {
    fail(`shared/schemas/config.schema.ts is missing ${requiredSymbol}.`);
  }
}

const routerSource = readText("backend/functions/api/trpc/router.ts");
for (const requiredRouterFragment of [
  "config: router({",
  "get: authedProcedure",
  "'save-agency': authedProcedure",
  "'save-product': superAdminProcedure",
]) {
  if (!routerSource.includes(requiredRouterFragment)) {
    fail(`backend/functions/api/trpc/router.ts is missing router fragment ${JSON.stringify(requiredRouterFragment)}.`);
  }
}

const generatedRpcSource = readText("shared/api/generated/rpc-app.ts");
for (const requiredRpcPath of [
  "/trpc/config.save-agency",
  "/trpc/config.save-product",
]) {
  if (!generatedRpcSource.includes(requiredRpcPath)) {
    fail(`shared/api/generated/rpc-app.ts is missing ${requiredRpcPath}. Run frontend generate:rpc-types.`);
  }
}

const supabaseTypesSource = readText("shared/supabase.types.ts");
for (const requiredTable of [
  "agency_settings:",
  "app_settings:",
  "reference_departments:",
]) {
  if (!supabaseTypesSource.includes(requiredTable)) {
    fail(`shared/supabase.types.ts is missing ${requiredTable} Regenerate Supabase types from the linked project.`);
  }
}

const rootDeno = readJson("deno.json");
const backendDeno = readJson("backend/deno.json");
const rootImports = rootDeno.imports ?? {};
const backendImports = backendDeno.imports ?? {};
const migrationFilenames = listFiles("backend/migrations").filter((filename) => filename.endsWith(".sql"));

for (const legacyMigration of REQUIRED_LEGACY_MIGRATIONS) {
  if (!migrationFilenames.includes(legacyMigration)) {
    fail(`Historical migration ${legacyMigration} is missing from backend/migrations. Restore deleted legacy files instead of rewriting history.`);
  }
}

const remoteVersions = getMigrationVersionsFromSupabaseCli();
const missingModernRemoteMigrations = remoteVersions
  .filter((version) => version >= MODERN_MIGRATION_START_VERSION)
  .flatMap((version) => {
    const expectedFilename = REMOTE_TO_LOCAL_MODERN_MIGRATION_COMPATIBILITY[version];
    if (!expectedFilename) {
      return [`Missing compatibility mapping for remote migration ${version}.`];
    }
    return migrationFilenames.includes(expectedFilename)
      ? []
      : [`Remote migration ${version} expects local file ${expectedFilename}, but it is missing.`];
  });

for (const failure of missingModernRemoteMigrations) {
  fail(failure);
}

const localLegacyCount = migrationFilenames.filter((filename) => {
  const version = getMigrationVersion(filename);
  return version !== null && version < MODERN_MIGRATION_START_VERSION;
}).length;
const remoteLegacyCount = remoteVersions.filter((version) => version < MODERN_MIGRATION_START_VERSION).length;

if (localLegacyCount < remoteLegacyCount) {
  fail(
    `Local legacy migration inventory is shorter than remote history (${localLegacyCount} local < ${remoteLegacyCount} remote).`,
  );
}

for (const migrationFilename of migrationFilenames) {
  const version = getMigrationVersion(migrationFilename);
  if (version === null || version < PHASE3_GUARD_START_VERSION) {
    continue;
  }

  const source = readText(path.join("backend/migrations", migrationFilename));
  const sourceLower = source.toLowerCase();

  if (
    /create\s+(or\s+replace\s+)?function\s+public\./i.test(source)
    && /security\s+definer/i.test(source)
  ) {
    fail(
      `${migrationFilename} still defines a SECURITY DEFINER function in schema public. Move privileged functions to private.`,
    );
  }

  if (/grant\s+execute\s+on\s+function\s+public\.[^;]*\bto\s+public\b/i.test(source)) {
    fail(
      `${migrationFilename} grants EXECUTE on a public function to PUBLIC. Exposed public function grants are forbidden after Phase 3.`,
    );
  }

  if (
    /alter\s+extension\s+pg_trgm\s+set\s+schema\s+public/i.test(source)
    || (
      /create\s+extension(?:\s+if\s+not\s+exists)?\s+"?pg_trgm"?/i.test(source)
      && !/schema\s+extensions/i.test(sourceLower)
    )
  ) {
    fail(
      `${migrationFilename} places pg_trgm in schema public. Install or keep pg_trgm in schema extensions only.`,
    );
  }
}

for (const key of [
  "@hono/hono",
  "@hono/hono/validator",
  "@hono/trpc-server",
  "@trpc/server",
  "@supabase/functions-js/edge-runtime.d.ts",
  "@supabase/supabase-js",
  "drizzle-orm",
  "drizzle-orm/",
  "postgres",
  "std/assert",
  "jose",
  "zod",
  "zod/v4",
  "zod/",
]) {
  compareImportMaps(rootImports, backendImports, key);
}

if (failures.length > 0) {
  console.error("Repo state check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Repo state check passed.");
