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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
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
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          archived_at?: string | null
          created_at?: string
          id?: string
          label: string
          sort_order?: number
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
      agency_services: {
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
            foreignKeyName: "agency_services_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
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
          id: string
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
          id?: string
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
          id?: string
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
      entities: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          address: string | null
          agency_id: string | null
          archived_at: string | null
          city: string | null
          client_number: string | null
          country: string
          created_at: string
          created_by: string | null
          department: string | null
          entity_type: string
          id: string
          name: string
          notes: string | null
          postal_code: string | null
          siret: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          address?: string | null
          agency_id?: string | null
          archived_at?: string | null
          city?: string | null
          client_number?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          entity_type: string
          id?: string
          name: string
          notes?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          address?: string | null
          agency_id?: string | null
          archived_at?: string | null
          city?: string | null
          client_number?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          entity_type?: string
          id?: string
          name?: string
          notes?: string | null
          postal_code?: string | null
          siret?: string | null
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
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          entity_id: string
          first_name?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          entity_id?: string
          first_name?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
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
          mega_families: string[]
          notes: string | null
          order_ref: string | null
          reminder_at: string | null
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
          mega_families?: string[]
          notes?: string | null
          order_ref?: string | null
          reminder_at?: string | null
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
          mega_families?: string[]
          notes?: string | null
          order_ref?: string | null
          reminder_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_actor_id: { Args: never; Returns: string }
      archive_audit_logs_older_than: {
        Args: { p_batch_size?: number; p_before?: string }
        Returns: number
      }
      audit_actor_id: { Args: never; Returns: string }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      hard_delete_agency: { Args: { p_agency_id: string }; Returns: undefined }
      has_agency_role: {
        Args: {
          roles: Database["public"]["Enums"]["user_role"][]
          target_agency_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: { roles: Database["public"]["Enums"]["user_role"][] }
        Returns: boolean
      }
      is_member: { Args: { target_agency_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      jwt_sub: { Args: never; Returns: string }
      run_audit_logs_retention: {
        Args: {
          p_batch_size?: number
          p_before?: string
          p_max_batches?: number
        }
        Returns: number
      }
      safe_uuid: { Args: { p_value: string }; Returns: string }
      set_audit_actor: { Args: { p_actor_id: string }; Returns: undefined }
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
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
