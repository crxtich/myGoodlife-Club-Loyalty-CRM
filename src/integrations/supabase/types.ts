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
        // NOTE: target_segments (lifecycle) is retained for legacy rows but no longer
        // written by the UI. target_rfm_segments (added via RFM migration) is now the
        // single source of truth for campaign targeting — see README "RFM vs Lifecycle".
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
          target_rfm_segments: Database["public"]["Enums"]["rfm_segment"][]
          message_template: string | null
          email_subject: string | null
          email_body: string | null
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
          target_rfm_segments?: Database["public"]["Enums"]["rfm_segment"][]
          message_template?: string | null
          email_subject?: string | null
          email_body?: string | null
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
          target_rfm_segments?: Database["public"]["Enums"]["rfm_segment"][]
          message_template?: string | null
          email_subject?: string | null
          email_body?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_exports: {
        Row: {
          id: string
          report_type: string
          format: string
          generated_by: string | null
          row_count: number
          file_reference: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          report_type: string
          format: string
          generated_by?: string | null
          row_count?: number
          file_reference?: string | null
          generated_at?: string
        }
        Update: {
          id?: string
          report_type?: string
          format?: string
          generated_by?: string | null
          row_count?: number
          file_reference?: string | null
          generated_at?: string
        }
        Relationships: []
      }
      members: {
        // NOTE: country column requires a Supabase migration:
        //   ALTER TABLE members ADD COLUMN country TEXT CHECK (country IN ('Kenya', 'Uganda'));
        // NOTE: rfm_segment + score columns require the RFM migration (see supabase/migrations).
        // NOTE: loyalty_id is reserved for a future stable identity key (not yet sourced);
        //   sub_segment is reserved for future personas nested under each RFM segment.
        //   phone remains the operative join key to membership_sales_transactions today.
        Row: {
          country: "Kenya" | "Uganda" | null
          created_at: string
          email: string | null
          id: string
          join_date: string | null
          last_purchase_date: string | null
          loyalty_id: string | null
          member_id: string
          name: string
          phone: string | null
          preferred_channel: Database["public"]["Enums"]["channel_type"] | null
          priority_score: number
          segment: Database["public"]["Enums"]["member_segment"] | null
          rfm_segment: Database["public"]["Enums"]["rfm_segment"] | null
          recency_score: number | null
          frequency_score: number | null
          monetary_score: number | null
          sub_segment: string | null
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
          loyalty_id?: string | null
          member_id: string
          name: string
          phone?: string | null
          preferred_channel?: Database["public"]["Enums"]["channel_type"] | null
          priority_score?: number
          segment?: Database["public"]["Enums"]["member_segment"] | null
          rfm_segment?: Database["public"]["Enums"]["rfm_segment"] | null
          recency_score?: number | null
          frequency_score?: number | null
          monetary_score?: number | null
          sub_segment?: string | null
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
          loyalty_id?: string | null
          member_id?: string
          name?: string
          phone?: string | null
          preferred_channel?: Database["public"]["Enums"]["channel_type"] | null
          priority_score?: number
          segment?: Database["public"]["Enums"]["member_segment"] | null
          rfm_segment?: Database["public"]["Enums"]["rfm_segment"] | null
          recency_score?: number | null
          frequency_score?: number | null
          monetary_score?: number | null
          sub_segment?: string | null
          store_location?: string | null
          total_purchases?: number
          total_spend?: number
          updated_at?: string
        }
        Relationships: []
      }
      membership_sales_transactions: {
        // MVP demo data model — mirrors the real iVend/SAP "Membership Sales"
        // source table (line-item grain). Field names map to source columns
        // for straightforward reconciliation once the live connector exists.
        Row: {
          id: string
          transaction_id: string
          transaction_key: string | null
          phone_no: string
          customer_name: string | null
          business_date: string
          region: string | null
          store_code: string | null
          description: string | null
          item: string | null
          item_desc: string | null
          category_group: string | null
          sub_category_1: string | null
          sub_category_3: string | null
          brand: string | null
          customer_grp: string | null
          pre_tax: number
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          transaction_key?: string | null
          phone_no: string
          customer_name?: string | null
          business_date: string
          region?: string | null
          store_code?: string | null
          description?: string | null
          item?: string | null
          item_desc?: string | null
          category_group?: string | null
          sub_category_1?: string | null
          sub_category_3?: string | null
          brand?: string | null
          customer_grp?: string | null
          pre_tax?: number
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          transaction_key?: string | null
          phone_no?: string
          customer_name?: string | null
          business_date?: string
          region?: string | null
          store_code?: string | null
          description?: string | null
          item?: string | null
          item_desc?: string | null
          category_group?: string | null
          sub_category_1?: string | null
          sub_category_3?: string | null
          brand?: string | null
          customer_grp?: string | null
          pre_tax?: number
          quantity?: number
          created_at?: string
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
      recompute_rfm_segments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "analyst"
      channel_type: "sms" | "email"
      member_segment:
        | "active"
        | "at_risk"
        | "churned_60_90"
        | "churned_90_180"
        | "churned_180_plus"
        | "new"
      rfm_segment: "champions" | "loyals" | "at_risk_rfm" | "lapsed" | "new_rfm"
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
      channel_type: ["sms", "email"],
      member_segment: [
        "active",
        "at_risk",
        "churned_60_90",
        "churned_90_180",
        "churned_180_plus",
        "new",
      ],
      rfm_segment: ["champions", "loyals", "at_risk_rfm", "lapsed", "new_rfm"],
    },
  },
} as const
