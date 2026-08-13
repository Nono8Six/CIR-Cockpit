export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          agency_id: string
          archived_at: string | null
          author_id: string
          channel: string
          contact_id: string | null
          corrected_at: string | null
          created_at: string
          created_by: string
          id: string
          legacy_interaction_id: string | null
          legacy_updated_by_raw: string | null
          lifecycle_status: string
          occurred_at: string
          organization_id: string | null
          report: string | null
          subject: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          activity_type: string
          agency_id: string
          archived_at?: string | null
          author_id: string
          channel: string
          contact_id?: string | null
          corrected_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          legacy_interaction_id?: string | null
          legacy_updated_by_raw?: string | null
          lifecycle_status?: string
          occurred_at: string
          organization_id?: string | null
          report?: string | null
          subject: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          activity_type?: string
          agency_id?: string
          archived_at?: string | null
          author_id?: string
          channel?: string
          contact_id?: string | null
          corrected_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          legacy_interaction_id?: string | null
          legacy_updated_by_raw?: string | null
          lifecycle_status?: string
          occurred_at?: string
          organization_id?: string | null
          report?: string | null
          subject?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "activities_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_organization_fkey"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "entity_contacts"
            referencedColumns: ["id", "entity_id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_legacy_interaction_id_fkey"
            columns: ["legacy_interaction_id"]
            isOneToOne: true
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_attachments: {
        Row: {
          activity_id: string
          agency_id: string
          byte_size: number | null
          checksum_sha256: string | null
          created_at: string
          created_by: string
          file_name: string
          id: string
          mime_type: string | null
          source_id: string | null
          storage_bucket: string | null
          storage_object_path: string | null
        }
        Insert: {
          activity_id: string
          agency_id: string
          byte_size?: number | null
          checksum_sha256?: string | null
          created_at?: string
          created_by: string
          file_name: string
          id?: string
          mime_type?: string | null
          source_id?: string | null
          storage_bucket?: string | null
          storage_object_path?: string | null
        }
        Update: {
          activity_id?: string
          agency_id?: string
          byte_size?: number | null
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          source_id?: string | null
          storage_bucket?: string | null
          storage_object_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_attachments_activity_agency_fkey"
            columns: ["activity_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "activity_attachments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attachments_source_fkey"
            columns: ["source_id", "activity_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "activity_sources"
            referencedColumns: ["id", "activity_id", "agency_id"]
          },
        ]
      }
      activity_corrections: {
        Row: {
          activity_id: string
          activity_version: number
          agency_id: string
          corrected_at: string
          corrected_by: string
          field_name: string
          id: string
          new_value: string | null
          previous_value: string | null
          reason: string | null
        }
        Insert: {
          activity_id: string
          activity_version: number
          agency_id: string
          corrected_at?: string
          corrected_by: string
          field_name: string
          id?: string
          new_value?: string | null
          previous_value?: string | null
          reason?: string | null
        }
        Update: {
          activity_id?: string
          activity_version?: number
          agency_id?: string
          corrected_at?: string
          corrected_by?: string
          field_name?: string
          id?: string
          new_value?: string | null
          previous_value?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_corrections_activity_agency_fkey"
            columns: ["activity_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "activity_corrections_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_history_events: {
        Row: {
          activity_id: string
          agency_id: string
          author_id: string | null
          author_label_raw: string | null
          content: string
          created_at: string
          event_domain: string
          event_order: number
          event_type: string
          id: string
          legacy_event_id: string | null
          occurred_at: string | null
          raw_event: Json | null
        }
        Insert: {
          activity_id: string
          agency_id: string
          author_id?: string | null
          author_label_raw?: string | null
          content: string
          created_at?: string
          event_domain: string
          event_order: number
          event_type: string
          id?: string
          legacy_event_id?: string | null
          occurred_at?: string | null
          raw_event?: Json | null
        }
        Update: {
          activity_id?: string
          agency_id?: string
          author_id?: string | null
          author_label_raw?: string | null
          content?: string
          created_at?: string
          event_domain?: string
          event_order?: number
          event_type?: string
          id?: string
          legacy_event_id?: string | null
          occurred_at?: string | null
          raw_event?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_history_events_activity_agency_fkey"
            columns: ["activity_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "activity_history_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_history_events_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: string
          agency_id: string
          created_at: string
          created_by: string
          external_contact_id: string | null
          id: string
          internal_profile_id: string | null
          organization_id: string | null
          participant_kind: string
          participant_role: string
        }
        Insert: {
          activity_id: string
          agency_id: string
          created_at?: string
          created_by: string
          external_contact_id?: string | null
          id?: string
          internal_profile_id?: string | null
          organization_id?: string | null
          participant_kind: string
          participant_role?: string
        }
        Update: {
          activity_id?: string
          agency_id?: string
          created_at?: string
          created_by?: string
          external_contact_id?: string | null
          id?: string
          internal_profile_id?: string | null
          organization_id?: string | null
          participant_kind?: string
          participant_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_agency_fkey"
            columns: ["activity_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "activity_participants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_external_contact_fkey"
            columns: ["external_contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "entity_contacts"
            referencedColumns: ["id", "entity_id"]
          },
          {
            foreignKeyName: "activity_participants_internal_profile_id_fkey"
            columns: ["internal_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sources: {
        Row: {
          activity_id: string
          agency_id: string
          captured_at: string
          created_at: string
          created_by: string
          id: string
          source_label: string | null
          source_reference: string
          source_type: string
        }
        Insert: {
          activity_id: string
          agency_id: string
          captured_at: string
          created_at?: string
          created_by: string
          id?: string
          source_label?: string | null
          source_reference: string
          source_type: string
        }
        Update: {
          activity_id?: string
          agency_id?: string
          captured_at?: string
          created_at?: string
          created_by?: string
          id?: string
          source_label?: string | null
          source_reference?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sources_activity_agency_fkey"
            columns: ["activity_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "activity_sources_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_entities: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_entities_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_families: {
        Row: {
          agency_id: string
          archived_at: string | null
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          archived_at?: string | null
          created_at?: string
          id?: string
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_families_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_interaction_types: {
        Row: {
          agency_id: string
          archived_at: string | null
          created_at: string
          id: string
          label: string
          requires_product_families: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          archived_at?: string | null
          created_at?: string
          id?: string
          label: string
          requires_product_families?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          label?: string
          requires_product_families?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_interaction_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_reference_resolutions: {
        Row: {
          agency_id: string
          dimension: string
          id: string
          resolved_at: string
          resolved_by: string | null
          source_label: string
          target_family_id: string | null
          target_interaction_type_id: string | null
          target_service_id: string | null
          target_status_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          dimension: string
          id?: string
          resolved_at?: string
          resolved_by?: string | null
          source_label: string
          target_family_id?: string | null
          target_interaction_type_id?: string | null
          target_service_id?: string | null
          target_status_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          dimension?: string
          id?: string
          resolved_at?: string
          resolved_by?: string | null
          source_label?: string
          target_family_id?: string | null
          target_interaction_type_id?: string | null
          target_service_id?: string | null
          target_status_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_reference_resolutions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_reference_resolutions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_reference_resolutions_target_family_id_fkey"
            columns: ["target_family_id"]
            isOneToOne: false
            referencedRelation: "agency_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_reference_resolutions_target_interaction_type_id_fkey"
            columns: ["target_interaction_type_id"]
            isOneToOne: false
            referencedRelation: "agency_interaction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_reference_resolutions_target_service_id_fkey"
            columns: ["target_service_id"]
            isOneToOne: false
            referencedRelation: "agency_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_reference_resolutions_target_status_id_fkey"
            columns: ["target_status_id"]
            isOneToOne: false
            referencedRelation: "agency_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_services: {
        Row: {
          agency_id: string
          archived_at: string | null
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          archived_at?: string | null
          created_at?: string
          id?: string
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_services_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_settings: {
        Row: {
          agency_id: string
          created_at: string
          onboarding: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          onboarding?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          onboarding?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_statuses: {
        Row: {
          agency_id: string
          category: string
          created_at: string
          deactivated_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          is_terminal: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          category?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_terminal?: boolean
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          category?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_terminal?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_statuses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_system_users: {
        Row: {
          agency_id: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_system_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_system_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feature_grants: {
        Row: {
          agency_id: string | null
          allowed: boolean
          created_at: string
          created_by: string | null
          feature: string
          id: string
          scope: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          allowed?: boolean
          created_at?: string
          created_by?: string | null
          feature: string
          id?: string
          scope: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          allowed?: boolean
          created_at?: string
          created_by?: string | null
          feature?: string
          id?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_grants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_grants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feature_model_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          feature: string
          model_config_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          feature: string
          model_config_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          feature?: string
          model_config_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_model_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_model_assignments_model_config_id_fkey"
            columns: ["model_config_id"]
            isOneToOne: false
            referencedRelation: "ai_model_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_model_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_configs: {
        Row: {
          cached_input_price_per_million: number | null
          created_at: string
          created_by: string | null
          currency: string
          enabled: boolean
          id: string
          input_price_per_million: number | null
          is_default: boolean
          label: string
          max_output_tokens: number
          model_id: string
          output_price_per_million: number | null
          price_effective_at: string | null
          provider: string
          provider_config_id: string
          reasoning_price_per_million: number | null
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cached_input_price_per_million?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          enabled?: boolean
          id?: string
          input_price_per_million?: number | null
          is_default?: boolean
          label: string
          max_output_tokens?: number
          model_id: string
          output_price_per_million?: number | null
          price_effective_at?: string | null
          provider: string
          provider_config_id: string
          reasoning_price_per_million?: number | null
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cached_input_price_per_million?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          enabled?: boolean
          id?: string
          input_price_per_million?: number | null
          is_default?: boolean
          label?: string
          max_output_tokens?: number
          model_id?: string
          output_price_per_million?: number | null
          price_effective_at?: string | null
          provider?: string
          provider_config_id?: string
          reasoning_price_per_million?: number | null
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_configs_provider_config_id_fkey"
            columns: ["provider_config_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_templates: {
        Row: {
          allowed_variables: string[]
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          feature: string
          id: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_variables?: string[]
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          feature: string
          id?: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_variables?: string[]
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          feature?: string
          id?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_prompt_versions: {
        Row: {
          body: string
          change_note: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          published_by: string | null
          status: string
          template_id: string
          version: number
        }
        Insert: {
          body: string
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          template_id: string
          version: number
        }
        Update: {
          body?: string
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_configs: {
        Row: {
          api_key_hash: string | null
          api_key_last4: string | null
          base_url: string | null
          created_at: string
          created_by: string | null
          enabled: boolean
          encrypted_api_key: string | null
          id: string
          label: string
          last_error_code: string | null
          last_error_message: string | null
          last_test_at: string | null
          last_test_status: string | null
          organization_id: string | null
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_hash?: string | null
          api_key_last4?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          encrypted_api_key?: string | null
          id?: string
          label: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_test_at?: string | null
          last_test_status?: string | null
          organization_id?: string | null
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_hash?: string | null
          api_key_last4?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          encrypted_api_key?: string | null
          id?: string
          label?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_test_at?: string | null
          last_test_status?: string | null
          organization_id?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_quota_policies: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          daily_call_limit: number | null
          daily_cost_limit: number | null
          daily_token_limit: number | null
          enabled: boolean
          feature: string | null
          id: string
          monthly_call_limit: number | null
          monthly_cost_limit: number | null
          monthly_token_limit: number | null
          scope: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          daily_call_limit?: number | null
          daily_cost_limit?: number | null
          daily_token_limit?: number | null
          enabled?: boolean
          feature?: string | null
          id?: string
          monthly_call_limit?: number | null
          monthly_cost_limit?: number | null
          monthly_token_limit?: number | null
          scope: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          daily_call_limit?: number | null
          daily_cost_limit?: number | null
          daily_token_limit?: number | null
          enabled?: boolean
          feature?: string | null
          id?: string
          monthly_call_limit?: number | null
          monthly_cost_limit?: number | null
          monthly_token_limit?: number | null
          scope?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_request_reservations: {
        Row: {
          actual_cost_amount: number | null
          actual_tokens: number | null
          agency_id: string | null
          client_request_id: string
          created_at: string
          error_code: string | null
          error_message: string | null
          estimated_cost_amount: number
          estimated_tokens: number
          expires_at: string
          feature: string
          id: string
          response: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost_amount?: number | null
          actual_tokens?: number | null
          agency_id?: string | null
          client_request_id: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost_amount: number
          estimated_tokens: number
          expires_at: string
          feature: string
          id?: string
          response?: Json | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost_amount?: number | null
          actual_tokens?: number | null
          agency_id?: string | null
          client_request_id?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost_amount?: number
          estimated_tokens?: number
          expires_at?: string
          feature?: string
          id?: string
          response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          feature: string
          id: string
          input_hash: string
          model_id: string
          prompt_version_id: string | null
          provider: string
          response: Json
          usage: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          feature: string
          id?: string
          input_hash: string
          model_id: string
          prompt_version_id?: string | null
          provider: string
          response: Json
          usage?: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          feature?: string
          id?: string
          input_hash?: string
          model_id?: string
          prompt_version_id?: string | null
          provider?: string
          response?: Json
          usage?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_cache_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_daily_aggregates: {
        Row: {
          agency_id: string | null
          cached_input_tokens: number
          calls: number
          cost_amount: number
          created_at: string
          currency: string
          feature: string
          id: string
          input_tokens: number
          model_id: string
          output_tokens: number
          provider: string
          reasoning_tokens: number
          status: string
          updated_at: string
          usage_date: string
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          cached_input_tokens?: number
          calls?: number
          cost_amount?: number
          created_at?: string
          currency?: string
          feature: string
          id?: string
          input_tokens?: number
          model_id: string
          output_tokens?: number
          provider: string
          reasoning_tokens?: number
          status: string
          updated_at?: string
          usage_date: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          cached_input_tokens?: number
          calls?: number
          cost_amount?: number
          created_at?: string
          currency?: string
          feature?: string
          id?: string
          input_tokens?: number
          model_id?: string
          output_tokens?: number
          provider?: string
          reasoning_tokens?: number
          status?: string
          updated_at?: string
          usage_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          agency_id: string | null
          cache_hit: boolean
          cached_input_tokens: number
          cost_amount: number | null
          created_at: string
          currency: string
          error_code: string | null
          error_message: string | null
          feature: string
          id: string
          input_tokens: number
          latency_ms: number | null
          metadata: Json
          model_config_id: string | null
          model_id: string
          output_tokens: number
          prompt_version_id: string | null
          provider: string
          reasoning_tokens: number
          request_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          cache_hit?: boolean
          cached_input_tokens?: number
          cost_amount?: number | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          feature: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json
          model_config_id?: string | null
          model_id: string
          output_tokens?: number
          prompt_version_id?: string | null
          provider: string
          reasoning_tokens?: number
          request_id: string
          status: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          cache_hit?: boolean
          cached_input_tokens?: number
          cost_amount?: number | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json
          model_config_id?: string | null
          model_id?: string
          output_tokens?: number
          prompt_version_id?: string | null
          provider?: string
          reasoning_tokens?: number
          request_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_model_config_id_fkey"
            columns: ["model_config_id"]
            isOneToOne: false
            referencedRelation: "ai_model_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          feature_flags: Json
          id: number
          onboarding: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_flags: Json
          id: number
          onboarding: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_flags?: Json
          id?: number
          onboarding?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_is_super_admin: boolean
          agency_id: string | null
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_is_super_admin?: boolean
          agency_id?: string | null
          created_at?: string
          entity_id: string
          entity_table: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_is_super_admin?: boolean
          agency_id?: string | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_archive: {
        Row: {
          action: string
          actor_id: string | null
          actor_is_super_admin: boolean
          agency_id: string | null
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_is_super_admin?: boolean
          agency_id?: string | null
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_is_super_admin?: boolean
          agency_id?: string | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_archive_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_archive_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profile_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cir_agencies: {
        Row: {
          archived_at: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          region: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_account_secondary_commercials: {
        Row: {
          commercial_id: string
          created_at: string
          created_by: string | null
          customer_account_id: string
          id: string
        }
        Insert: {
          commercial_id: string
          created_at?: string
          created_by?: string | null
          customer_account_id: string
          id?: string
        }
        Update: {
          commercial_id?: string
          created_at?: string
          created_by?: string | null
          customer_account_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_account_secondary_commercials_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_account_secondary_commercials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_account_secondary_commercials_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_accounts: {
        Row: {
          account_status: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          agency_id: string
          archived_at: string | null
          client_number: string
          created_at: string
          created_by: string | null
          entity_id: string
          id: string
          number_authority: string
          primary_commercial_id: string | null
          source_record_id: string
          source_synced_at: string | null
          source_system: string
          status_authority: string
          updated_at: string
        }
        Insert: {
          account_status?: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          agency_id: string
          archived_at?: string | null
          client_number: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          id?: string
          number_authority?: string
          primary_commercial_id?: string | null
          source_record_id: string
          source_synced_at?: string | null
          source_system: string
          status_authority?: string
          updated_at?: string
        }
        Update: {
          account_status?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          agency_id?: string
          archived_at?: string | null
          client_number?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          id?: string
          number_authority?: string
          primary_commercial_id?: string | null
          source_record_id?: string
          source_synced_at?: string | null
          source_system?: string
          status_authority?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_accounts_primary_commercial_id_fkey"
            columns: ["primary_commercial_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_saved_views: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          state: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_saved_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          address: string | null
          agency_id: string | null
          archived_at: string | null
          cir_agency_id: string | null
          cir_commercial_id: string | null
          city: string | null
          client_kind: string | null
          client_number: string | null
          country: string
          created_at: string
          created_by: string | null
          department: string | null
          entity_type: string
          first_name: string | null
          id: string
          last_name: string | null
          legal_form_code: string | null
          naf_code: string | null
          name: string
          notes: string | null
          official_data_source: string | null
          official_data_synced_at: string | null
          official_name: string | null
          postal_code: string | null
          primary_email: string | null
          primary_phone: string | null
          siren: string | null
          siret: string | null
          supplier_code: string | null
          supplier_number: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          address?: string | null
          agency_id?: string | null
          archived_at?: string | null
          cir_agency_id?: string | null
          cir_commercial_id?: string | null
          city?: string | null
          client_kind?: string | null
          client_number?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          entity_type: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          legal_form_code?: string | null
          naf_code?: string | null
          name: string
          notes?: string | null
          official_data_source?: string | null
          official_data_synced_at?: string | null
          official_name?: string | null
          postal_code?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          siren?: string | null
          siret?: string | null
          supplier_code?: string | null
          supplier_number?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          address?: string | null
          agency_id?: string | null
          archived_at?: string | null
          cir_agency_id?: string | null
          cir_commercial_id?: string | null
          city?: string | null
          client_kind?: string | null
          client_number?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          entity_type?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          legal_form_code?: string | null
          naf_code?: string | null
          name?: string
          notes?: string | null
          official_data_source?: string | null
          official_data_synced_at?: string | null
          official_name?: string | null
          postal_code?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          siren?: string | null
          siret?: string | null
          supplier_code?: string | null
          supplier_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_cir_agency_id_fkey"
            columns: ["cir_agency_id"]
            isOneToOne: false
            referencedRelation: "cir_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_cir_commercial_id_fkey"
            columns: ["cir_commercial_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_contacts: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string | null
          entity_id: string
          first_name: string | null
          id: string
          is_primary: boolean
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          service_label: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          entity_id: string
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          service_label?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          entity_id?: string
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          service_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_contacts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_drafts: {
        Row: {
          agency_id: string
          created_at: string
          form_type: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          form_type?: string
          id?: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          form_type?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_drafts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          agency_id: string | null
          amount: number | null
          channel: string
          company_name: string
          contact_email: string | null
          contact_id: string | null
          contact_name: string
          contact_phone: string | null
          contact_service: string
          created_at: string
          created_by: string
          entity_id: string | null
          entity_type: string
          id: string
          interaction_type: string
          last_action_at: string
          lost_reason: string | null
          mega_families: string[]
          notes: string | null
          order_ref: string | null
          quote_sent_at: string | null
          stage: string | null
          stage_changed_at: string | null
          status: string
          status_id: string | null
          status_is_terminal: boolean
          subject: string
          timeline: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency_id?: string | null
          amount?: number | null
          channel: string
          company_name: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_service: string
          created_at?: string
          created_by: string
          entity_id?: string | null
          entity_type: string
          id: string
          interaction_type?: string
          last_action_at?: string
          lost_reason?: string | null
          mega_families?: string[]
          notes?: string | null
          order_ref?: string | null
          quote_sent_at?: string | null
          stage?: string | null
          stage_changed_at?: string | null
          status: string
          status_id?: string | null
          status_is_terminal?: boolean
          subject: string
          timeline?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency_id?: string | null
          amount?: number | null
          channel?: string
          company_name?: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_service?: string
          created_at?: string
          created_by?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          interaction_type?: string
          last_action_at?: string
          lost_reason?: string | null
          mega_families?: string[]
          notes?: string | null
          order_ref?: string | null
          quote_sent_at?: string | null
          stage?: string | null
          stage_changed_at?: string | null
          status?: string
          status_id?: string | null
          status_is_terminal?: boolean
          subject?: string
          timeline?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "entity_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "agency_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_business_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          id: string
          is_primary: boolean
          profile_code: string
          source_record_id: string
          source_system: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          id?: string
          is_primary?: boolean
          profile_code: string
          source_record_id: string
          source_system: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          id?: string
          is_primary?: boolean
          profile_code?: string
          source_record_id?: string
          source_system?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_business_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_business_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_business_profiles_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "business_profile_types"
            referencedColumns: ["code"]
          },
        ]
      }
      pricing_classification_cir: {
        Row: {
          cir_key: string
          created_at: string
          fam: string
          fam_lib: string
          id: string
          import_id: string
          mega: string
          mega_lib: string
          normalized_values: Json
          raw_values: Json
          sfa: string
          sfa_lib: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
        }
        Insert: {
          cir_key: string
          created_at?: string
          fam: string
          fam_lib: string
          id?: string
          import_id: string
          mega: string
          mega_lib: string
          normalized_values?: Json
          raw_values?: Json
          sfa: string
          sfa_lib: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
        }
        Update: {
          cir_key?: string
          created_at?: string
          fam?: string
          fam_lib?: string
          id?: string
          import_id?: string
          mega?: string
          mega_lib?: string
          normalized_values?: Json
          raw_values?: Json
          sfa?: string
          sfa_lib?: string
          snapshot_id?: string
          source_file_id?: string
          source_row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_classification_cir_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_classification_cir_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_classification_cir_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_import_files"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_reference_anomalies: {
        Row: {
          columns: string[]
          created_at: string
          details: Json
          id: string
          import_id: string
          message: string
          object_id: string | null
          object_type: string | null
          severity: string
          snapshot_id: string | null
          source_file_id: string | null
          source_row_number: number | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          columns?: string[]
          created_at?: string
          details?: Json
          id?: string
          import_id: string
          message: string
          object_id?: string | null
          object_type?: string | null
          severity: string
          snapshot_id?: string | null
          source_file_id?: string | null
          source_row_number?: number | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          columns?: string[]
          created_at?: string
          details?: Json
          id?: string
          import_id?: string
          message?: string
          object_id?: string | null
          object_type?: string | null
          severity?: string
          snapshot_id?: string | null
          source_file_id?: string | null
          source_row_number?: number | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_reference_anomalies_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_anomalies_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_anomalies_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_import_files"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_reference_column_mapping_profiles: {
        Row: {
          aliases: Json
          column_mapping: Json
          created_at: string
          created_by: string | null
          file_kind: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aliases?: Json
          column_mapping?: Json
          created_at?: string
          created_by?: string | null
          file_kind: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aliases?: Json
          column_mapping?: Json
          created_at?: string
          created_by?: string | null
          file_kind?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_reference_column_mapping_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_column_mapping_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_reference_diff_runs: {
        Row: {
          base_snapshot_id: string | null
          computed_at: string
          id: string
          initial_import: boolean
          skipped_file_kinds: string[]
          status: string
          summary: Json
          target_snapshot_id: string
        }
        Insert: {
          base_snapshot_id?: string | null
          computed_at?: string
          id?: string
          initial_import?: boolean
          skipped_file_kinds?: string[]
          status?: string
          summary?: Json
          target_snapshot_id: string
        }
        Update: {
          base_snapshot_id?: string | null
          computed_at?: string
          id?: string
          initial_import?: boolean
          skipped_file_kinds?: string[]
          status?: string
          summary?: Json
          target_snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_reference_diff_runs_base_snapshot_id_fkey"
            columns: ["base_snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_diff_runs_target_snapshot_id_fkey"
            columns: ["target_snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_reference_diffs: {
        Row: {
          base_snapshot_id: string | null
          changed_columns: string[]
          created_at: string
          diff_type: string
          id: string
          object_key: string
          object_type: string
          payload: Json
          severity: string
          target_snapshot_id: string
        }
        Insert: {
          base_snapshot_id?: string | null
          changed_columns?: string[]
          created_at?: string
          diff_type: string
          id?: string
          object_key: string
          object_type: string
          payload?: Json
          severity: string
          target_snapshot_id: string
        }
        Update: {
          base_snapshot_id?: string | null
          changed_columns?: string[]
          created_at?: string
          diff_type?: string
          id?: string
          object_key?: string
          object_type?: string
          payload?: Json
          severity?: string
          target_snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_reference_diffs_base_snapshot_id_fkey"
            columns: ["base_snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_diffs_target_snapshot_id_fkey"
            columns: ["target_snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_reference_import_files: {
        Row: {
          column_mapping: Json
          content_type: string | null
          created_at: string
          detected_columns: string[]
          file_kind: string
          id: string
          import_id: string
          mapping_confirmed_at: string | null
          mapping_confirmed_by: string | null
          mapping_profile_id: string | null
          mapping_status: string
          original_filename: string
          row_count: number | null
          sha256: string
          sheet_name: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          column_mapping?: Json
          content_type?: string | null
          created_at?: string
          detected_columns?: string[]
          file_kind: string
          id?: string
          import_id: string
          mapping_confirmed_at?: string | null
          mapping_confirmed_by?: string | null
          mapping_profile_id?: string | null
          mapping_status?: string
          original_filename: string
          row_count?: number | null
          sha256: string
          sheet_name?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          column_mapping?: Json
          content_type?: string | null
          created_at?: string
          detected_columns?: string[]
          file_kind?: string
          id?: string
          import_id?: string
          mapping_confirmed_at?: string | null
          mapping_confirmed_by?: string | null
          mapping_profile_id?: string | null
          mapping_status?: string
          original_filename?: string
          row_count?: number | null
          sha256?: string
          sheet_name?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_reference_import_files_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_import_files_mapping_confirmed_by_fkey"
            columns: ["mapping_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_import_files_mapping_profile_id_fkey"
            columns: ["mapping_profile_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_column_mapping_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_import_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_reference_imports: {
        Row: {
          analysis_completed_at: string | null
          analysis_started_at: string | null
          analyzed_by: string | null
          counters: Json
          created_at: string
          created_by: string | null
          error_code: string | null
          error_details: string | null
          error_message: string | null
          health_report: Json | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          analysis_completed_at?: string | null
          analysis_started_at?: string | null
          analyzed_by?: string | null
          counters?: Json
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          health_report?: Json | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_completed_at?: string | null
          analysis_started_at?: string | null
          analyzed_by?: string | null
          counters?: Json
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          health_report?: Json | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_reference_imports_analyzed_by_fkey"
            columns: ["analyzed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_imports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_reference_snapshots: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          counters: Json
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          id: string
          import_id: string
          is_active: boolean
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          counters?: Json
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          id?: string
          import_id: string
          is_active?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          counters?: Json
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          id?: string
          import_id?: string
          is_active?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_reference_snapshots_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_reference_snapshots_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: true
            referencedRelation: "pricing_reference_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_segment_classification_links: {
        Row: {
          cir_key: string
          classification_id: string | null
          created_at: string
          famille: string | null
          id: string
          import_id: string
          link_status: string
          mega_famille: string | null
          normalized_values: Json
          raw_values: Json
          segment_id: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
          sous_famille: string | null
        }
        Insert: {
          cir_key: string
          classification_id?: string | null
          created_at?: string
          famille?: string | null
          id?: string
          import_id: string
          link_status: string
          mega_famille?: string | null
          normalized_values?: Json
          raw_values?: Json
          segment_id: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
          sous_famille?: string | null
        }
        Update: {
          cir_key?: string
          classification_id?: string | null
          created_at?: string
          famille?: string | null
          id?: string
          import_id?: string
          link_status?: string
          mega_famille?: string | null
          normalized_values?: Json
          raw_values?: Json
          segment_id?: string
          snapshot_id?: string
          source_file_id?: string
          source_row_number?: number
          sous_famille?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_segment_classification_links_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "pricing_classification_cir"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_product_semantics"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_purchase_terms"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_purchase_terms_active"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_segments"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_segments_active"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "pricing_supplier_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_segment_classification_links_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_import_files"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_segment_purchase_grids: {
        Row: {
          borne_acha: string | null
          coef_ha: string | null
          coef_majvte: string | null
          coef_retro: string | null
          col_ha: string | null
          created_at: string
          date_debut_normalized: string | null
          date_debut_raw: string | null
          date_fin_normalized: string | null
          date_fin_raw: string | null
          id: string
          import_id: string
          normalized_values: Json
          num_four: string | null
          priorite: string | null
          raw_values: Json
          remise_ha: string | null
          segment_id: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
          type_grill: string | null
        }
        Insert: {
          borne_acha?: string | null
          coef_ha?: string | null
          coef_majvte?: string | null
          coef_retro?: string | null
          col_ha?: string | null
          created_at?: string
          date_debut_normalized?: string | null
          date_debut_raw?: string | null
          date_fin_normalized?: string | null
          date_fin_raw?: string | null
          id?: string
          import_id: string
          normalized_values?: Json
          num_four?: string | null
          priorite?: string | null
          raw_values?: Json
          remise_ha?: string | null
          segment_id: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
          type_grill?: string | null
        }
        Update: {
          borne_acha?: string | null
          coef_ha?: string | null
          coef_majvte?: string | null
          coef_retro?: string | null
          col_ha?: string | null
          created_at?: string
          date_debut_normalized?: string | null
          date_debut_raw?: string | null
          date_fin_normalized?: string | null
          date_fin_raw?: string | null
          id?: string
          import_id?: string
          normalized_values?: Json
          num_four?: string | null
          priorite?: string | null
          raw_values?: Json
          remise_ha?: string | null
          segment_id?: string
          snapshot_id?: string
          source_file_id?: string
          source_row_number?: number
          type_grill?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_segment_purchase_grids_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_product_semantics"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_purchase_terms"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_purchase_terms_active"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_segments"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "ai_v_segments_active"
            referencedColumns: ["segment_id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "pricing_supplier_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_segment_purchase_grids_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_import_files"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_supplier_segments: {
        Row: {
          cat_fab: string
          cat_fab_l: string | null
          codif_fair: string | null
          created_at: string
          id: string
          idnumerique: string
          import_id: string
          marque: string
          normalized_values: Json
          raw_values: Json
          segment: string
          segment_key: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
          strategiq: string | null
          tarif_fab: string | null
        }
        Insert: {
          cat_fab: string
          cat_fab_l?: string | null
          codif_fair?: string | null
          created_at?: string
          id?: string
          idnumerique: string
          import_id: string
          marque: string
          normalized_values?: Json
          raw_values?: Json
          segment: string
          segment_key: string
          snapshot_id: string
          source_file_id: string
          source_row_number: number
          strategiq?: string | null
          tarif_fab?: string | null
        }
        Update: {
          cat_fab?: string
          cat_fab_l?: string | null
          codif_fair?: string | null
          created_at?: string
          id?: string
          idnumerique?: string
          import_id?: string
          marque?: string
          normalized_values?: Json
          raw_values?: Json
          segment?: string
          segment_key?: string
          snapshot_id?: string
          source_file_id?: string
          source_row_number?: number
          strategiq?: string | null
          tarif_fab?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_supplier_segments_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_supplier_segments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_supplier_segments_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_import_files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_agency_id: string | null
          archived_at: string | null
          created_at: string
          display_name: string | null
          email: string
          first_name: string | null
          id: string
          is_system: boolean
          last_name: string
          must_change_password: boolean
          password_changed_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          active_agency_id?: string | null
          archived_at?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          first_name?: string | null
          id: string
          is_system?: boolean
          last_name: string
          must_change_password?: boolean
          password_changed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          active_agency_id?: string | null
          archived_at?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_system?: boolean
          last_name?: string
          must_change_password?: boolean
          password_changed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_agency_id_fkey"
            columns: ["active_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reference_departments: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      task_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          agency_id: string
          event_order: number
          event_type: string
          id: string
          metadata: Json
          new_value: Json | null
          note: string | null
          occurred_at: string
          previous_value: Json | null
          task_id: string
          task_version: number
        }
        Insert: {
          actor_id?: string | null
          actor_kind: string
          agency_id: string
          event_order: number
          event_type: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          note?: string | null
          occurred_at?: string
          previous_value?: Json | null
          task_id: string
          task_version: number
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          agency_id?: string
          event_order?: number
          event_type?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          note?: string | null
          occurred_at?: string
          previous_value?: Json | null
          task_id?: string
          task_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_task_agency_fkey"
            columns: ["task_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      task_participants: {
        Row: {
          added_by: string
          agency_id: string
          created_at: string
          participant_role: string
          profile_id: string
          task_id: string
        }
        Insert: {
          added_by: string
          agency_id: string
          created_at?: string
          participant_role: string
          profile_id: string
          task_id: string
        }
        Update: {
          added_by?: string
          agency_id?: string
          created_at?: string
          participant_role?: string
          profile_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_participants_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_participants_profile_agency_fkey"
            columns: ["agency_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "agency_members"
            referencedColumns: ["agency_id", "user_id"]
          },
          {
            foreignKeyName: "task_participants_task_agency_fkey"
            columns: ["task_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      task_series: {
        Row: {
          agency_id: string
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_time: string | null
          due_timezone: string
          id: string
          interval_unit: string
          interval_value: number
          is_active: boolean
          organization_id: string | null
          planned_channel: string | null
          priority: string
          responsible_id: string | null
          scope: string
          stopped_at: string | null
          stopped_by: string | null
          task_type_id: string
          title: string
          visibility: string
        }
        Insert: {
          agency_id: string
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_time?: string | null
          due_timezone: string
          id?: string
          interval_unit: string
          interval_value: number
          is_active?: boolean
          organization_id?: string | null
          planned_channel?: string | null
          priority?: string
          responsible_id?: string | null
          scope: string
          stopped_at?: string | null
          stopped_by?: string | null
          task_type_id: string
          title: string
          visibility: string
        }
        Update: {
          agency_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_time?: string | null
          due_timezone?: string
          id?: string
          interval_unit?: string
          interval_value?: number
          is_active?: boolean
          organization_id?: string | null
          planned_channel?: string | null
          priority?: string
          responsible_id?: string | null
          scope?: string
          stopped_at?: string | null
          stopped_by?: string | null
          task_type_id?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_series_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_series_contact_organization_fkey"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "entity_contacts"
            referencedColumns: ["id", "entity_id"]
          },
          {
            foreignKeyName: "task_series_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_series_organization_agency_fkey"
            columns: ["organization_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "task_series_responsible_agency_fkey"
            columns: ["agency_id", "responsible_id"]
            isOneToOne: false
            referencedRelation: "agency_members"
            referencedColumns: ["agency_id", "user_id"]
          },
          {
            foreignKeyName: "task_series_stopped_by_fkey"
            columns: ["stopped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_series_task_type_id_fkey"
            columns: ["task_type_id"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["id"]
          },
        ]
      }
      task_types: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_types_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agency_id: string
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          completed_at: string | null
          completed_by: string | null
          completion_activity_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          due_time: string | null
          due_timezone: string
          id: string
          organization_id: string | null
          planned_channel: string | null
          previous_task_id: string | null
          priority: string
          responsible_id: string | null
          scope: string
          series_id: string | null
          source_activity_id: string | null
          status: string
          task_type_id: string
          title: string
          updated_at: string
          version: number
          visibility: string
        }
        Insert: {
          agency_id: string
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_activity_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          due_time?: string | null
          due_timezone: string
          id?: string
          organization_id?: string | null
          planned_channel?: string | null
          previous_task_id?: string | null
          priority?: string
          responsible_id?: string | null
          scope: string
          series_id?: string | null
          source_activity_id?: string | null
          status?: string
          task_type_id: string
          title: string
          updated_at?: string
          version?: number
          visibility: string
        }
        Update: {
          agency_id?: string
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_activity_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          due_timezone?: string
          id?: string
          organization_id?: string | null
          planned_channel?: string | null
          previous_task_id?: string | null
          priority?: string
          responsible_id?: string | null
          scope?: string
          series_id?: string | null
          source_activity_id?: string | null
          status?: string
          task_type_id?: string
          title?: string
          updated_at?: string
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_canceled_by_fkey"
            columns: ["canceled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completion_activity_scope_fkey"
            columns: ["completion_activity_id", "agency_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "agency_id", "organization_id"]
          },
          {
            foreignKeyName: "tasks_contact_organization_fkey"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "entity_contacts"
            referencedColumns: ["id", "entity_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_agency_fkey"
            columns: ["organization_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "tasks_previous_agency_fkey"
            columns: ["previous_task_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "tasks_responsible_agency_fkey"
            columns: ["agency_id", "responsible_id"]
            isOneToOne: false
            referencedRelation: "agency_members"
            referencedColumns: ["agency_id", "user_id"]
          },
          {
            foreignKeyName: "tasks_series_agency_fkey"
            columns: ["series_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "task_series"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "tasks_source_activity_scope_fkey"
            columns: ["source_activity_id", "agency_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "agency_id", "organization_id"]
          },
          {
            foreignKeyName: "tasks_task_type_id_fkey"
            columns: ["task_type_id"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_role_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tier_roles: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          id: string
          role_code: string
          source_record_id: string
          source_system: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          id?: string
          role_code: string
          source_record_id: string
          source_system: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          id?: string
          role_code?: string
          source_record_id?: string
          source_system?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_roles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_roles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "tier_role_types"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      ai_v_product_semantics: {
        Row: {
          cat_fab: string | null
          cat_fab_l: string | null
          cir_path: string | null
          fam: string | null
          fam_lib: string | null
          link_status: string | null
          marque: string | null
          mega: string | null
          mega_lib: string | null
          normalized_cat_fab: string | null
          segment: string | null
          segment_id: string | null
          sfa: string | null
          sfa_lib: string | null
          snapshot_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_supplier_segments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_v_purchase_terms: {
        Row: {
          borne_achat_num: number | null
          cat_fab: string | null
          cat_fab_l: string | null
          coef_ha_num: number | null
          coef_majvte_num: number | null
          coef_retro_num: number | null
          date_debut_normalized: string | null
          date_fin_normalized: string | null
          marque: string | null
          num_four: string | null
          priorite: string | null
          purchase_grid_id: string | null
          remise_ha_pct: number | null
          segment: string | null
          segment_id: string | null
          segment_key: string | null
          snapshot_id: string | null
          type_grill: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_supplier_segments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_v_purchase_terms_active: {
        Row: {
          borne_achat_num: number | null
          cat_fab: string | null
          cat_fab_l: string | null
          coef_ha_num: number | null
          coef_majvte_num: number | null
          coef_retro_num: number | null
          date_debut_normalized: string | null
          date_fin_normalized: string | null
          marque: string | null
          num_four: string | null
          priorite: string | null
          purchase_grid_id: string | null
          remise_ha_pct: number | null
          segment: string | null
          segment_id: string | null
          segment_key: string | null
          type_grill: string | null
        }
        Relationships: []
      }
      ai_v_segments: {
        Row: {
          cat_fab: string | null
          cat_fab_l: string | null
          codif_fair: string | null
          idnumerique: string | null
          marque: string | null
          segment: string | null
          segment_id: string | null
          segment_key: string | null
          snapshot_id: string | null
          strategiq: string | null
          tarif_fab: string | null
        }
        Insert: {
          cat_fab?: string | null
          cat_fab_l?: string | null
          codif_fair?: string | null
          idnumerique?: string | null
          marque?: string | null
          segment?: string | null
          segment_id?: string | null
          segment_key?: string | null
          snapshot_id?: string | null
          strategiq?: string | null
          tarif_fab?: string | null
        }
        Update: {
          cat_fab?: string | null
          cat_fab_l?: string | null
          codif_fair?: string | null
          idnumerique?: string | null
          marque?: string | null
          segment?: string | null
          segment_id?: string | null
          segment_key?: string | null
          snapshot_id?: string | null
          strategiq?: string | null
          tarif_fab?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_supplier_segments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "pricing_reference_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_v_segments_active: {
        Row: {
          cat_fab: string | null
          cat_fab_l: string | null
          codif_fair: string | null
          idnumerique: string | null
          marque: string | null
          segment: string | null
          segment_id: string | null
          segment_key: string | null
          strategiq: string | null
          tarif_fab: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "term" | "cash"
      user_role: "super_admin" | "agency_admin" | "tcs"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["term", "cash"],
      user_role: ["super_admin", "agency_admin", "tcs"],
    },
  },
} as const
