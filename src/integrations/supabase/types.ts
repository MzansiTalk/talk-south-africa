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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ad_impressions: {
        Row: {
          clicked: boolean
          content_kind: string | null
          content_owner_id: string | null
          created_at: string
          id: string
          network: string
          placement: string
          post_id: string | null
          revenue: number
          user_id: string | null
        }
        Insert: {
          clicked?: boolean
          content_kind?: string | null
          content_owner_id?: string | null
          created_at?: string
          id?: string
          network?: string
          placement: string
          post_id?: string | null
          revenue?: number
          user_id?: string | null
        }
        Update: {
          clicked?: boolean
          content_kind?: string | null
          content_owner_id?: string | null
          created_at?: string
          id?: string
          network?: string
          placement?: string
          post_id?: string | null
          revenue?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          admob_app_id: string | null
          admob_banner_id: string | null
          admob_interstitial_id: string | null
          admob_native_id: string | null
          admob_payment_email: string | null
          admob_rewarded_id: string | null
          admob_rewarded_interstitial_id: string | null
          admob_status_id: string | null
          admob_test_mode: boolean
          ads_banner_enabled: boolean
          ads_interstitial_enabled: boolean
          ads_native_enabled: boolean
          ads_rewarded_enabled: boolean
          id: string
          live_mode: boolean
          meta_app_id: string | null
          meta_banner_placement_id: string | null
          meta_interstitial_placement_id: string | null
          meta_rewarded_placement_id: string | null
          paystack_payout_email: string | null
          paystack_public_key: string | null
          paystack_test_mode: boolean
          paystack_webhook_url: string | null
          price_boost_7_days: number
          price_boost_post: number
          price_per_1000_impressions: number
          price_sponsored_30_days: number
          price_sponsored_7_days: number
          test_mode: boolean
          updated_at: string
        }
        Insert: {
          admob_app_id?: string | null
          admob_banner_id?: string | null
          admob_interstitial_id?: string | null
          admob_native_id?: string | null
          admob_payment_email?: string | null
          admob_rewarded_id?: string | null
          admob_rewarded_interstitial_id?: string | null
          admob_status_id?: string | null
          admob_test_mode?: boolean
          ads_banner_enabled?: boolean
          ads_interstitial_enabled?: boolean
          ads_native_enabled?: boolean
          ads_rewarded_enabled?: boolean
          id?: string
          live_mode?: boolean
          meta_app_id?: string | null
          meta_banner_placement_id?: string | null
          meta_interstitial_placement_id?: string | null
          meta_rewarded_placement_id?: string | null
          paystack_payout_email?: string | null
          paystack_public_key?: string | null
          paystack_test_mode?: boolean
          paystack_webhook_url?: string | null
          price_boost_7_days?: number
          price_boost_post?: number
          price_per_1000_impressions?: number
          price_sponsored_30_days?: number
          price_sponsored_7_days?: number
          test_mode?: boolean
          updated_at?: string
        }
        Update: {
          admob_app_id?: string | null
          admob_banner_id?: string | null
          admob_interstitial_id?: string | null
          admob_native_id?: string | null
          admob_payment_email?: string | null
          admob_rewarded_id?: string | null
          admob_rewarded_interstitial_id?: string | null
          admob_status_id?: string | null
          admob_test_mode?: boolean
          ads_banner_enabled?: boolean
          ads_interstitial_enabled?: boolean
          ads_native_enabled?: boolean
          ads_rewarded_enabled?: boolean
          id?: string
          live_mode?: boolean
          meta_app_id?: string | null
          meta_banner_placement_id?: string | null
          meta_interstitial_placement_id?: string | null
          meta_rewarded_placement_id?: string | null
          paystack_payout_email?: string | null
          paystack_public_key?: string | null
          paystack_test_mode?: boolean
          paystack_webhook_url?: string | null
          price_boost_7_days?: number
          price_boost_post?: number
          price_per_1000_impressions?: number
          price_sponsored_30_days?: number
          price_sponsored_7_days?: number
          test_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      appeals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          message: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          amount: number
          created_at: string
          days: number
          ends_at: string
          id: string
          post_id: string
          reference: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string
          views_gained: number
        }
        Insert: {
          amount: number
          created_at?: string
          days: number
          ends_at: string
          id?: string
          post_id: string
          reference?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
          views_gained?: number
        }
        Update: {
          amount?: number
          created_at?: string
          days?: number
          ends_at?: string
          id?: string
          post_id?: string
          reference?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          views_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "boosts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          photo_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          photo_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          photo_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      copyright_log: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          post_id: string | null
          reason: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          post_id?: string | null
          reason: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copyright_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_applications: {
        Row: {
          account_number: string
          bank_name: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          full_name: string
          id: string
          id_number: string
          phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          bank_name: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          full_name: string
          id?: string
          id_number: string
          phone: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          bank_name?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          full_name?: string
          id?: string
          id_number?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          sender_id: string
          shared_post_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender_id: string
          shared_post_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender_id?: string
          shared_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          notes: string | null
          target_post_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_post_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_post_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_log_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          message: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          message: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          message?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string
          creator_share: number
          id: string
          paid_at: string | null
          platform_share: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          creator_share?: number
          id?: string
          paid_at?: string | null
          platform_share?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          creator_share?: number
          id?: string
          paid_at?: string | null
          platform_share?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          boost_amount: number
          boost_expires_at: string | null
          caption: string | null
          created_at: string
          deleted_by_admin: boolean
          expires_at: string | null
          id: string
          is_trending: boolean
          kind: Database["public"]["Enums"]["content_kind"]
          media_type: string | null
          media_url: string | null
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          boost_amount?: number
          boost_expires_at?: string | null
          caption?: string | null
          created_at?: string
          deleted_by_admin?: boolean
          expires_at?: string | null
          id?: string
          is_trending?: boolean
          kind?: Database["public"]["Enums"]["content_kind"]
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          boost_amount?: number
          boost_expires_at?: string | null
          caption?: string | null
          created_at?: string
          deleted_by_admin?: boolean
          expires_at?: string | null
          id?: string
          is_trending?: boolean
          kind?: Database["public"]["Enums"]["content_kind"]
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          id: string
          is_banned: boolean
          is_hidden: boolean
          is_viral: boolean
          last_seen_at: string
          name: string
          notifications_enabled: boolean
          strikes: number
          updated_at: string
          username: string
          viral_since: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          id: string
          is_banned?: boolean
          is_hidden?: boolean
          is_viral?: boolean
          last_seen_at?: string
          name?: string
          notifications_enabled?: boolean
          strikes?: number
          updated_at?: string
          username: string
          viral_since?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          is_hidden?: boolean
          is_viral?: boolean
          last_seen_at?: string
          name?: string
          notifications_enabled?: boolean
          strikes?: number
          updated_at?: string
          username?: string
          viral_since?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_orders: {
        Row: {
          amount: number
          brand_email: string
          brand_name: string
          created_at: string
          days: number
          id: string
          message: string | null
          package: string
          phone: string | null
          reference: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          brand_email: string
          brand_name: string
          created_at?: string
          days?: number
          id?: string
          message?: string | null
          package: string
          phone?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          brand_email?: string
          brand_name?: string
          created_at?: string
          days?: number
          id?: string
          message?: string | null
          package?: string
          phone?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_staff_reply: boolean
          sender_id: string
          thread_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          sender_id: string
          thread_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          sender_id?: string
          thread_user_id?: string
        }
        Relationships: []
      }
      user_pass_keys: {
        Row: {
          created_at: string
          pass_key_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pass_key_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          pass_key_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved?: boolean
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
      ad_config: { Args: never; Returns: Json }
      add_strike: {
        Args: { _post_id?: string; _reason: string; _user_id: string }
        Returns: number
      }
      admin_set_viral: {
        Args: { _on: boolean; _user_id: string }
        Returns: undefined
      }
      creator_ad_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_view: { Args: { _post_id: string }; Returns: undefined }
      is_active_staff: { Args: { _user_id: string }; Returns: boolean }
      is_blocked_pair: { Args: { _a: string; _b: string }; Returns: boolean }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      log_ad_click: { Args: { _impression_id: string }; Returns: undefined }
      log_ad_impression: {
        Args: {
          _content_kind?: string
          _content_owner_id?: string
          _network?: string
          _placement: string
          _post_id?: string
        }
        Returns: string
      }
      log_copyright: {
        Args: {
          _detail?: string
          _post_id?: string
          _reason: string
          _user_id: string
        }
        Returns: undefined
      }
      log_moderation: {
        Args: {
          _action: string
          _notes?: string
          _target_post_id?: string
          _target_user_id?: string
        }
        Returns: undefined
      }
      owner_set_ban: {
        Args: { _banned: boolean; _reason?: string; _user_id: string }
        Returns: undefined
      }
      owner_set_creator_status: {
        Args: { _application_id: string; _status: string }
        Returns: undefined
      }
      owner_set_payout_status: {
        Args: { _payout_id: string; _status: string }
        Returns: undefined
      }
      payments_ready: { Args: never; Returns: boolean }
      paystack_public_key: { Args: never; Returns: string }
      public_pricing: { Args: never; Returns: Json }
      touch_presence: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "admin" | "user"
      content_kind: "post" | "reel" | "status"
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
      app_role: ["owner", "admin", "user"],
      content_kind: ["post", "reel", "status"],
    },
  },
} as const
