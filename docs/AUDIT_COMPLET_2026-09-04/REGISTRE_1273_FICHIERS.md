# Registre des 1 273 fichiers suivis

Ce registre porte sur le snapshot Git `0ee15a69861f0817b459bee4d2b375e56584a590`, avant création du présent dossier d’audit. Chaque fichier suivi reçoit un verdict individuel. Les nouveaux fichiers de l’audit ne sont donc pas comptés dans les 1 273.

Un verdict « revu » signifie qu’aucune anomalie autonome n’a émergé des contrôles décrits dans [la méthodologie](./METHODOLOGIE_ET_PREUVES.md) ; il ne promet pas l’absence absolue de défaut. Les détails sont dans les README des [Étapes 1](./01-backend/README.md), [2](./02-ui-ux-design/README.md) et [3](./03-grand-menage/README.md).

| # | Fichier | Nature | Étape primaire | Verdict individuel |
| ---: | --- | --- | :---: | --- |
| 1 | `.github/workflows/qa.yml` | Configuration / asset texte | 3 | gates audit/intégration/unused à réaligner |
| 2 | `.gitignore` | Fichier suivi | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 3 | `.husky/pre-commit` | Fichier suivi | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 4 | `.husky/pre-push` | Fichier suivi | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 5 | `.impeccable/design.json` | Configuration / asset texte | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 6 | `AGENTS.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 7 | `CLAUDE.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 8 | `DESIGN.md` | Documentation | 2 | mettre à jour les fontes réellement chargées ; conserver la dette body |
| 9 | `PRODUCT.md` | Documentation | 2 | REVU — aucun lien ou conflit autonome isolé |
| 10 | `backend/.env.example` | Configuration / asset texte | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 11 | `backend/.env.test.example` | Configuration / asset texte | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 12 | `backend/README.md` | Documentation | 1 | REVU — aucun lien ou conflit autonome isolé |
| 13 | `backend/drizzle/config.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 14 | `backend/drizzle/index.ts` | Source / script | 1 | frontière `userDb` privilégiée / RLS non effective |
| 15 | `backend/drizzle/relations.ts` | Source / script | 1 | **À VALIDER** — aucun consommateur relationnel courant |
| 16 | `backend/drizzle/schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 17 | `backend/migrations/202601151500_init_schema.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 18 | `backend/migrations/202601151900_security_hardening.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 19 | `backend/migrations/202601152000_audit_logs.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 20 | `backend/migrations/202601152030_interactions_audit_fields.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 21 | `backend/migrations/202601152100_rate_limits.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 22 | `backend/migrations/202601152200_remove_seed_defaults.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 23 | `backend/migrations/202601161330_profiles_active_agency.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 24 | `backend/migrations/202601161800_interaction_label_constraints.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 25 | `backend/migrations/202601161900_reference_label_constraints.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 26 | `backend/migrations/202601171000_auth_audit_improvements.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 27 | `backend/migrations/202601181100_profiles_update_policy.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 28 | `backend/migrations/202601181200_config_readonly.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 29 | `backend/migrations/202601181230_audit_log_metadata.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 30 | `backend/migrations/202601181240_rate_limits_rls.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 31 | `backend/migrations/202601181250_rate_limits_fail_closed.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 32 | `backend/migrations/202601181300_status_semantics.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 33 | `backend/migrations/202601181320_interactions_cleanup.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 34 | `backend/migrations/202601221300_audit_actor_fix.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 35 | `backend/migrations/202601231200_rate_limits_privileges_fix.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 36 | `backend/migrations/202601231210_updated_at_clock_timestamp.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 37 | `backend/migrations/202601231400_fix_search_path.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 38 | `backend/migrations/202601231410_optimize_rls_helpers.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 39 | `backend/migrations/202601231420_optimize_rls_policies.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 40 | `backend/migrations/202601231430_add_fk_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 41 | `backend/migrations/202601231520_harden_definer_search_path.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 42 | `backend/migrations/202601231530_interactions_status_id.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 43 | `backend/migrations/202601231540_fix_sync_interaction_status_logic.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 44 | `backend/migrations/202601231550_sync_status_label_on_update.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 45 | `backend/migrations/202601231560_interactions_status_terminal_flag.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 46 | `backend/migrations/20260126120000_create_clients.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 47 | `backend/migrations/20260126120500_create_client_contacts.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 48 | `backend/migrations/20260126121000_add_profiles_role_archived.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 49 | `backend/migrations/20260126121500_backfill_profiles_role.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 50 | `backend/migrations/20260126122000_update_helpers_triggers.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 51 | `backend/migrations/20260126122500_drop_legacy_role_columns.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 52 | `backend/migrations/20260126123000_update_agencies_archived.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 53 | `backend/migrations/20260126123500_update_interactions_clients.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 54 | `backend/migrations/20260126124000_audit_logs_nullable_agency.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 55 | `backend/migrations/20260126124500_update_rls_policies.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 56 | `backend/migrations/20260126131000_fix_audit_log_agency_delete.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 57 | `backend/migrations/20260126132000_add_interactions_contact_index_client_created_by.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 58 | `backend/migrations/20260126203000_make_client_number_nullable.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 59 | `backend/migrations/20260129130000_fix_profiles_update_policy.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 60 | `backend/migrations/20260201120000_create_interaction_drafts.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 61 | `backend/migrations/20260201133000_add_account_type_and_require_client_number.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 62 | `backend/migrations/20260201133500_add_interaction_types_and_relations.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 63 | `backend/migrations/20260201134000_add_contact_email_and_checks.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 64 | `backend/migrations/20260201134500_fix_interaction_drafts_policies_and_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 65 | `backend/migrations/20260201135000_add_interactions_status_id_index.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 66 | `backend/migrations/20260201141000_add_agency_interaction_types_unique.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 67 | `backend/migrations/20260203120000_entities_refactor.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 68 | `backend/migrations/20260210183000_profiles_first_last_name.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 69 | `backend/migrations/20260211120000_hard_delete_agency_rpc.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 70 | `backend/migrations/20260215123000_user_delete_anonymization_system_users.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 71 | `backend/migrations/20260215150000_agency_system_users_rls_policies.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 72 | `backend/migrations/20260215153000_audit_logs_retention_policy.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 73 | `backend/migrations/20260216101000_harden_hard_delete_agency_rpc_privileges.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 74 | `backend/migrations/20260216102000_strict_multi_tenant_rls.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 75 | `backend/migrations/20260216103000_backfill_interaction_agency_id.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 76 | `backend/migrations/20260222110000_layer13_drop_unused_indexes_lot1.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 77 | `backend/migrations/20260222113000_layer13_drop_unused_indexes_lot2.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 78 | `backend/migrations/20260222120000_layer13_rls_policy_and_grants_hardening.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 79 | `backend/migrations/20260222121000_layer13_recreate_fk_safety_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 80 | `backend/migrations/20260227100000_revoke_excessive_grants.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 81 | `backend/migrations/20260227101000_force_rls_all_tables.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 82 | `backend/migrations/20260227102000_minimal_grants.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 83 | `backend/migrations/20260227103000_cleanup_unused_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 84 | `backend/migrations/20260301120000_add_interactions_entity_last_action_index.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 85 | `backend/migrations/20260306113000_add_entities_cir_commercial_directory_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 86 | `backend/migrations/20260306184500_directory_saved_views_and_city_suggestions.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 87 | `backend/migrations/20260309110000_add_entities_official_company_fields.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 88 | `backend/migrations/20260310120000_add_entities_client_kind.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 89 | `backend/migrations/20260418120000_unified_config_snapshot.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 90 | `backend/migrations/20260418153000_phase3_private_schema_hardening.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 91 | `backend/migrations/20260418154000_phase3_pg_trgm_and_fk_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 92 | `backend/migrations/20260421110000_cockpit_phone_lookup_index.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 93 | `backend/migrations/20260504092200_migrate_directory_saved_view_scopes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 94 | `backend/migrations/20260513144739_add_tier_v1_foundation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 95 | `backend/migrations/20260518103000_directory_saved_views_view_type.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 96 | `backend/migrations/20260518143000_global_suppliers_clear_agency.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 97 | `backend/migrations/20260526120000_purge_onboarding_product_settings.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 98 | `backend/migrations/20260526130000_retire_used_statuses.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 99 | `backend/migrations/20260601120000_reference_integrity_archive.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 100 | `backend/migrations/20260601170000_integrity_interaction_audit_metadata.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 101 | `backend/migrations/20260602100000_fix_private_sync_interaction_status.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 102 | `backend/migrations/20260607120000_contact_service_and_family_requirements.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 103 | `backend/migrations/20260616103000_entity_contacts_primary_contact.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 104 | `backend/migrations/20260617120000_enrich_entity_audit_changes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 105 | `backend/migrations/20260622041229_pricing_reference_foundation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 106 | `backend/migrations/20260622041709_pricing_reference_fk_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 107 | `backend/migrations/20260627090000_pricing_reference_column_mappings.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 108 | `backend/migrations/20260627162550_ai_governance.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 109 | `backend/migrations/20260627191500_pricing_reference_diagnose_split.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 110 | `backend/migrations/20260628093000_ai_openrouter_provider.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 111 | `backend/migrations/20260628102000_ai_openrouter_only.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 112 | `backend/migrations/20260628110000_ai_deepseek_v4_pro_model.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 113 | `backend/migrations/20260628133000_ai_deepseek_only_model.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 114 | `backend/migrations/20260706185712_20260706204554_pricing_reference_diffs_engine.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 115 | `backend/migrations/20260707044038_pricing_reference_snapshot_activation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 116 | `backend/migrations/20260707044142_pricing_reference_snapshot_activation_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 117 | `backend/migrations/20260710091605_ai_assistant_foundation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 118 | `backend/migrations/20260710143000_ai_assistant_references_prompt_v2.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 119 | `backend/migrations/20260710145910_interaction_opportunity_fields.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 120 | `backend/migrations/20260710150000_ai_assistant_references_prompt_v3.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 121 | `backend/migrations/20260710170000_ai_assistant_sql_prompt_v4.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 122 | `backend/migrations/20260710220413_ai_feature_grants.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 123 | `backend/migrations/20260710221105_fix_ai_feature_access_validation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 124 | `backend/migrations/20260712120000_ai_assistant_hardening.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 125 | `backend/migrations/20260712123000_ai_assistant_hot_path_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 126 | `backend/migrations/20260712130000_ai_usage_aggregates_primary_key.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 127 | `backend/migrations/20260712190000_fix_ai_access_backend_identity.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 128 | `backend/migrations/20260712201500_harden_ai_access_caller_identity.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 129 | `backend/migrations/20260712203000_fix_ai_access_caller_coalesce.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 130 | `backend/migrations/20260714094501_ai_prompt_template_lifecycle.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 131 | `backend/migrations/20260714102852_ai_context_universal_p5b.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 132 | `backend/migrations/20260719094530_ai_mistral_provider_contracts.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 133 | `backend/migrations/20260719094641_ai_feature_assignment_author_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 134 | `backend/migrations/20260719130936_ai_product_semantic_search.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 135 | `backend/migrations/20260719141705_ai_product_semantic_scope_expansion.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 136 | `backend/migrations/20260719142655_ai_product_semantic_exact_terms.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 137 | `backend/migrations/20260719165000_ai_product_semantic_complete_coverage.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 138 | `backend/migrations/20260720115957_ai_product_semantic_taxonomy_pass.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 139 | `backend/migrations/20260720153737_ai_product_semantic_terminal_scope_guard.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 140 | `backend/migrations/20260726153751_configurator_foundation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 141 | `backend/migrations/20260726153801_configurator_motor_catalog.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 142 | `backend/migrations/20260726153809_configurator_rls_and_grants.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 143 | `backend/migrations/20260726154032_configurator_rls_actor_helper.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 144 | `backend/migrations/20260726173238_configurator_activate_snapshot_actor_fix.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 145 | `backend/migrations/20260727053156_configurator_c2_operating_point_identity_and_provenance.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 146 | `backend/migrations/20260727063829_configurator_c2_import_file_multiple_per_role.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 147 | `backend/migrations/20260727145013_configurator_c2b_dimension_k.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 148 | `backend/migrations/20260728045157_configurator_c2c_provenance_and_jsonb_invariants.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 149 | `backend/migrations/20260728120556_configurator_c2d_motor_qualifications.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 150 | `backend/migrations/20260807094550_configurator_c7_fix_canonical_ab_labels.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 151 | `backend/migrations/20260808080632_ta1_tiers_roles_foundation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 152 | `backend/migrations/20260809033113_ta4_activities_v2_foundation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 153 | `backend/migrations/20260809035041_ta4_activity_fk_indexes.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 154 | `backend/migrations/20260809042946_ta5_activity_compatibility_bridge.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 155 | `backend/migrations/20260809043926_ta5_activity_correction_reason.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 156 | `backend/migrations/20260811075102_b3_1_tasks_foundation.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 157 | `backend/migrations/20260813074141_b3_6_reminder_cutover_and_test_cleanup.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 158 | `backend/migrations/20260816064437_ai_watch_reservations.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable ; commentaire local périmé, migration distante appliquée |
| 159 | `backend/migrations/20260904091933_retire_motor_configurator.sql` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 160 | `backend/migrations/README.md` | Migration SQL | 1 | **CONSERVER** — historique immuable |
| 161 | `backend/package.json` | Configuration / asset texte | 1 | dépendances XLSX/ZIP et limites à corriger |
| 162 | `backend/src/app.ts` | Source / script | 1 | liveness/readiness/config/logs à rendre vrais |
| 163 | `backend/src/config.ts` | Source / script | 1 | liveness/readiness/config/logs à rendre vrais |
| 164 | `backend/src/index.ts` | Source / script | 1 | liveness/readiness/config/logs à rendre vrais |
| 165 | `backend/src/integration/admin_integration_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 166 | `backend/src/integration/aiQuotaConcurrency_integration_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 167 | `backend/src/integration/auth_integration_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 168 | `backend/src/integration/data_integration_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 169 | `backend/src/integration/env.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 170 | `backend/src/integration/helpers.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 171 | `backend/src/integration/tasksActivityRecurrence_integration_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 172 | `backend/src/integration/tasksFinalRecipe_integration_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 173 | `backend/src/integration/tasks_integration_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 174 | `backend/src/middleware/auth/auth.ts` | Source / script | 1 | frontière `userDb` privilégiée / RLS non effective |
| 175 | `backend/src/middleware/auth/auth_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 176 | `backend/src/middleware/auth/buildAuthContext.ts` | Source / script | 1 | changement obligatoire de mot de passe contournable |
| 177 | `backend/src/middleware/auth/buildAuthContext_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 178 | `backend/src/middleware/auth/dbClients.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 179 | `backend/src/middleware/auth/verifyToken.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 180 | `backend/src/middleware/auth/verifyToken_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 181 | `backend/src/middleware/corsAndBodySize.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 182 | `backend/src/middleware/errorHandler.ts` | Source / script | 1 | liveness/readiness/config/logs à rendre vrais |
| 183 | `backend/src/middleware/errorHandler_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 184 | `backend/src/middleware/requestId.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 185 | `backend/src/services/admin/adminAgencies.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 186 | `backend/src/services/admin/adminAgencies_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 187 | `backend/src/services/admin/adminQueries.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 188 | `backend/src/services/admin/adminUsers.ts` | Source / script | 1 | suppression utilisateur partielle/non atomique |
| 189 | `backend/src/services/admin/adminUsers_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 190 | `backend/src/services/adminUsers/actions/deleteUser.ts` | Source / script | 1 | suppression utilisateur partielle/non atomique |
| 191 | `backend/src/services/adminUsers/actions/deleteUser_test.ts` | Test | 1 | suppression utilisateur partielle/non atomique |
| 192 | `backend/src/services/adminUsers/core/createUser.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 193 | `backend/src/services/adminUsers/core/createUser_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 194 | `backend/src/services/adminUsers/core/updateUser.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 195 | `backend/src/services/adminUsers/core/updateUser_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 196 | `backend/src/services/adminUsers/queries/queryUsers.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 197 | `backend/src/services/adminUsers/queries/queryUsers_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 198 | `backend/src/services/adminUsers/validation/validators.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 199 | `backend/src/services/adminUsers/validation/validators_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 200 | `backend/src/services/ai/aiAccess.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 201 | `backend/src/services/ai/aiAccess_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 202 | `backend/src/services/ai/aiGovernance.ts` | Source / script | 1 | validation `base_url`/clé fournisseur ; séparation seulement au prochain changement |
| 203 | `backend/src/services/ai/aiPromptGovernance_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 204 | `backend/src/services/ai/aiRunContext.ts` | Source / script | 1 | quota atomique actif ; ancien chemin non atomique mort à retirer |
| 205 | `backend/src/services/ai/aiRunContext_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 206 | `backend/src/services/ai/runtime/agentRuntime.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 207 | `backend/src/services/ai/runtime/agentRuntime_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 208 | `backend/src/services/ai/runtime/aiSdkRuntime.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 209 | `backend/src/services/ai/runtime/deterministicRuntime.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 210 | `backend/src/services/ai/runtime/mapAiSdkError.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 211 | `backend/src/services/ai/runtime/mapAiSdkError_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 212 | `backend/src/services/ai/runtime/providerRegistry.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 213 | `backend/src/services/ai/runtime/providerRegistry_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 214 | `backend/src/services/ai/watch/referenceWatchPrompt.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 215 | `backend/src/services/ai/watch/referenceWatchPrompt_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 216 | `backend/src/services/ai/watch/referenceWatchSummarize.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 217 | `backend/src/services/ai/watch/referenceWatchSummarize_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 218 | `backend/src/services/config/cockpit.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 219 | `backend/src/services/config/configIntegrityInteractionUpdate.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 220 | `backend/src/services/config/configIntegrityInteractions.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 221 | `backend/src/services/config/configSettings.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 222 | `backend/src/services/config/configSettings_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 223 | `backend/src/services/config/configSnapshot.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 224 | `backend/src/services/config/configSnapshot_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 225 | `backend/src/services/config/configUsage.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 226 | `backend/src/services/data/dataAccess.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 227 | `backend/src/services/data/dataAccess_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 228 | `backend/src/services/data/dataConfig.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 229 | `backend/src/services/data/dataConfig_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 230 | `backend/src/services/data/dataProfile.ts` | Source / script | 1 | changement obligatoire de mot de passe contournable |
| 231 | `backend/src/services/data/dataProfile_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 232 | `backend/src/services/directory.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 233 | `backend/src/services/directory/company/directoryCompany.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 234 | `backend/src/services/directory/company/directoryCompanyApi.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 235 | `backend/src/services/directory/company/directoryCompanyDetailsMapper.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 236 | `backend/src/services/directory/company/directoryCompanySchemas.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 237 | `backend/src/services/directory/company/directoryCompanySearchMapper.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 238 | `backend/src/services/directory/company/directoryCompanySearch_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 239 | `backend/src/services/directory/core/directorySavedViews.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 240 | `backend/src/services/directory/core/directorySavedViews_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 241 | `backend/src/services/directory/core/directoryShared.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 242 | `backend/src/services/directory/core/directoryShared_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 243 | `backend/src/services/directory/core/directory_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 244 | `backend/src/services/directory/duplicates/directoryDuplicateRows.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 245 | `backend/src/services/directory/duplicates/directoryDuplicates.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 246 | `backend/src/services/directory/duplicates/directoryDuplicatesCompany.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 247 | `backend/src/services/directory/duplicates/directoryDuplicatesIndividual.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 248 | `backend/src/services/directory/listing/directoryListing.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 249 | `backend/src/services/directory/listing/directoryListingCity.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 250 | `backend/src/services/directory/listing/directoryListingList.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 251 | `backend/src/services/directory/listing/directoryListingOptions.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 252 | `backend/src/services/directory/listing/directoryListingRecord.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 253 | `backend/src/services/entities/actions/dataEntitiesDelete.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 254 | `backend/src/services/entities/actions/dataEntitiesMutations.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 255 | `backend/src/services/entities/actions/dataEntitiesReassign.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 256 | `backend/src/services/entities/actions/dataEntitiesSave.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 257 | `backend/src/services/entities/actions/dataEntitiesSavePersistence.ts` | Source / script | 1 | upsert/ownership/version inter-agence à corriger |
| 258 | `backend/src/services/entities/actions/dataEntitiesSavePersistence_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 259 | `backend/src/services/entities/actions/dataEntitiesSaveRows.ts` | Source / script | 1 | upsert/ownership/version inter-agence à corriger |
| 260 | `backend/src/services/entities/activities/dataActivitiesV2.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 261 | `backend/src/services/entities/contacts/dataEntityContacts.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 262 | `backend/src/services/entities/contacts/dataEntityContacts_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 263 | `backend/src/services/entities/core/dataEntities.ts` | Source / script | 1 | upsert/ownership/version inter-agence à corriger |
| 264 | `backend/src/services/entities/core/dataEntitiesList.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 265 | `backend/src/services/entities/core/dataEntitiesShared.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 266 | `backend/src/services/entities/core/dataEntities_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 267 | `backend/src/services/entities/core/tierReadModel.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 268 | `backend/src/services/entities/core/tierReadModel_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 269 | `backend/src/services/entities/interactions/dataInteractions.ts` | Source / script | 1 | upsert/ownership/version inter-agence à corriger |
| 270 | `backend/src/services/entities/interactions/dataInteractions_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 271 | `backend/src/services/pricing/references/referenceActivation.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 272 | `backend/src/services/pricing/references/referenceActivation_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 273 | `backend/src/services/pricing/references/referenceDiffAggregates.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 274 | `backend/src/services/pricing/references/referenceDiffs.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 275 | `backend/src/services/pricing/references/referenceDiffs_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 276 | `backend/src/services/pricing/references/referenceExcelParser.ts` | Source / script | 1 | dépendances XLSX/ZIP et limites à corriger |
| 277 | `backend/src/services/pricing/references/referenceExcelParser_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 278 | `backend/src/services/pricing/references/referenceExcelSources_local_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 279 | `backend/src/services/pricing/references/referenceImports.ts` | Source / script | 1 | concurrence/persistance import + bloc assistant mort + taille à redécouper au fil du correctif |
| 280 | `backend/src/services/pricing/references/referenceImports_effectiveFiles_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 281 | `backend/src/services/pricing/references/referenceProductSemantics.ts` | Source / script | 1 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 282 | `backend/src/services/pricing/references/referenceSemantics.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 283 | `backend/src/services/pricing/references/referenceWatchFacts.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 284 | `backend/src/services/pricing/references/referenceWatchFacts.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 285 | `backend/src/services/pricing/references/referenceWatchFacts_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 286 | `backend/src/services/rate-limiting/rateLimit.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 287 | `backend/src/services/rate-limiting/rateLimit_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 288 | `backend/src/services/search/dataSearchEntitiesUnified.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 289 | `backend/src/services/search/dataSearchEntitiesUnifiedConditions.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 290 | `backend/src/services/search/dataSearchEntitiesUnifiedMapping.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 291 | `backend/src/services/search/dataSearchEntitiesUnified_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 292 | `backend/src/services/tasks/taskService.ts` | Source / script | 1 | N+1 liste et nom responsable ; **conserver cohésion métier** |
| 293 | `backend/src/services/tasks/taskService_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 294 | `backend/src/test/assert.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 295 | `backend/src/trpc/aiContracts_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 296 | `backend/src/trpc/appRoutes_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 297 | `backend/src/trpc/context.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 298 | `backend/src/trpc/dataEntitiesDbSelection.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 299 | `backend/src/trpc/payloadContracts_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 300 | `backend/src/trpc/pricingReferenceContracts_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 301 | `backend/src/trpc/procedureHelpers.ts` | Source / script | 1 | frontière `userDb` privilégiée / RLS non effective |
| 302 | `backend/src/trpc/procedures.ts` | Source / script | 1 | frontière `userDb` privilégiée / RLS non effective |
| 303 | `backend/src/trpc/router.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 304 | `backend/src/trpc/router_test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 305 | `backend/src/types.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 306 | `backend/tests/audit_logs.sql` | Fichier suivi | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 307 | `backend/tests/interactions_conflict.sql` | Fichier suivi | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 308 | `backend/tests/rate_limits.sql` | Fichier suivi | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 309 | `backend/tests/rls_multi_agency.sql` | Fichier suivi | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 310 | `backend/tests/tasks_foundation.sql` | Fichier suivi | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 311 | `backend/tsconfig.json` | Configuration / asset texte | 1 | gates audit/intégration/unused à réaligner |
| 312 | `backend/vitest.config.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 313 | `backend/vitest.integration.config.ts` | Source / script | 1 | gates audit/intégration/unused à réaligner |
| 314 | `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` | Documentation | 3 | **SUPPRIMER ou condenser en historique** — autorité IA supersédée, liens cassés |
| 315 | `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` | Documentation | 3 | **SUPPRIMER ou condenser en historique** — autorité IA supersédée, liens cassés |
| 316 | `docs/IA_AGENTIQUE/README.md` | Documentation | 3 | réconcilier état Node/Edge et prochaine étape |
| 317 | `docs/IA_AGENTIQUE/plan-refonte-agentic-first.md` | Documentation | 3 | réconcilier état Node/Edge et prochaine étape |
| 318 | `docs/IA_AGENTIQUE/stack-cible-agentique-et-comparatif-existant.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 319 | `docs/Import 07-07-26/Classification_produit_07-07-2026_16-36-34.xlsx` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 320 | `docs/Import 07-07-26/SEG_GRI_HA_07-07-2026_16-36-41.xlsx` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 321 | `docs/LOGIQUE_REMISE_CIR/Classification_produit_08-04-2026_09-46-26.xlsx` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 322 | `docs/LOGIQUE_REMISE_CIR/Classification_produits.xlsx` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 323 | `docs/LOGIQUE_REMISE_CIR/Présentation_contexte.txt` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 324 | `docs/LOGIQUE_REMISE_CIR/SEGMENTS TARIFAIRES.xlsx` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 325 | `docs/LOGIQUE_REMISE_CIR/SEG_GRI_HA_08-04-2026_09-03-28.xlsx` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 326 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/00-sommaire.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 327 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/DECISIONS/decisions-et-questions.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 328 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/01-contexte-enjeux.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 329 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/02-hierarchie-produit.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 330 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/03-logique-tarification.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 331 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/04-roles-workflows.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 332 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/05-ecrans-utilisateur.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 333 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/06-ecrans-prix-derogations.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 334 | `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/07-regles-metier.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 335 | `docs/LOGIQUE_REMISE_CIR/full_tree_famille-CIR.txt` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 336 | `docs/LOGIQUE_REMISE_CIR/outil_remises_niveaux_v11q.xlsm` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 337 | `docs/LOGIQUE_REMISE_CIR/outil_remises_niveaux_v11t.xlsm` | Source métier binaire | 3 | **CONSERVER** — source métier distincte, audit de données séparé |
| 338 | `docs/PLAN/plan-brique-3-taches-relances.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 339 | `docs/PLAN/plan-consolidation-tiers-activites.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 340 | `docs/UI_UX/audit-gouvernance-ia-2026-08-16.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 341 | `docs/UI_UX/changelog.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 342 | `docs/UI_UX/plan-refonte-gouvernance-ia-mission-control.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 343 | `docs/UI_UX/plan-refonte-ui.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 344 | `docs/agents/domain.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 345 | `docs/agents/issue-tracker.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 346 | `docs/agents/triage-labels.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 347 | `docs/architecture-cible-cir-cockpit.md` | Documentation | 3 | réconcilier état Node/Edge et prochaine étape |
| 348 | `docs/qa-runbook.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 349 | `docs/stack.md` | Documentation | 3 | réconcilier état Node/Edge et prochaine étape |
| 350 | `docs/testing.md` | Documentation | 3 | REVU — aucun lien ou conflit autonome isolé |
| 351 | `frontend/.env.example` | Configuration / asset texte | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 352 | `frontend/components.json` | Configuration / asset texte | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 353 | `frontend/e2e-proof-cp-c1/01-debitmetres.json` | Configuration / asset texte | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 354 | `frontend/e2e-proof-cp-c1/01-debitmetres.png` | Image / preuve | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 355 | `frontend/e2e-proof-cp-c1/02-verins.json` | Configuration / asset texte | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 356 | `frontend/e2e-proof-cp-c1/02-verins.png` | Image / preuve | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 357 | `frontend/e2e-proof-cp-c1/03-variateur.json` | Configuration / asset texte | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 358 | `frontend/e2e-proof-cp-c1/03-variateur.png` | Image / preuve | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 359 | `frontend/e2e-proof-cp-c2/fastpaths-flagon.json` | Configuration / asset texte | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 360 | `frontend/e2e-proof-cp-c2/servomoteurs-flagoff-rollback.json` | Configuration / asset texte | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 361 | `frontend/e2e-proof-cp-c2/servomoteurs-flagon-qualified.json` | Configuration / asset texte | 2 | preuve historique seulement ; sort lié à `ASSISTANT_IA` |
| 362 | `frontend/e2e/admin-create-user.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 363 | `frontend/e2e/admin-settings-p07.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 364 | `frontend/e2e/auth.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 365 | `frontend/e2e/client-crud-complete.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 366 | `frontend/e2e/clients-p05.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 367 | `frontend/e2e/dashboard-p06.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 368 | `frontend/e2e/first-login-password.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 369 | `frontend/e2e/helpers/backend-fixtures.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 370 | `frontend/e2e/interactions-cockpit.spec.ts` | Test | 2 | deux scénarios `test.skip` permanents à statuer |
| 371 | `frontend/e2e/navigation.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 372 | `frontend/e2e/pricing-references-versioning.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 373 | `frontend/e2e/search.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 374 | `frontend/e2e/tasks-b3-5.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 375 | `frontend/e2e/tasks-b3-6-real.spec.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 376 | `frontend/eslint.config.js` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 377 | `frontend/index.html` | Configuration / asset texte | 2 | dette palette froide confirmée ; dette design systémique (taille/couleur/transition/gradient) |
| 378 | `frontend/package.json` | Configuration / asset texte | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 379 | `frontend/playwright.config.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 380 | `frontend/scripts/check-error-compliance.mjs` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 381 | `frontend/src/App.tsx` | Source / script | 2 | props no-op trompeuses, surchargées plus bas dans le shell |
| 382 | `frontend/src/__tests__/mocks/supabase.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 383 | `frontend/src/__tests__/setup.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 384 | `frontend/src/__tests__/test-utils.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 385 | `frontend/src/app/__tests__/appConstants.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 386 | `frontend/src/app/__tests__/appRoutes.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 387 | `frontend/src/app/__tests__/dashboardSearch.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 388 | `frontend/src/app/__tests__/getOrCreateReactRoot.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 389 | `frontend/src/app/__tests__/useAppSearchData.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 390 | `frontend/src/app/__tests__/useAppShortcuts.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 391 | `frontend/src/app/appCommands.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 392 | `frontend/src/app/appConstants.tsx` | Source / script | 2 | **P0 UI** — vues masquées/hotkeys et collisions de raccourcis |
| 393 | `frontend/src/app/appRoutes.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 394 | `frontend/src/app/dashboardSearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 395 | `frontend/src/app/getAppGate.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 396 | `frontend/src/app/getOrCreateReactRoot.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 397 | `frontend/src/app/pricingReferentialsSearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 398 | `frontend/src/app/router.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 399 | `frontend/src/app/useAppSearchData.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 400 | `frontend/src/app/useAppShortcuts.ts` | Source / script | 2 | **P0 UI** — vues masquées/hotkeys et collisions de raccourcis |
| 401 | `frontend/src/components/AdminPanel.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 402 | `frontend/src/components/AgenciesManager.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 403 | `frontend/src/components/AgencyFormDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 404 | `frontend/src/components/AppHeader.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 405 | `frontend/src/components/AppLayout.tsx` | Source / script | 2 | Sheet droit contraire au canon ; exception mobile à valider ; dette design systémique (taille/couleur/transition/gradient) |
| 406 | `frontend/src/components/AppMainContent.tsx` | Source / script | 2 | landmarks `main` imbriqués |
| 407 | `frontend/src/components/AppProviders.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 408 | `frontend/src/components/AppSearchOverlay.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 409 | `frontend/src/components/AppSessionProvider.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 410 | `frontend/src/components/AppSidebar.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 411 | `frontend/src/components/AuditLogsPanel.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 412 | `frontend/src/components/ChangePasswordScreen.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 413 | `frontend/src/components/ClientContactDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 414 | `frontend/src/components/ClientContactsList.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 415 | `frontend/src/components/ClientFormDialog.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 416 | `frontend/src/components/CockpitForm.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 417 | `frontend/src/components/ConfirmDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 418 | `frontend/src/components/ConvertClientDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 419 | `frontend/src/components/Dashboard.tsx` | Source / script | 2 | **P0 UI** — vues masquées/hotkeys et collisions de raccourcis |
| 420 | `frontend/src/components/EntityOnboardingDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 421 | `frontend/src/components/ErrorBoundary.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 422 | `frontend/src/components/ErrorJournalExport.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 423 | `frontend/src/components/InteractionDetails.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 424 | `frontend/src/components/InteractionSearchBar.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 425 | `frontend/src/components/LoginScreen.tsx` | Source / script | 2 | Login hors langage produit/design ; dette design systémique (taille/couleur/transition/gradient) |
| 426 | `frontend/src/components/ProspectFormDialog.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 427 | `frontend/src/components/Settings.tsx` | Source / script | 2 | erreurs/absence rendues comme 0, vide ou `À jour` |
| 428 | `frontend/src/components/TemporaryPasswordDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 429 | `frontend/src/components/UserCreateDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 430 | `frontend/src/components/UserIdentityDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 431 | `frontend/src/components/UserMembershipDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 432 | `frontend/src/components/UsersManager.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 433 | `frontend/src/components/__tests__/AdminPanel.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 434 | `frontend/src/components/__tests__/AgencyFormDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 435 | `frontend/src/components/__tests__/AppHeader.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 436 | `frontend/src/components/__tests__/AppMainStateView.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 437 | `frontend/src/components/__tests__/AppSearchOverlay.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 438 | `frontend/src/components/__tests__/AppSidebar.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 439 | `frontend/src/components/__tests__/ChangePasswordScreen.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 440 | `frontend/src/components/__tests__/ClientContactsList.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 441 | `frontend/src/components/__tests__/CockpitForm.a11y.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 442 | `frontend/src/components/__tests__/EntityOnboardingDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 443 | `frontend/src/components/__tests__/ErrorBoundary.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 444 | `frontend/src/components/__tests__/InteractionSearchBar.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 445 | `frontend/src/components/__tests__/LoginScreen.a11y.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 446 | `frontend/src/components/__tests__/LoginScreen.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 447 | `frontend/src/components/__tests__/UserMembershipDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 448 | `frontend/src/components/admin-ai/AdminAiPanel.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 449 | `frontend/src/components/admin-ai/AiCapabilitiesView.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 450 | `frontend/src/components/admin-ai/AiJournalView.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 451 | `frontend/src/components/admin-ai/AiPromptEditorDialog.tsx` | Source / script | 2 | brouillon long perdable à la fermeture |
| 452 | `frontend/src/components/admin-ai/AiPromptLifecycleDialogs.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 453 | `frontend/src/components/admin-ai/AiPromptStudioView.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 454 | `frontend/src/components/admin-ai/AiRightsBudgetsView.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 455 | `frontend/src/components/admin-ai/AiSituationView.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 456 | `frontend/src/components/admin-ai/AiUsageEventDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 457 | `frontend/src/components/admin-ai/__tests__/AdminAiPanel.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 458 | `frontend/src/components/admin-ai/__tests__/AiCapabilitiesView.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 459 | `frontend/src/components/admin-ai/__tests__/AiJournalView.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 460 | `frontend/src/components/admin-ai/__tests__/AiPromptEditorDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 461 | `frontend/src/components/admin-ai/__tests__/AiPromptStudioView.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 462 | `frontend/src/components/admin-ai/__tests__/AiRightsBudgetsView.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 463 | `frontend/src/components/admin-ai/__tests__/AiSituationView.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 464 | `frontend/src/components/admin-ai/__tests__/AiUsageEventDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 465 | `frontend/src/components/admin-ai/aiAdminUi.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 466 | `frontend/src/components/admin-ai/diff/AiPromptDiffViewer.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 467 | `frontend/src/components/admin-ai/diff/__tests__/calculateLineDiff.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 468 | `frontend/src/components/admin-ai/diff/calculateLineDiff.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 469 | `frontend/src/components/admin-suppliers/AdminIndexPage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 470 | `frontend/src/components/admin-suppliers/AdminSupplierCreatePage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 471 | `frontend/src/components/admin-suppliers/AdminSuppliersPage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 472 | `frontend/src/components/admin-suppliers/AdminSuppliersTable.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 473 | `frontend/src/components/admin-suppliers/__tests__/AdminSupplierCreatePage.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 474 | `frontend/src/components/admin-suppliers/__tests__/AdminSuppliersPage.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 475 | `frontend/src/components/admin-suppliers/create-wizard/get-establishment-label.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 476 | `frontend/src/components/admin-suppliers/create-wizard/get-status-badge-variant.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 477 | `frontend/src/components/admin-suppliers/create-wizard/search-step/company-group-card.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 478 | `frontend/src/components/admin-suppliers/create-wizard/search-step/establishment-sub-list.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 479 | `frontend/src/components/admin-suppliers/create-wizard/search-step/search-filters-form.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 480 | `frontend/src/components/admin-suppliers/create-wizard/search-step/search-results-list.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 481 | `frontend/src/components/admin-suppliers/create-wizard/search-step/supplier-search-step.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 482 | `frontend/src/components/admin-suppliers/create-wizard/search-step/use-establishment-selection.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 483 | `frontend/src/components/admin-suppliers/create-wizard/search-step/use-supplier-search-filters.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 484 | `frontend/src/components/admin-suppliers/create-wizard/supplier-details-step.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 485 | `frontend/src/components/admin-suppliers/create-wizard/supplier-intelligence-aside.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 486 | `frontend/src/components/admin-suppliers/create-wizard/supplier-review-step.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 487 | `frontend/src/components/admin-suppliers/create-wizard/use-supplier-onboarding.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 488 | `frontend/src/components/admin-suppliers/supplierDirectorySearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 489 | `frontend/src/components/admin-suppliers/supplierGridConfig.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 490 | `frontend/src/components/admin-suppliers/useSupplierDirectoryWorkspace.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 491 | `frontend/src/components/agencies/AgenciesManagerDialogs.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 492 | `frontend/src/components/agencies/AgenciesManagerHeader.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 493 | `frontend/src/components/agencies/AgenciesManagerList.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 494 | `frontend/src/components/agencies/AgenciesManagerSearch.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 495 | `frontend/src/components/agencies/AgencyCard.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 496 | `frontend/src/components/app-header/AppHeader.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 497 | `frontend/src/components/app-header/AppHeaderSearchButton.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 498 | `frontend/src/components/app-header/__tests__/AppHeaderSearchButton.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 499 | `frontend/src/components/app-main/AppMainContent.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 500 | `frontend/src/components/app-main/AppMainStateView.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 501 | `frontend/src/components/app-main/AppMainTabContent.tsx` | Source / script | 2 | **P0 UI** — vues masquées/hotkeys et collisions de raccourcis |
| 502 | `frontend/src/components/app-main/__tests__/AppMainTabContent.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 503 | `frontend/src/components/app-search/AppSearchClientsSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 504 | `frontend/src/components/app-search/AppSearchCommandsSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 505 | `frontend/src/components/app-search/AppSearchContactsSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 506 | `frontend/src/components/app-search/AppSearchEmptyState.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 507 | `frontend/src/components/app-search/AppSearchFooter.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 508 | `frontend/src/components/app-search/AppSearchGroup.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 509 | `frontend/src/components/app-search/AppSearchInteractionsSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 510 | `frontend/src/components/app-search/AppSearchProspectsSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 511 | `frontend/src/components/app-search/AppSearchRecentsSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 512 | `frontend/src/components/app-search/AppSearchResults.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 513 | `frontend/src/components/app-search/AppSearchRow.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 514 | `frontend/src/components/app-search/AppSearchScopeToken.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 515 | `frontend/src/components/app-shell/PageToolbar.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 516 | `frontend/src/components/app-shell/appShellTokens.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 517 | `frontend/src/components/app-sidebar/AppSidebarContent.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 518 | `frontend/src/components/app-sidebar/AppSidebarNavItemLink.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 519 | `frontend/src/components/app-sidebar/__tests__/AppSidebarContent.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 520 | `frontend/src/components/audit-logs/AuditLogsDateRange.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 521 | `frontend/src/components/audit-logs/AuditLogsFilters.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 522 | `frontend/src/components/audit-logs/AuditLogsHeader.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 523 | `frontend/src/components/audit-logs/AuditLogsRow.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 524 | `frontend/src/components/audit-logs/AuditLogsTable.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 525 | `frontend/src/components/audit-logs/__tests__/AuditLogsDateRange.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 526 | `frontend/src/components/audit-logs/__tests__/AuditLogsFilters.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 527 | `frontend/src/components/change-password/ChangePasswordActions.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 528 | `frontend/src/components/change-password/ChangePasswordError.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 529 | `frontend/src/components/change-password/ChangePasswordFields.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 530 | `frontend/src/components/change-password/ChangePasswordFields.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 531 | `frontend/src/components/change-password/ChangePasswordHeader.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 532 | `frontend/src/components/change-password/ChangePasswordRules.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 533 | `frontend/src/components/client-detail/ClientDetailContactsSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 534 | `frontend/src/components/client-detail/ClientDetailEmptyState.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 535 | `frontend/src/components/client-detail/ClientDetailHeader.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 536 | `frontend/src/components/client-detail/ClientDetailInfoGrid.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 537 | `frontend/src/components/client-detail/ClientDetailInteractionsSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 538 | `frontend/src/components/client-detail/ClientDetailPanel.types.ts` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 539 | `frontend/src/components/client-detail/useClientDetailInteractions.ts` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 540 | `frontend/src/components/client-directory/ClientDirectoryConvertPage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 541 | `frontend/src/components/client-directory/ClientDirectoryCreatePage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 542 | `frontend/src/components/client-directory/ClientDirectoryDetailPage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 543 | `frontend/src/components/client-directory/ClientDirectoryFilters.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 544 | `frontend/src/components/client-directory/ClientDirectoryInteractionDetailsSheet.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 545 | `frontend/src/components/client-directory/ClientDirectoryInteractionSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 546 | `frontend/src/components/client-directory/ClientDirectoryPage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 547 | `frontend/src/components/client-directory/ClientDirectoryRecordActionsBar.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 548 | `frontend/src/components/client-directory/ClientDirectoryRecordDangerMenu.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 549 | `frontend/src/components/client-directory/ClientDirectoryRecordDetails.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 550 | `frontend/src/components/client-directory/ClientDirectoryRecordHistoryPanel.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 551 | `frontend/src/components/client-directory/ClientDirectoryRecordIdentityCard.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 552 | `frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) ; affordances pointer/hover sans action |
| 553 | `frontend/src/components/client-directory/ClientDirectoryRecordInteractionsPanel.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 554 | `frontend/src/components/client-directory/ClientDirectoryTable.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 555 | `frontend/src/components/client-directory/ClientDirectoryWorkspace.tsx` | Source / script | 2 | total absent, busy persistant et pagination fictive |
| 556 | `frontend/src/components/client-directory/DirectoryMobileFilterSheet.tsx` | Source / script | 2 | Sheet droit contraire au canon ; exception mobile à valider |
| 557 | `frontend/src/components/client-directory/DirectorySavedViewsBar.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 558 | `frontend/src/components/client-directory/__tests__/ClientDirectoryDetailPage.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 559 | `frontend/src/components/client-directory/__tests__/ClientDirectoryFilters.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 560 | `frontend/src/components/client-directory/__tests__/ClientDirectoryPage.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 561 | `frontend/src/components/client-directory/__tests__/ClientDirectoryRecordActionsBar.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 562 | `frontend/src/components/client-directory/__tests__/ClientDirectoryRecordHistoryPanel.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 563 | `frontend/src/components/client-directory/__tests__/ClientDirectoryTable.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 564 | `frontend/src/components/client-directory/__tests__/DirectoryTablePagination.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 565 | `frontend/src/components/client-directory/__tests__/clientDirectorySearch.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 566 | `frontend/src/components/client-directory/__tests__/directoryGridConfig.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 567 | `frontend/src/components/client-directory/clientDirectorySearch.ts` | Source / script | 2 | total absent, busy persistant et pagination fictive |
| 568 | `frontend/src/components/client-directory/data-table/DataTableColumnHeader.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 569 | `frontend/src/components/client-directory/data-table/DirectoryTablePagination.tsx` | Source / script | 2 | total absent, busy persistant et pagination fictive |
| 570 | `frontend/src/components/client-directory/data-table/DirectoryTableViewOptions.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 571 | `frontend/src/components/client-directory/directory-filters/DirectoryCityAutocomplete.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 572 | `frontend/src/components/client-directory/directory-filters/DirectoryDesktopFiltersRow.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 573 | `frontend/src/components/client-directory/directory-filters/DirectoryFilterCombobox.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 574 | `frontend/src/components/client-directory/directory-filters/DirectoryFilterPopover.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 575 | `frontend/src/components/client-directory/directory-filters/DirectoryFilters.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 576 | `frontend/src/components/client-directory/directory-filters/DirectorySearchInput.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 577 | `frontend/src/components/client-directory/directory-filters/DirectoryTypeFilter.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 578 | `frontend/src/components/client-directory/directoryGridConfig.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 579 | `frontend/src/components/client-directory/directoryRouting.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 580 | `frontend/src/components/client-directory/directoryViewport.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 581 | `frontend/src/components/client-directory/edit/EntityEditField.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 582 | `frontend/src/components/client-directory/edit/EntityEditPanel.tsx` | Source / script | 2 | Sheet droit contraire au canon ; exception mobile à valider ; dette design systémique (taille/couleur/transition/gradient) |
| 583 | `frontend/src/components/client-directory/edit/EntityEditSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 584 | `frontend/src/components/client-directory/edit/EntityEditSummaryRail.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 585 | `frontend/src/components/client-directory/edit/__tests__/entityEditOfficialResync.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 586 | `frontend/src/components/client-directory/edit/entityEditPanel.schema.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 587 | `frontend/src/components/client-directory/edit/entityEditPanel.utils.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 588 | `frontend/src/components/client-directory/useClientDirectoryRecordInteractions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 589 | `frontend/src/components/client-directory/useClientDirectoryWorkspace.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 590 | `frontend/src/components/client-form/ClientFormAccountSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 591 | `frontend/src/components/client-form/ClientFormAddressSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 592 | `frontend/src/components/client-form/ClientFormAgencySection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 593 | `frontend/src/components/client-form/ClientFormCodesSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 594 | `frontend/src/components/client-form/ClientFormContactSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 595 | `frontend/src/components/client-form/ClientFormContent.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 596 | `frontend/src/components/client-form/ClientFormFooter.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 597 | `frontend/src/components/client-form/ClientFormHeader.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 598 | `frontend/src/components/client-form/ClientFormIdentitySection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 599 | `frontend/src/components/client-form/ClientFormNotesSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 600 | `frontend/src/components/cockpit/CockpitForm.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 601 | `frontend/src/components/cockpit/CockpitFormDialogs.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 602 | `frontend/src/components/cockpit/CockpitFormHeader.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 603 | `frontend/src/components/cockpit/CockpitLeftEntitySectionsProps.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 604 | `frontend/src/components/cockpit/CockpitPaneTypes.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 605 | `frontend/src/components/cockpit/CockpitReadonlyView.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 606 | `frontend/src/components/cockpit/CockpitShortcutLegend.tsx` | Source / script | 2 | raccourci `?` affiché sans handler |
| 607 | `frontend/src/components/cockpit/__tests__/CockpitFormDialogs.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 608 | `frontend/src/components/cockpit/__tests__/CockpitReadonlyView.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 609 | `frontend/src/components/cockpit/__tests__/CockpitShortcutLegend.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 610 | `frontend/src/components/cockpit/buildCockpitLeftEntitySectionsProps.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 611 | `frontend/src/components/cockpit/guided/CockpitGuidedChannelQuestion.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 612 | `frontend/src/components/cockpit/guided/CockpitGuidedContextPanel.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 613 | `frontend/src/components/cockpit/guided/CockpitGuidedDetailsQuestion.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 614 | `frontend/src/components/cockpit/guided/CockpitGuidedEntry.tsx` | Source / script | 2 | landmarks `main` imbriqués |
| 615 | `frontend/src/components/cockpit/guided/CockpitGuidedQuestionFrame.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 616 | `frontend/src/components/cockpit/guided/CockpitGuidedRelationQuestion.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 617 | `frontend/src/components/cockpit/guided/CockpitGuidedSearchQuestion.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 618 | `frontend/src/components/cockpit/guided/CockpitGuidedStepSwitch.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 619 | `frontend/src/components/cockpit/guided/CockpitInternalLookup.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 620 | `frontend/src/components/cockpit/guided/CockpitInternalMembersList.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 621 | `frontend/src/components/cockpit/guided/CockpitInternalQuickCreate.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 622 | `frontend/src/components/cockpit/guided/CockpitSolicitationLookup.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 623 | `frontend/src/components/cockpit/guided/CockpitSupplierContactStep.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 624 | `frontend/src/components/cockpit/guided/CockpitSupplierLookup.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 625 | `frontend/src/components/cockpit/guided/GuidedTierSearchShell.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 626 | `frontend/src/components/cockpit/guided/__tests__/CockpitGuidedContextPanel.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 627 | `frontend/src/components/cockpit/guided/__tests__/CockpitGuidedEntry.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 628 | `frontend/src/components/cockpit/guided/__tests__/CockpitGuidedRelationQuestion.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 629 | `frontend/src/components/cockpit/guided/__tests__/CockpitGuidedStepSwitch.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 630 | `frontend/src/components/cockpit/guided/__tests__/CockpitSolicitationLookup.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 631 | `frontend/src/components/cockpit/guided/__tests__/CockpitSupplierLookup.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 632 | `frontend/src/components/cockpit/guided/cockpit-guided-context-panel-helpers.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 633 | `frontend/src/components/cockpit/left/CockpitClientContactSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 634 | `frontend/src/components/cockpit/left/CockpitCompanyCityField.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 635 | `frontend/src/components/cockpit/left/CockpitCompanyInput.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 636 | `frontend/src/components/cockpit/left/CockpitContactNameFields.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 637 | `frontend/src/components/cockpit/left/CockpitContactPhoneEmailFields.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 638 | `frontend/src/components/cockpit/left/CockpitContactPositionField.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 639 | `frontend/src/components/cockpit/left/CockpitContactSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 640 | `frontend/src/components/cockpit/left/CockpitContactSection.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 641 | `frontend/src/components/cockpit/left/CockpitFieldError.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 642 | `frontend/src/components/cockpit/left/CockpitIdentityEditor.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 643 | `frontend/src/components/cockpit/left/CockpitIdentityHints.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 644 | `frontend/src/components/cockpit/left/CockpitIdentitySection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 645 | `frontend/src/components/cockpit/left/CockpitInteractionTypeSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 646 | `frontend/src/components/cockpit/left/CockpitManualContactForm.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 647 | `frontend/src/components/cockpit/left/CockpitManualContactForm.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 648 | `frontend/src/components/cockpit/left/CockpitManualContactSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 649 | `frontend/src/components/cockpit/left/CockpitRelationSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 650 | `frontend/src/components/cockpit/left/CockpitSearchSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 651 | `frontend/src/components/cockpit/left/CockpitSelectedContactCard.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 652 | `frontend/src/components/cockpit/left/CockpitSelectedEntityCard.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 653 | `frontend/src/components/cockpit/left/CockpitServicePicker.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 654 | `frontend/src/components/cockpit/left/CockpitServiceQuickToggles.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 655 | `frontend/src/components/cockpit/left/CockpitServiceSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 656 | `frontend/src/components/cockpit/left/__tests__/CockpitClientContactSection.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 657 | `frontend/src/components/cockpit/left/__tests__/CockpitSearchSection.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 658 | `frontend/src/components/cockpit/right/CockpitFooterSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 659 | `frontend/src/components/cockpit/right/CockpitStatusControl.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 660 | `frontend/src/components/cockpit/right/CockpitSubjectSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 661 | `frontend/src/components/contact-form/ContactFormContactSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 662 | `frontend/src/components/contact-form/ContactFormFooter.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 663 | `frontend/src/components/contact-form/ContactFormHeader.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 664 | `frontend/src/components/contact-form/ContactFormIdentitySection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 665 | `frontend/src/components/contact-form/ContactFormNotesSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 666 | `frontend/src/components/contact-form/ContactFormPositionSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 667 | `frontend/src/components/dashboard/DashboardDetailsOverlay.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 668 | `frontend/src/components/dashboard/__tests__/DashboardDetailsOverlay.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 669 | `frontend/src/components/dashboard/overview/DashboardDetailsActions.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 670 | `frontend/src/components/dashboard/overview/DashboardDossiersTable.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 671 | `frontend/src/components/dashboard/overview/DashboardEvolutionChart.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 672 | `frontend/src/components/dashboard/overview/DashboardKpiRow.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 673 | `frontend/src/components/dashboard/overview/DashboardOverviewHeader.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 674 | `frontend/src/components/dashboard/pipeline/PipelineLostDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 675 | `frontend/src/components/dashboard/pipeline/pipelineColumnsConfig.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 676 | `frontend/src/components/dashboard/toolbar/DashboardSearchInput.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 677 | `frontend/src/components/entity-contact/EntityContactRow.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 678 | `frontend/src/components/entity-contact/EntityContactsPanelSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 679 | `frontend/src/components/entity-contact/entityContactRow.utils.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 680 | `frontend/src/components/entity-onboarding/EntityOnboardingCompanySummary.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 681 | `frontend/src/components/entity-onboarding/EntityOnboardingDetailsStep.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 682 | `frontend/src/components/entity-onboarding/EntityOnboardingIndividualSearchStep.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 683 | `frontend/src/components/entity-onboarding/EntityOnboardingIntentStep.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 684 | `frontend/src/components/entity-onboarding/EntityOnboardingReviewStep.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 685 | `frontend/src/components/entity-onboarding/EntityOnboardingSearchStep.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 686 | `frontend/src/components/entity-onboarding/EntityOnboardingSidebar.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 687 | `frontend/src/components/entity-onboarding/EntityOnboardingSidebarSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 688 | `frontend/src/components/entity-onboarding/__tests__/entityOnboarding.utils.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 689 | `frontend/src/components/entity-onboarding/entityOnboarding.schema.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 690 | `frontend/src/components/entity-onboarding/entityOnboarding.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 691 | `frontend/src/components/entity-onboarding/entityOnboarding.utils.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 692 | `frontend/src/components/entity-onboarding/entityOnboardingChecklist.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 693 | `frontend/src/components/entity-onboarding/entityOnboardingSteps.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 694 | `frontend/src/components/entity-onboarding/useEntityOnboardingFlow.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 695 | `frontend/src/components/entity-onboarding/useEntityOnboardingFlow.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 696 | `frontend/src/components/entity-onboarding/useOnboardingCloseGuard.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 697 | `frontend/src/components/entity-onboarding/useOnboardingCompanyData.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 698 | `frontend/src/components/entity-onboarding/useOnboardingCompanySearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 699 | `frontend/src/components/entity-onboarding/useOnboardingCompanySelection.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 700 | `frontend/src/components/entity-onboarding/useOnboardingConfig.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 701 | `frontend/src/components/entity-onboarding/useOnboardingDuplicateChecks.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 702 | `frontend/src/components/entity-onboarding/useOnboardingFlowActions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 703 | `frontend/src/components/entity-onboarding/useOnboardingFlowEffects.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 704 | `frontend/src/components/entity-onboarding/useOnboardingIntentControls.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 705 | `frontend/src/components/entity-onboarding/useOnboardingLocalState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 706 | `frontend/src/components/entity-onboarding/useOnboardingNavigation.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 707 | `frontend/src/components/entity-onboarding/useOnboardingSubmit.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 708 | `frontend/src/components/entity-onboarding/useOnboardingValues.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 709 | `frontend/src/components/entity-record-wizard/EntityRecordWizardFields.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 710 | `frontend/src/components/entity-record-wizard/EntityRecordWizardProgress.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 711 | `frontend/src/components/entity-record-wizard/EntityRecordWizardRows.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 712 | `frontend/src/components/entity-record-wizard/EntityRecordWizardShell.tsx` | Source / script | 2 | landmarks `main` imbriqués |
| 713 | `frontend/src/components/interaction-card/InteractionChannelIcon.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 714 | `frontend/src/components/interaction-search/HighlightedDigits.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 715 | `frontend/src/components/interaction-search/HighlightedText.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 716 | `frontend/src/components/interaction-search/InteractionSearchBar.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 717 | `frontend/src/components/interaction-search/InteractionSearchContainer.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 718 | `frontend/src/components/interaction-search/InteractionSearchEntityItem.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 719 | `frontend/src/components/interaction-search/InteractionSearchFooter.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 720 | `frontend/src/components/interaction-search/InteractionSearchInput.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 721 | `frontend/src/components/interaction-search/InteractionSearchListArea.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 722 | `frontend/src/components/interaction-search/InteractionSearchRecents.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 723 | `frontend/src/components/interaction-search/InteractionSearchResults.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 724 | `frontend/src/components/interaction-search/InteractionSearchStatusMessage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 725 | `frontend/src/components/interactions/ActivityCanonicalDetails.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 726 | `frontend/src/components/interactions/InteractionDetailsFooter.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 727 | `frontend/src/components/interactions/InteractionDetailsHeader.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 728 | `frontend/src/components/interactions/InteractionDetailsSubjectCard.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 729 | `frontend/src/components/interactions/InteractionDetailsTimeline.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 730 | `frontend/src/components/interactions/__tests__/ActivityCanonicalDetails.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 731 | `frontend/src/components/interactions/footer/InteractionFooterAmountInput.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 732 | `frontend/src/components/interactions/footer/InteractionFooterNoteComposer.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 733 | `frontend/src/components/interactions/footer/InteractionFooterOrderRefInput.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 734 | `frontend/src/components/interactions/footer/InteractionFooterStatusSelect.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 735 | `frontend/src/components/interactions/footer/InteractionFooterTopFields.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 736 | `frontend/src/components/login/LoginScreenBrand.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 737 | `frontend/src/components/login/LoginScreenForm.tsx` | Source / script | 2 | Login hors langage produit/design ; dette design systémique (taille/couleur/transition/gradient) |
| 738 | `frontend/src/components/pricing-references/PricingReferencesPage.tsx` | Source / script | 2 | erreurs/absence rendues comme 0, vide ou `À jour` |
| 739 | `frontend/src/components/pricing-references/__tests__/PricingReferencesPage.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 740 | `frontend/src/components/pricing-references/__tests__/changes-triage.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 741 | `frontend/src/components/pricing-references/__tests__/import-row.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 742 | `frontend/src/components/pricing-references/components/anomalies/anomalies-triage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 743 | `frontend/src/components/pricing-references/components/anomalies/anomaly-detail-dialog.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 744 | `frontend/src/components/pricing-references/components/anomalies/anomaly-group.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 745 | `frontend/src/components/pricing-references/components/anomalies/anomaly-row.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 746 | `frontend/src/components/pricing-references/components/anomalies/anomaly-utils.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 747 | `frontend/src/components/pricing-references/components/anomalies/faceted-filter.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 748 | `frontend/src/components/pricing-references/components/changes/change-detail-dialog.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 749 | `frontend/src/components/pricing-references/components/changes/change-row.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 750 | `frontend/src/components/pricing-references/components/changes/changes-group.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 751 | `frontend/src/components/pricing-references/components/changes/changes-summary.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 752 | `frontend/src/components/pricing-references/components/changes/changes-triage.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 753 | `frontend/src/components/pricing-references/components/changes/changes-utils.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 754 | `frontend/src/components/pricing-references/components/changes/use-analyzed-imports.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 755 | `frontend/src/components/pricing-references/components/changes/use-changes-badge.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 756 | `frontend/src/components/pricing-references/components/changes/use-diff-summary.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 757 | `frontend/src/components/pricing-references/components/changes/use-import-snapshot-id.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 758 | `frontend/src/components/pricing-references/components/changes/use-snapshot-import-id.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 759 | `frontend/src/components/pricing-references/components/changes/version-selectors.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 760 | `frontend/src/components/pricing-references/components/classification/classification-drilldown.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 761 | `frontend/src/components/pricing-references/components/health/health-strip.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 762 | `frontend/src/components/pricing-references/components/imports/activation-confirm.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 763 | `frontend/src/components/pricing-references/components/imports/import-detail-dialog.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 764 | `frontend/src/components/pricing-references/components/imports/import-row.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 765 | `frontend/src/components/pricing-references/components/imports/import-rows.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 766 | `frontend/src/components/pricing-references/components/imports/use-activate-version.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 767 | `frontend/src/components/pricing-references/components/inputs/form-field.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 768 | `frontend/src/components/pricing-references/components/inputs/segmented-control.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 769 | `frontend/src/components/pricing-references/components/segments/segment-detail-dialog.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 770 | `frontend/src/components/pricing-references/components/segments/segment-grid-config.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 771 | `frontend/src/components/pricing-references/components/segments/segments-data-grid.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 772 | `frontend/src/components/pricing-references/components/segments/segments-view-options.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 773 | `frontend/src/components/pricing-references/components/table/pagination-bar.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 774 | `frontend/src/components/pricing-references/components/table/reference-table.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 775 | `frontend/src/components/pricing-references/components/table/sort-button.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 776 | `frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 777 | `frontend/src/components/pricing-references/utils/pricing-references-formatters.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 778 | `frontend/src/components/prospect-detail/ProspectDetailContactsSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 779 | `frontend/src/components/prospect-detail/ProspectDetailEmptyState.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 780 | `frontend/src/components/prospect-detail/ProspectDetailHeader.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 781 | `frontend/src/components/prospect-detail/ProspectDetailInfoGrid.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 782 | `frontend/src/components/prospect-detail/ProspectDetailPanel.types.ts` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 783 | `frontend/src/components/prospect-form/ProspectFormAddressSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 784 | `frontend/src/components/prospect-form/ProspectFormContent.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 785 | `frontend/src/components/prospect-form/ProspectFormFooter.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 786 | `frontend/src/components/prospect-form/ProspectFormHeader.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 787 | `frontend/src/components/prospect-form/ProspectFormIdentitySection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 788 | `frontend/src/components/prospect-form/ProspectFormMetaSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 789 | `frontend/src/components/prospect-form/ProspectFormNotesSection.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 790 | `frontend/src/components/settings/SettingsHeader.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 791 | `frontend/src/components/settings/SettingsReadOnlyBanner.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 792 | `frontend/src/components/settings/SettingsSections.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 793 | `frontend/src/components/settings/__tests__/SettingsSections.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 794 | `frontend/src/components/settings/input-rules/InputRulesSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 795 | `frontend/src/components/settings/integrity/IntegrityInteractionsSheet.tsx` | Source / script | 2 | Sheet droit contraire au canon ; exception mobile à valider ; dette design systémique (taille/couleur/transition/gradient) |
| 796 | `frontend/src/components/settings/integrity/IntegritySection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) ; erreurs/absence rendues comme 0, vide ou `À jour` |
| 797 | `frontend/src/components/settings/integrity/SystemManagedValues.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 798 | `frontend/src/components/settings/integrity/__tests__/system-managed-values.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 799 | `frontend/src/components/settings/integrity/integrity.constants.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 800 | `frontend/src/components/settings/integrity/system-managed-values.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 801 | `frontend/src/components/settings/kanban/KanbanAddBar.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 802 | `frontend/src/components/settings/kanban/KanbanRow.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 803 | `frontend/src/components/settings/kanban/KanbanSection.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 804 | `frontend/src/components/settings/kanban/KanbanSimulator.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 805 | `frontend/src/components/settings/referentials/ReferentialAddRow.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 806 | `frontend/src/components/settings/referentials/ReferentialColumn.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 807 | `frontend/src/components/settings/referentials/ReferentialItem.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 808 | `frontend/src/components/settings/referentials/ReferentialsSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 809 | `frontend/src/components/settings/settings-sections.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 810 | `frontend/src/components/settings/sidebar/SettingsSidebar.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 811 | `frontend/src/components/settings/tasks/TaskTypesSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 812 | `frontend/src/components/settings/ui/RenameDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 813 | `frontend/src/components/settings/ui/SettingsActionDrawer.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 814 | `frontend/src/components/settings/ui/SettingsSectionShell.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 815 | `frontend/src/components/tasks/TaskContextPanel.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 816 | `frontend/src/components/tasks/TaskCreateDialog.tsx` | Source / script | 2 | dates Paris, état de dialogue, labels/erreurs et nom responsable |
| 817 | `frontend/src/components/tasks/TaskDetailDialog.tsx` | Source / script | 2 | dates Paris, état de dialogue, labels/erreurs et nom responsable |
| 818 | `frontend/src/components/tasks/TasksPage.tsx` | Source / script | 2 | dates Paris, état de dialogue, labels/erreurs et nom responsable |
| 819 | `frontend/src/components/tasks/__tests__/TaskContextPanel.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 820 | `frontend/src/components/tasks/__tests__/TaskCreateDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 821 | `frontend/src/components/tasks/__tests__/TasksPage.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 822 | `frontend/src/components/tasks/taskUi.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 823 | `frontend/src/components/tasks/types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 824 | `frontend/src/components/ui/__tests__/AvatarInitials.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 825 | `frontend/src/components/ui/__tests__/StatusDot.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 826 | `frontend/src/components/ui/__tests__/densePrimitives.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 827 | `frontend/src/components/ui/__tests__/designTokensContrast.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 828 | `frontend/src/components/ui/data-display/AvatarInitials.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 829 | `frontend/src/components/ui/data-display/Badge.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 830 | `frontend/src/components/ui/data-display/Card.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 831 | `frontend/src/components/ui/data-display/Kbd.tsx` | Source / script | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 832 | `frontend/src/components/ui/data-display/ScrollArea.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 833 | `frontend/src/components/ui/data-display/StatusDot.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 834 | `frontend/src/components/ui/data-display/Table.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 835 | `frontend/src/components/ui/feedback/AlertDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 836 | `frontend/src/components/ui/feedback/Dialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 837 | `frontend/src/components/ui/feedback/Sheet.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 838 | `frontend/src/components/ui/feedback/Skeleton.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 839 | `frontend/src/components/ui/feedback/Tooltip.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 840 | `frontend/src/components/ui/inputs/basic/Button.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 841 | `frontend/src/components/ui/inputs/basic/Input.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 842 | `frontend/src/components/ui/inputs/basic/Switch.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 843 | `frontend/src/components/ui/inputs/basic/Textarea.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 844 | `frontend/src/components/ui/inputs/basic/Toggle.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 845 | `frontend/src/components/ui/inputs/basic/ToggleGroup.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 846 | `frontend/src/components/ui/inputs/selects/Combobox.tsx` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 847 | `frontend/src/components/ui/inputs/selects/Command.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 848 | `frontend/src/components/ui/inputs/selects/Select.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 849 | `frontend/src/components/ui/navigation/DropdownMenu.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 850 | `frontend/src/components/ui/navigation/Popover.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 851 | `frontend/src/components/ui/navigation/Tabs.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 852 | `frontend/src/components/user-create/UserCreateAgenciesSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 853 | `frontend/src/components/user-create/UserCreateFooter.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 854 | `frontend/src/components/user-create/UserCreateIdentitySection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 855 | `frontend/src/components/user-create/UserCreateRoleSection.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 856 | `frontend/src/components/users/UserCard.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 857 | `frontend/src/components/users/UserRoleChangeDialog.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 858 | `frontend/src/components/users/UsersManagerContent.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 859 | `frontend/src/components/users/UsersManagerDialogs.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 860 | `frontend/src/components/users/UsersManagerHeader.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 861 | `frontend/src/components/users/UsersManagerList.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 862 | `frontend/src/components/users/UsersManagerSearch.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 863 | `frontend/src/components/users/__tests__/UsersManagerList.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 864 | `frontend/src/components/users/controls/UserRoleSelect.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 865 | `frontend/src/constants/__tests__/relations.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 866 | `frontend/src/constants/relations.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 867 | `frontend/src/constants/statusCategories.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 868 | `frontend/src/hooks/__tests__/useAgenciesManager.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 869 | `frontend/src/hooks/__tests__/useAgencyConfig.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 870 | `frontend/src/hooks/__tests__/useAppSessionState.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 871 | `frontend/src/hooks/__tests__/useAppViewState.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 872 | `frontend/src/hooks/__tests__/useAuditLogs.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 873 | `frontend/src/hooks/__tests__/useChangePasswordState.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 874 | `frontend/src/hooks/__tests__/useClientContactDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 875 | `frontend/src/hooks/__tests__/useCockpitDerivedState.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 876 | `frontend/src/hooks/__tests__/useCockpitFormController.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 877 | `frontend/src/hooks/__tests__/useCockpitGuidedFlow.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 878 | `frontend/src/hooks/__tests__/useCockpitRelationChange.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 879 | `frontend/src/hooks/__tests__/useDashboardState.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 880 | `frontend/src/hooks/__tests__/useDashboardStatusHelpers.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 881 | `frontend/src/hooks/__tests__/useDebouncedValue.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 882 | `frontend/src/hooks/__tests__/useDeleteInteraction.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 883 | `frontend/src/hooks/__tests__/useDirectoryCompanyDetails.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 884 | `frontend/src/hooks/__tests__/useDirectoryDuplicates.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 885 | `frontend/src/hooks/__tests__/useEntityContactActions.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 886 | `frontend/src/hooks/__tests__/useEntityFormDialogs.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 887 | `frontend/src/hooks/__tests__/useEntityInteractions.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 888 | `frontend/src/hooks/__tests__/useInteractionDraft.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 889 | `frontend/src/hooks/__tests__/useInteractionHandlers.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 890 | `frontend/src/hooks/__tests__/useInteractionHotkeys.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 891 | `frontend/src/hooks/__tests__/useInteractionSearch.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 892 | `frontend/src/hooks/__tests__/useInteractionSubmit.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 893 | `frontend/src/hooks/__tests__/useInteractions.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 894 | `frontend/src/hooks/__tests__/useLoginScreenForm.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 895 | `frontend/src/hooks/__tests__/useNotifyError.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 896 | `frontend/src/hooks/__tests__/useProspectFormDialog.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 897 | `frontend/src/hooks/__tests__/useRecentOwnInteractions.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 898 | `frontend/src/hooks/__tests__/useSaveInteraction.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 899 | `frontend/src/hooks/__tests__/useSettingsState.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 900 | `frontend/src/hooks/__tests__/useUsersManager.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 901 | `frontend/src/hooks/admin/agencies/actions/useArchiveAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 902 | `frontend/src/hooks/admin/agencies/actions/useCreateAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 903 | `frontend/src/hooks/admin/agencies/actions/useHardDeleteAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 904 | `frontend/src/hooks/admin/agencies/actions/useRenameAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 905 | `frontend/src/hooks/admin/agencies/actions/useUnarchiveAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 906 | `frontend/src/hooks/admin/agencies/core/useAgencies.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 907 | `frontend/src/hooks/admin/agencies/core/useAgenciesManager.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 908 | `frontend/src/hooks/admin/agencies/core/useAgencyConfig.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 909 | `frontend/src/hooks/admin/agencies/core/useCockpitAgencyMembers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 910 | `frontend/src/hooks/admin/audit/useAuditLogs.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 911 | `frontend/src/hooks/admin/audit/useAuditLogsPanel.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 912 | `frontend/src/hooks/admin/users/access/useAdminUsers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 913 | `frontend/src/hooks/admin/users/access/useArchiveUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 914 | `frontend/src/hooks/admin/users/access/useBulkDeleteUsers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 915 | `frontend/src/hooks/admin/users/access/useDeleteUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 916 | `frontend/src/hooks/admin/users/access/useResetUserPassword.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 917 | `frontend/src/hooks/admin/users/access/useSetUserMemberships.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 918 | `frontend/src/hooks/admin/users/access/useSetUserRole.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 919 | `frontend/src/hooks/admin/users/access/useUnarchiveUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 920 | `frontend/src/hooks/admin/users/identity/useCreateAdminUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 921 | `frontend/src/hooks/admin/users/identity/useUpdateUserIdentity.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 922 | `frontend/src/hooks/admin/users/identity/useUserCreateDialog.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 923 | `frontend/src/hooks/admin/users/identity/useUsersManager.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 924 | `frontend/src/hooks/cockpit-utils/use-cockpit-pane-props.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 925 | `frontend/src/hooks/cockpit-utils/useCockpitPaneProps.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 926 | `frontend/src/hooks/cockpit-utils/useCockpitPhoneLookup.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 927 | `frontend/src/hooks/cockpit-utils/useCockpitRegisterFields.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 928 | `frontend/src/hooks/cockpit-utils/useCockpitRelationChange.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 929 | `frontend/src/hooks/cockpit-utils/useConfigSnapshot.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 930 | `frontend/src/hooks/cockpit-utils/useNotifyError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 931 | `frontend/src/hooks/cockpit/use-cockpit-derived-state.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 932 | `frontend/src/hooks/cockpit/useCockpitDerivedState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 933 | `frontend/src/hooks/cockpit/useCockpitDialogsState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 934 | `frontend/src/hooks/cockpit/useCockpitFormController.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 935 | `frontend/src/hooks/cockpit/useCockpitFormRefs.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 936 | `frontend/src/hooks/cockpit/useCockpitGuidedFlow.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 937 | `frontend/src/hooks/dashboard-state/getDashboardChannelIcon.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 938 | `frontend/src/hooks/dashboard-state/useDashboardScope.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 939 | `frontend/src/hooks/dashboard-state/useDashboardState.tsx` | Source / script | 2 | Pilotage partiel/pseudo-pipeline à rendre honnête |
| 940 | `frontend/src/hooks/dashboard-state/useDashboardStatusHelpers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 941 | `frontend/src/hooks/directory/company/useDirectoryCitySuggestions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 942 | `frontend/src/hooks/directory/company/useDirectoryCompanyDetails.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 943 | `frontend/src/hooks/directory/company/useDirectoryCompanySearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 944 | `frontend/src/hooks/directory/company/useKnownCompanies.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 945 | `frontend/src/hooks/directory/core/useDirectoryPage.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 946 | `frontend/src/hooks/directory/core/useDirectoryRecord.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 947 | `frontend/src/hooks/directory/core/useEntitySearchIndex.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 948 | `frontend/src/hooks/directory/core/useUnifiedEntitySearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 949 | `frontend/src/hooks/directory/duplicates/useDirectoryDuplicates.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 950 | `frontend/src/hooks/directory/options/useDirectoryOptionAgencies.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 951 | `frontend/src/hooks/directory/options/useDirectoryOptionCommercials.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 952 | `frontend/src/hooks/directory/options/useDirectoryOptionDepartments.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 953 | `frontend/src/hooks/directory/views/useDeleteDirectorySavedView.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 954 | `frontend/src/hooks/directory/views/useDirectorySavedViews.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 955 | `frontend/src/hooks/directory/views/useSaveDirectorySavedView.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 956 | `frontend/src/hooks/directory/views/useSetDefaultDirectorySavedView.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 957 | `frontend/src/hooks/entities/clients/useClientFormDialog.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 958 | `frontend/src/hooks/entities/clients/useClientFormDialogFields.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 959 | `frontend/src/hooks/entities/clients/useDeleteClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 960 | `frontend/src/hooks/entities/clients/useSaveClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 961 | `frontend/src/hooks/entities/clients/useSetClientArchived.ts` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 962 | `frontend/src/hooks/entities/contacts/use-entity-contact-actions.optimistic.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 963 | `frontend/src/hooks/entities/contacts/useClientContactDialog.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 964 | `frontend/src/hooks/entities/contacts/useEntityContactActions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 965 | `frontend/src/hooks/entities/contacts/useEntityContacts.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 966 | `frontend/src/hooks/entities/contacts/useSaveEntityContact.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 967 | `frontend/src/hooks/entities/prospects/useProspectFormDialog.ts` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 968 | `frontend/src/hooks/entities/prospects/useProspectFormDialogFields.ts` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 969 | `frontend/src/hooks/entities/prospects/useSaveProspect.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 970 | `frontend/src/hooks/entities/suppliers/useDeleteSupplier.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 971 | `frontend/src/hooks/entities/suppliers/useSaveSupplier.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 972 | `frontend/src/hooks/entities/suppliers/useSetSupplierArchived.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 973 | `frontend/src/hooks/interaction-draft/normalizeInteractionDraftValues.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 974 | `frontend/src/hooks/interactions/core/actions/useDeleteInteraction.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 975 | `frontend/src/hooks/interactions/core/actions/useInteractionSubmit.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 976 | `frontend/src/hooks/interactions/core/actions/useSaveInteraction.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 977 | `frontend/src/hooks/interactions/core/queries/__tests__/useRealtimeInteractions.test.tsx` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 978 | `frontend/src/hooks/interactions/core/queries/useEntityInteractions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 979 | `frontend/src/hooks/interactions/core/queries/useInteractionDetailsState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 980 | `frontend/src/hooks/interactions/core/queries/useInteractionSearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 981 | `frontend/src/hooks/interactions/core/queries/useInteractionStepper.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 982 | `frontend/src/hooks/interactions/core/queries/useInteractions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 983 | `frontend/src/hooks/interactions/core/queries/useRealtimeInteractions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 984 | `frontend/src/hooks/interactions/core/queries/useRecentOwnInteractions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 985 | `frontend/src/hooks/interactions/drafts/use-interaction-form-effects.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 986 | `frontend/src/hooks/interactions/drafts/use-interaction-form-state.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 987 | `frontend/src/hooks/interactions/drafts/useInteractionDraft.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 988 | `frontend/src/hooks/interactions/drafts/useInteractionFormEffects.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 989 | `frontend/src/hooks/interactions/drafts/useInteractionFormState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 990 | `frontend/src/hooks/interactions/drafts/useInteractionGateState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 991 | `frontend/src/hooks/interactions/handlers/use-interaction-handlers.types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 992 | `frontend/src/hooks/interactions/handlers/useInteractionFocus.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 993 | `frontend/src/hooks/interactions/handlers/useInteractionHandlers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 994 | `frontend/src/hooks/interactions/handlers/useInteractionHotkeys.ts` | Source / script | 2 | **P0 UI** — vues masquées/hotkeys et collisions de raccourcis |
| 995 | `frontend/src/hooks/interactions/handlers/useInteractionInvalidHandler.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 996 | `frontend/src/hooks/interactions/timeline/useAddTimelineEvent.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 997 | `frontend/src/hooks/session/useAppQueries.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 998 | `frontend/src/hooks/session/useAppSession.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 999 | `frontend/src/hooks/session/useAppSessionState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1000 | `frontend/src/hooks/session/useAppViewState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1001 | `frontend/src/hooks/session/useChangePasswordState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1002 | `frontend/src/hooks/session/useLoginScreenForm.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1003 | `frontend/src/hooks/settings-state/settingsFormSchema.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1004 | `frontend/src/hooks/settings-state/use-integrity-interaction-update.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1005 | `frontend/src/hooks/settings-state/use-reference-items.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1006 | `frontend/src/hooks/settings-state/use-reference-statuses.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1007 | `frontend/src/hooks/settings-state/use-settings-form.ts` | Source / script | 2 | brouillon/agence pouvant diverger |
| 1008 | `frontend/src/hooks/settings-state/use-settings-mutations.ts` | Source / script | 2 | brouillon/agence pouvant diverger |
| 1009 | `frontend/src/hooks/settings-state/use-settings-state.helpers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1010 | `frontend/src/hooks/settings-state/useSettingsState.ts` | Source / script | 2 | brouillon/agence pouvant diverger |
| 1011 | `frontend/src/hooks/tasks/useTasks.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1012 | `frontend/src/hooks/utils/useDebouncedValue.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1013 | `frontend/src/index.css` | Configuration / asset texte | 2 | dette design systémique (taille/couleur/transition/gradient) |
| 1014 | `frontend/src/lib/result.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1015 | `frontend/src/lib/utils.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1016 | `frontend/src/main.tsx` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1017 | `frontend/src/schemas/__tests__/interactionSchema.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1018 | `frontend/src/services/admin/__tests__/admin.rpc-services.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1019 | `frontend/src/services/admin/__tests__/getAdminUsers.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1020 | `frontend/src/services/admin/__tests__/getAuditLogs.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1021 | `frontend/src/services/admin/archiveAdminAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1022 | `frontend/src/services/admin/archiveAdminUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1023 | `frontend/src/services/admin/bulkDeleteAdminUsers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1024 | `frontend/src/services/admin/createAdminAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1025 | `frontend/src/services/admin/createAdminUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1026 | `frontend/src/services/admin/deleteAdminUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1027 | `frontend/src/services/admin/getAdminUsers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1028 | `frontend/src/services/admin/getAuditLogs.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1029 | `frontend/src/services/admin/hardDeleteAdminAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1030 | `frontend/src/services/admin/renameAdminAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1031 | `frontend/src/services/admin/resetAdminUserPassword.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1032 | `frontend/src/services/admin/setAdminUserMemberships.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1033 | `frontend/src/services/admin/setAdminUserRole.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1034 | `frontend/src/services/admin/unarchiveAdminAgency.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1035 | `frontend/src/services/admin/unarchiveAdminUser.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1036 | `frontend/src/services/admin/updateAdminUserIdentity.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1037 | `frontend/src/services/agency/__tests__/agency.supabase-services.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1038 | `frontend/src/services/agency/__tests__/getActiveAgencyContext.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1039 | `frontend/src/services/agency/__tests__/getAgencyMemberships.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1040 | `frontend/src/services/agency/agencyContextCache.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1041 | `frontend/src/services/agency/getActiveAgencyContext.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1042 | `frontend/src/services/agency/getActiveAgencyId.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1043 | `frontend/src/services/agency/getAgencies.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1044 | `frontend/src/services/agency/getAgencyMemberships.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1045 | `frontend/src/services/agency/getProfileActiveAgencyId.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1046 | `frontend/src/services/agency/setActiveAgencyId.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1047 | `frontend/src/services/agency/setProfileActiveAgencyId.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1048 | `frontend/src/services/ai.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1049 | `frontend/src/services/api/__tests__/safeTrpc.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1050 | `frontend/src/services/api/__tests__/trpcClient.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1051 | `frontend/src/services/api/invokeTrpc.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1052 | `frontend/src/services/api/safeTrpc.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1053 | `frontend/src/services/api/trpcClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1054 | `frontend/src/services/auth/__tests__/auth.core-services.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1055 | `frontend/src/services/auth/__tests__/signInWithPassword.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1056 | `frontend/src/services/auth/__tests__/signOut.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1057 | `frontend/src/services/auth/getCurrentUserId.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1058 | `frontend/src/services/auth/getCurrentUserLabel.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1059 | `frontend/src/services/auth/getProfile.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1060 | `frontend/src/services/auth/getSession.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1061 | `frontend/src/services/auth/onAuthStateChange.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1062 | `frontend/src/services/auth/setProfilePasswordChanged.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1063 | `frontend/src/services/auth/signInWithPassword.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1064 | `frontend/src/services/auth/signOut.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1065 | `frontend/src/services/auth/updateUserPassword.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1066 | `frontend/src/services/clients/deleteClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1067 | `frontend/src/services/clients/saveClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1068 | `frontend/src/services/clients/setClientArchived.ts` | Source / script | 2 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 1069 | `frontend/src/services/cockpit/getCockpitAgencyMembers.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1070 | `frontend/src/services/cockpit/getCockpitPhoneLookup.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1071 | `frontend/src/services/config/__tests__/getConfigSnapshot.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1072 | `frontend/src/services/config/__tests__/getConfigUsage.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1073 | `frontend/src/services/config/getAgencyConfig.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1074 | `frontend/src/services/config/getConfigIntegrityInteractions.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1075 | `frontend/src/services/config/getConfigSnapshot.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1076 | `frontend/src/services/config/getConfigUsage.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1077 | `frontend/src/services/config/index.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1078 | `frontend/src/services/config/saveConfigIntegrityInteractionUpdate.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1079 | `frontend/src/services/config/saveConfigReferenceAction.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1080 | `frontend/src/services/config/saveSettingsReferences.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1081 | `frontend/src/services/directory/__tests__/getDirectoryCompanyDetails.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1082 | `frontend/src/services/directory/__tests__/getDirectoryCompanySearch.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1083 | `frontend/src/services/directory/__tests__/getDirectoryDuplicates.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1084 | `frontend/src/services/directory/__tests__/getDirectoryPage.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1085 | `frontend/src/services/directory/deleteDirectorySavedView.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1086 | `frontend/src/services/directory/getDirectoryCompanyDetails.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1087 | `frontend/src/services/directory/getDirectoryCompanySearch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1088 | `frontend/src/services/directory/getDirectoryDuplicates.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1089 | `frontend/src/services/directory/getDirectoryOptionAgencies.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1090 | `frontend/src/services/directory/getDirectoryOptionCities.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1091 | `frontend/src/services/directory/getDirectoryOptionCommercials.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1092 | `frontend/src/services/directory/getDirectoryOptionDepartments.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1093 | `frontend/src/services/directory/getDirectoryPage.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1094 | `frontend/src/services/directory/getDirectoryRecord.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1095 | `frontend/src/services/directory/getDirectorySavedViews.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1096 | `frontend/src/services/directory/saveDirectorySavedView.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1097 | `frontend/src/services/directory/setDefaultDirectorySavedView.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1098 | `frontend/src/services/entities/__tests__/entities.rpc-services.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1099 | `frontend/src/services/entities/deleteEntityContact.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1100 | `frontend/src/services/entities/deleteSupplier.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1101 | `frontend/src/services/entities/getEntityContacts.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1102 | `frontend/src/services/entities/getEntitySearchIndex.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1103 | `frontend/src/services/entities/saveEntity.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1104 | `frontend/src/services/entities/saveEntityContact.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1105 | `frontend/src/services/entities/searchEntitiesUnified.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1106 | `frontend/src/services/entities/setSupplierArchived.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1107 | `frontend/src/services/entities/tierSurfaceRead.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1108 | `frontend/src/services/errors/AppError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1109 | `frontend/src/services/errors/__tests__/AppError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1110 | `frontend/src/services/errors/__tests__/handleUiError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1111 | `frontend/src/services/errors/__tests__/mapAdminDomainError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1112 | `frontend/src/services/errors/__tests__/mapEdgeError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1113 | `frontend/src/services/errors/__tests__/mapPostgrestError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1114 | `frontend/src/services/errors/__tests__/mapSettingsDomainError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1115 | `frontend/src/services/errors/__tests__/mapSupabaseAuthError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1116 | `frontend/src/services/errors/__tests__/mapTrpcError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1117 | `frontend/src/services/errors/__tests__/normalizeError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1118 | `frontend/src/services/errors/__tests__/notifyError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1119 | `frontend/src/services/errors/__tests__/reportError.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1120 | `frontend/src/services/errors/__tests__/sentryStub.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1121 | `frontend/src/services/errors/handleUiError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1122 | `frontend/src/services/errors/journal.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1123 | `frontend/src/services/errors/mapAdminDomainError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1124 | `frontend/src/services/errors/mapEdgeError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1125 | `frontend/src/services/errors/mapPostgrestError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1126 | `frontend/src/services/errors/mapSettingsDomainError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1127 | `frontend/src/services/errors/mapSupabaseAuthError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1128 | `frontend/src/services/errors/mapTrpcError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1129 | `frontend/src/services/errors/normalizeError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1130 | `frontend/src/services/errors/notify.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1131 | `frontend/src/services/errors/notifyError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1132 | `frontend/src/services/errors/notifyInfo.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1133 | `frontend/src/services/errors/notifySuccess.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1134 | `frontend/src/services/errors/reportError.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1135 | `frontend/src/services/errors/sentryStub.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1136 | `frontend/src/services/errors/source.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1137 | `frontend/src/services/interactions/__tests__/getInteractionsByEntity.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1138 | `frontend/src/services/interactions/__tests__/interactions.rpc-services.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1139 | `frontend/src/services/interactions/__tests__/validateInteractionDraft.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1140 | `frontend/src/services/interactions/addTimelineEvent.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1141 | `frontend/src/services/interactions/correctActivityV2.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1142 | `frontend/src/services/interactions/deleteInteraction.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1143 | `frontend/src/services/interactions/deleteInteractionDraft.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1144 | `frontend/src/services/interactions/generateId.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1145 | `frontend/src/services/interactions/getActivityV2.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1146 | `frontend/src/services/interactions/getInteractionDraft.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1147 | `frontend/src/services/interactions/getInteractions.ts` | Source / script | 2 | Pilotage partiel/pseudo-pipeline à rendre honnête |
| 1148 | `frontend/src/services/interactions/getInteractionsByEntity.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1149 | `frontend/src/services/interactions/getKnownCompanies.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1150 | `frontend/src/services/interactions/hydrateTimeline.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1151 | `frontend/src/services/interactions/interactionDraftPayload.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1152 | `frontend/src/services/interactions/saveInteraction.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1153 | `frontend/src/services/interactions/saveInteractionDraft.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1154 | `frontend/src/services/interactions/updateInteractionOptimistic.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1155 | `frontend/src/services/interactions/validateInteractionDraft.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1156 | `frontend/src/services/pricingReferences.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1157 | `frontend/src/services/query/__tests__/queryClient.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1158 | `frontend/src/services/query/__tests__/queryInvalidation.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1159 | `frontend/src/services/query/__tests__/queryKeys.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1160 | `frontend/src/services/query/__tests__/queryPrefetch.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1161 | `frontend/src/services/query/queryClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1162 | `frontend/src/services/query/queryInvalidation.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1163 | `frontend/src/services/query/queryKeys.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1164 | `frontend/src/services/query/queryPrefetch.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1165 | `frontend/src/services/supabase/__tests__/memoryStorage.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1166 | `frontend/src/services/supabase/getSupabaseClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1167 | `frontend/src/services/supabase/memoryStorage.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1168 | `frontend/src/services/supabase/requireSupabaseClient.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1169 | `frontend/src/services/tasks/tasks.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1170 | `frontend/src/stores/errorStore.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1171 | `frontend/src/types.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1172 | `frontend/src/types/app-session.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1173 | `frontend/src/utils/audit/formatAuditMetadata.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1174 | `frontend/src/utils/clients/formatClientNumber.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1175 | `frontend/src/utils/dashboard/__tests__/dashboardAggregates.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1176 | `frontend/src/utils/dashboard/__tests__/dashboardFilters.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1177 | `frontend/src/utils/dashboard/__tests__/dashboardOverview.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1178 | `frontend/src/utils/dashboard/__tests__/dashboardPipeline.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1179 | `frontend/src/utils/dashboard/__tests__/dashboardSort.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1180 | `frontend/src/utils/dashboard/dashboardAggregates.ts` | Source / script | 2 | Pilotage partiel/pseudo-pipeline à rendre honnête |
| 1181 | `frontend/src/utils/dashboard/dashboardFilters.ts` | Source / script | 2 | Pilotage partiel/pseudo-pipeline à rendre honnête |
| 1182 | `frontend/src/utils/dashboard/dashboardOverview.ts` | Source / script | 2 | Pilotage partiel/pseudo-pipeline à rendre honnête |
| 1183 | `frontend/src/utils/dashboard/dashboardPipeline.ts` | Source / script | 2 | Pilotage partiel/pseudo-pipeline à rendre honnête |
| 1184 | `frontend/src/utils/dashboard/dashboardSort.ts` | Source / script | 2 | Pilotage partiel/pseudo-pipeline à rendre honnête |
| 1185 | `frontend/src/utils/date/__tests__/formatRelativeTime.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1186 | `frontend/src/utils/date/formatDate.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1187 | `frontend/src/utils/date/formatRelativeTime.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1188 | `frontend/src/utils/date/formatTime.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1189 | `frontend/src/utils/date/getNowIsoString.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1190 | `frontend/src/utils/date/toDate.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1191 | `frontend/src/utils/date/toTimestamp.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1192 | `frontend/src/utils/formatFrenchPhone.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1193 | `frontend/src/utils/interactions/__tests__/buildInteractionEvents.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1194 | `frontend/src/utils/interactions/__tests__/getInteractionGateState.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1195 | `frontend/src/utils/interactions/__tests__/upsertInteractionInList.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1196 | `frontend/src/utils/interactions/buildInteractionEvents.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1197 | `frontend/src/utils/interactions/getInteractionDisplayName.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1198 | `frontend/src/utils/interactions/getInteractionGateState.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1199 | `frontend/src/utils/interactions/upsertInteractionInList.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1200 | `frontend/src/utils/recordNarrowing/isRecord.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1201 | `frontend/src/utils/recordNarrowing/readBoolean.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1202 | `frontend/src/utils/recordNarrowing/readObject.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1203 | `frontend/src/utils/recordNarrowing/readString.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1204 | `frontend/src/utils/references/__tests__/resolveReferenceLabel.test.ts` | Test | 2 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1205 | `frontend/src/utils/references/resolveReferenceLabel.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1206 | `frontend/src/utils/toJsonValue.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1207 | `frontend/src/utils/typeGuards.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1208 | `frontend/src/vite-env.d.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1209 | `frontend/tailwind.config.cjs` | Configuration / asset texte | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1210 | `frontend/tsconfig.json` | Configuration / asset texte | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1211 | `frontend/vite.config.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1212 | `frontend/vitest.config.ts` | Source / script | 2 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1213 | `lint-staged.config.mjs` | Source / script | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1214 | `package.json` | Configuration / asset texte | 3 | gates audit/intégration/unused à réaligner |
| 1215 | `pnpm-lock.yaml` | Configuration / asset texte | 3 | dépendances XLSX/ZIP et limites à corriger |
| 1216 | `pnpm-workspace.yaml` | Configuration / asset texte | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1217 | `scripts/check-repo-state.mjs` | Source / script | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1218 | `scripts/codex-cockpit.ps1` | Source / script | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1219 | `scripts/generate-trpc-contract.mjs` | Source / script | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1220 | `scripts/qa-gate.ps1` | Source / script | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1221 | `scripts/run-backend-integration-tests.mjs` | Source / script | 3 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 1222 | `scripts/servy/CIR-Cockpit-API.json` | Configuration / asset texte | 3 | **RISQUE LOCAL ACCEPTÉ** — lanceur de développement `LocalSystem`, hors roadmap produit |
| 1223 | `scripts/servy/CIR_Cockpit.json` | Configuration / asset texte | 3 | **RISQUE LOCAL ACCEPTÉ** — lanceur frontend de développement `LocalSystem`, hors roadmap produit |
| 1224 | `shared/api/trpc.generated.d.ts` | Source / script | 1 | **CONSERVER / GÉNÉRÉ** — ne pas éditer à la main |
| 1225 | `shared/constants/ai.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1226 | `shared/errors/__tests__/fingerprint.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1227 | `shared/errors/catalog.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1228 | `shared/errors/fingerprint.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1229 | `shared/errors/index.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1230 | `shared/errors/types.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1231 | `shared/package.json` | Configuration / asset texte | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1232 | `shared/reference/officialLabels.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1233 | `shared/reference/systemInteractionValues.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1234 | `shared/schemas/__tests__/activity-v2.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1235 | `shared/schemas/__tests__/api-responses.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1236 | `shared/schemas/__tests__/client-contact.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1237 | `shared/schemas/__tests__/client.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1238 | `shared/schemas/__tests__/config.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1239 | `shared/schemas/__tests__/convert-client.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1240 | `shared/schemas/__tests__/prospect.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1241 | `shared/schemas/__tests__/task-api.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1242 | `shared/schemas/__tests__/task-foundation.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1243 | `shared/schemas/__tests__/tier-foundation.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1244 | `shared/schemas/__tests__/tier-v1.schema.test.ts` | Test | 1 | REVU — suite/structure couverte, aucun écart autonome isolé |
| 1245 | `shared/schemas/admin/agency.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1246 | `shared/schemas/admin/auth.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1247 | `shared/schemas/admin/department.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1248 | `shared/schemas/admin/user.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1249 | `shared/schemas/ai.schema.ts` | Source / script | 1 | validation `base_url`/clé fournisseur ; séparation seulement au prochain changement |
| 1250 | `shared/schemas/aiAssistant.schema.ts` | Source / script | 1 | **CANDIDAT À SUPPRIMER** — aucun consommateur interne détecté ; gate externe requise, Étape 3 |
| 1251 | `shared/schemas/entity/client-contact.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1252 | `shared/schemas/entity/client.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1253 | `shared/schemas/entity/convert-client.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1254 | `shared/schemas/entity/prospect.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1255 | `shared/schemas/entity/supplier.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1256 | `shared/schemas/entity/tier-foundation.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1257 | `shared/schemas/interaction/activity-v2.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1258 | `shared/schemas/interaction/cockpit.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1259 | `shared/schemas/interaction/interaction.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1260 | `shared/schemas/interaction/stages.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1261 | `shared/schemas/interaction/tier-v1.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1262 | `shared/schemas/pricing/references.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1263 | `shared/schemas/system/api-responses.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1264 | `shared/schemas/system/config.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1265 | `shared/schemas/system/data.schema.ts` | Source / script | 1 | upsert/ownership/version inter-agence à corriger |
| 1266 | `shared/schemas/system/directory.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1267 | `shared/schemas/system/edge-error.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1268 | `shared/schemas/task/task-api.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1269 | `shared/schemas/task/task-foundation.schema.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1270 | `shared/search/companySearch.ts` | Source / script | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1271 | `shared/supabase.types.ts` | Source / script | 1 | **CONSERVER / GÉNÉRÉ** — ne pas éditer à la main |
| 1272 | `skills-lock.json` | Configuration / asset texte | 3 | REVU — aucun écart autonome isolé par les contrôles exécutés |
| 1273 | `supabase/config.toml` | Configuration / asset texte | 1 | REVU — aucun écart autonome isolé par les contrôles exécutés |

## Contrôle de complétude

- Lignes du registre : **1273**.
- Fichiers suivis du snapshot : **1273**.
- Fichiers au contenu strictement identique : **0 groupe**.
- Les 143 migrations SQL sont conservées comme historique immuable.
- Les sources binaires métier ne sont pas assimilées à du code mort parce qu’elles n’ont pas d’import TypeScript.
