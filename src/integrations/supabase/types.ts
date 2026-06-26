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
      campaign_exports: {
        Row: {
          campaign_id: string | null
          exported_at: string
          exported_by: string | null
          file_reference: string | null
          id: string
          member_count: number
        }
        Insert: {
          campaign_id?: string | null
          exported_at?: string
          exported_by?: string | null
          file_reference?: string | null
          id?: string
          member_count?: number
        }
        Update: {
          campaign_id?: string | null
          exported_at?: string
          exported_by?: string | null
          file_reference?: string | null
          id?: string
          member_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_exports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"] | null
          created_at: string
          created_by: string | null
          export_count: number
          id: string
          name: string
          notes: string | null
          objective: string | null
          target_segments: Database["public"]["Enums"]["member_segment"][]
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["channel_type"] | null
          created_at?: string
          created_by?: string | null
          export_count?: number
          id?: string
          name: string
          notes?: string | null
          objective?: string | null
          target_segments?: Database["public"]["Enums"]["member_segment"][]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"] | null
          created_at?: string
          created_by?: string | null
          export_count?: number
          id?: string
          name?: string
          notes?: string | null
          objective?: string | null
          target_segments?: Database["public"]["Enums"]["member_segment"][]
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        // NOTE: country column requires a Supabase migration:
        //   ALTER TABLE members ADD COLUMN country TEXT CHECK (country IN ('Kenya', 'Uganda'));
        Row: {
          country: "Kenya" | "Uganda" | null
          created_at: string
          email: string | null
          id: string
          join_date: string | null
          last_purchase_date: string | null
          member_id: string
          name: string
          phone: string | null
          preferred_channel: Database["public"]["Enums"]["channel_type"] | null
          priority_score: number
          segment: Database["public"]["Enums"]["member_segment"] | null
          store_location: string | null
          total_purchases: number
          total_spend: number
          updated_at: string
        }
        Insert: {
          country?: "Kenya" | "Uganda" | null
          created_at?: string
          email?: string | null
          id?: string
          join_date?: string | null
          last_purchase_date?: string | null
          member_id: string
          name: string
          phone?: string | null
          preferred_channel?: Database["public"]["Enums"]["channel_type"] | null
          priority_score?: number
          segment?: Database["public"]["Enums"]["member_segment"] | null
          store_location?: string | null
          total_purchases?: number
          total_spend?: number
          updated_at?: string
        }
        Update: {
          country?: "Kenya" | "Uganda" | null
          created_at?: string
          email?: string | null
          id?: string
          join_date?: string | null
          last_purchase_date?: string | null
          member_id?: string
          name?: string
          phone?: string | null
          preferred_channel?: Database["public"]["Enums"]["channel_type"] | null
          priority_score?: number
          segment?: Database["public"]["Enums"]["member_segment"] | null
          store_location?: string | null
          total_purchases?: number
          total_spend?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          channel: Database["public"]["Enums"]["channel_type"] | null
          created_at: string
          id: string
          member_id: string
          product_category: string | null
          purchase_date: string
          store_location: string | null
        }
        Insert: {
          amount?: number
          channel?: Database["public"]["Enums"]["channel_type"] | null
          created_at?: string
          id?: string
          member_id: string
          product_category?: string | null
          purchase_date: string
          store_location?: string | null
        }
        Update: {
          amount?: number
          channel?: Database["public"]["Enums"]["channel_type"] | null
          created_at?: string
          id?: string
          member_id?: string
          product_category?: string | null
          purchase_date?: string
          store_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_batches: {
        Row: {
          created_at: string
          errors: number
          file_name: string | null
          id: string
          new_members: number
          records_processed: number
          updated_members: number
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          errors?: number
          file_name?: string | null
          id?: string
          new_members?: number
          records_processed?: number
          updated_members?: number
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          errors?: number
          file_name?: string | null
          id?: string
          new_members?: number
          records_processed?: number
          updated_members?: number
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "analyst"
      channel_type: "in_store" | "online" | "whatsapp"
      member_segment:
        | "active"
        | "at_risk"
        | "churned_60_90"
        | "churned_90_180"
        | "churned_180_plus"
        | "new"
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
      app_role: ["admin", "manager", "analyst"],
      channel_type: ["in_store", "online", "whatsapp"],
      member_segment: [
        "active",
        "at_risk",
        "churned_60_90",
        "churned_90_180",
        "churned_180_plus",
        "new",
      ],
    },
  },
} as const
