export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      daily_checkins: {
        Row: {
          created_at: string;
          effort_vs_results: number | null;
          energy: number | null;
          id: string;
          local_date: string;
          mood: number | null;
          note: string | null;
          sleep_quality: number | null;
          stress: number | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          effort_vs_results?: number | null;
          energy?: number | null;
          id?: string;
          local_date: string;
          mood?: number | null;
          note?: string | null;
          sleep_quality?: number | null;
          stress?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          effort_vs_results?: number | null;
          energy?: number | null;
          id?: string;
          local_date?: string;
          mood?: number | null;
          note?: string | null;
          sleep_quality?: number | null;
          stress?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          category: string;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          horizon: string;
          id: string;
          status: string;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          horizon: string;
          id?: string;
          status?: string;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category?: string;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          horizon?: string;
          id?: string;
          status?: string;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      habit_checkins: {
        Row: {
          created_at: string;
          habit_id: string;
          id: string;
          local_date: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          habit_id: string;
          id?: string;
          local_date: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          habit_id?: string;
          id?: string;
          local_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'habit_checkins_habit_id_fkey';
            columns: ['habit_id'];
            isOneToOne: false;
            referencedRelation: 'habits';
            referencedColumns: ['id'];
          },
        ];
      };
      habits: {
        Row: {
          cadence: string;
          created_at: string;
          days_of_week: number[];
          goal_id: string | null;
          id: string;
          is_active: boolean;
          rest_days_per_week: number;
          target_per_period: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cadence?: string;
          created_at?: string;
          days_of_week?: number[];
          goal_id?: string | null;
          id?: string;
          is_active?: boolean;
          rest_days_per_week?: number;
          target_per_period?: number;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          cadence?: string;
          created_at?: string;
          days_of_week?: number[];
          goal_id?: string | null;
          id?: string;
          is_active?: boolean;
          rest_days_per_week?: number;
          target_per_period?: number;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'habits_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_adjustments: {
        Row: {
          created_at: string;
          decided_at: string | null;
          id: string;
          kind: string;
          percent_change: number;
          reason: string;
          review_id: string;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          kind: string;
          percent_change: number;
          reason: string;
          review_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          kind?: string;
          percent_change?: number;
          reason?: string;
          review_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_adjustments_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: true;
            referencedRelation: 'weekly_reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_items: {
        Row: {
          created_at: string;
          detail: string | null;
          goal_id: string;
          id: string;
          level: string;
          metric_unit: string | null;
          parent_id: string | null;
          period_end: string;
          period_start: string;
          source: string;
          status: string;
          target_value: number | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          detail?: string | null;
          goal_id: string;
          id?: string;
          level: string;
          metric_unit?: string | null;
          parent_id?: string | null;
          period_end: string;
          period_start: string;
          source?: string;
          status?: string;
          target_value?: number | null;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          detail?: string | null;
          goal_id?: string;
          id?: string;
          level?: string;
          metric_unit?: string | null;
          parent_id?: string | null;
          period_end?: string;
          period_start?: string;
          source?: string;
          status?: string;
          target_value?: number | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_items_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'plan_items';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          onboarding_completed: boolean;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          onboarding_completed?: boolean;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          onboarding_completed?: boolean;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          duration_minutes: number;
          effort: number;
          goal_id: string | null;
          id: string;
          plan_item_id: string | null;
          position: number;
          source: string;
          status: string;
          task_date: string;
          title: string;
          updated_at: string;
          user_id: string;
          xp_awarded: number;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          duration_minutes: number;
          effort: number;
          goal_id?: string | null;
          id?: string;
          plan_item_id?: string | null;
          position?: number;
          source?: string;
          status?: string;
          task_date: string;
          title: string;
          updated_at?: string;
          user_id?: string;
          xp_awarded?: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          duration_minutes?: number;
          effort?: number;
          goal_id?: string | null;
          id?: string;
          plan_item_id?: string | null;
          position?: number;
          source?: string;
          status?: string;
          task_date?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          xp_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_plan_item_id_fkey';
            columns: ['plan_item_id'];
            isOneToOne: false;
            referencedRelation: 'plan_items';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          coach_tone: string;
          created_at: string;
          daily_minutes: number;
          focus_areas: string[];
          reminder_time: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          coach_tone: string;
          created_at?: string;
          daily_minutes: number;
          focus_areas: string[];
          reminder_time?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          coach_tone?: string;
          created_at?: string;
          daily_minutes?: number;
          focus_areas?: string[];
          reminder_time?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weekly_reviews: {
        Row: {
          band: string | null;
          checkin_days: number;
          completed: number;
          completion_rate: number | null;
          created_at: string;
          id: string;
          planned: number;
          user_id: string;
          week_start: string;
          wellness_confidence: string;
          wellness_score: number | null;
        };
        ComputedFields: never;
        Insert: {
          band?: string | null;
          checkin_days: number;
          completed: number;
          completion_rate?: number | null;
          created_at?: string;
          id?: string;
          planned: number;
          user_id: string;
          week_start: string;
          wellness_confidence: string;
          wellness_score?: number | null;
        };
        Update: {
          band?: string | null;
          checkin_days?: number;
          completed?: number;
          completion_rate?: number | null;
          created_at?: string;
          id?: string;
          planned?: number;
          user_id?: string;
          week_start?: string;
          wellness_confidence?: string;
          wellness_score?: number | null;
        };
        Relationships: [];
      };
      xp_ledger: {
        Row: {
          created_at: string;
          id: number;
          kind: string;
          occurred_on: string;
          ref_id: string;
          user_id: string;
          voided_at: string | null;
          xp: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          kind: string;
          occurred_on: string;
          ref_id: string;
          user_id: string;
          voided_at?: string | null;
          xp: number;
        };
        Update: {
          created_at?: string;
          id?: never;
          kind?: string;
          occurred_on?: string;
          ref_id?: string;
          user_id?: string;
          voided_at?: string | null;
          xp?: number;
        };
        Relationships: [];
      };
      xp_rules: {
        Row: {
          active: boolean;
          base_xp: number;
          daily_cap: number | null;
          kind: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          base_xp: number;
          daily_cap?: number | null;
          kind: string;
        };
        Update: {
          active?: boolean;
          base_xp?: number;
          daily_cap?: number | null;
          kind?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      xp_today: {
        Row: {
          user_id: string;
          xp_today: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      xp_totals: {
        Row: {
          level: number | null;
          total_xp: number | null;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      check_habit: { Args: { p_habit_id: string }; Returns: Json };
      complete_onboarding: {
        Args: {
          p_coach_tone: string;
          p_daily_minutes: number;
          p_display_name: string;
          p_focus_areas: string[];
          p_goal_category: string;
          p_goal_description?: string;
          p_goal_horizon: string;
          p_goal_title: string;
          p_reminder_time?: string;
        };
        Returns: undefined;
      };
      complete_task: { Args: { p_task_id: string }; Returns: Json };
      decide_adjustment: {
        Args: { p_accept: boolean; p_adjustment_id: string };
        Returns: {
          created_at: string;
          decided_at: string | null;
          id: string;
          kind: string;
          percent_change: number;
          reason: string;
          review_id: string;
          status: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'plan_adjustments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_weekly_review: { Args: Record<PropertyKey, never>; Returns: Json };
      habit_streak: { Args: { p_habit_id: string }; Returns: Json };
      log_checkin: {
        Args: {
          p_effort_vs_results?: number;
          p_energy?: number;
          p_mood?: number;
          p_note?: string;
          p_sleep_quality?: number;
          p_stress?: number;
        };
        Returns: {
          created_at: string;
          effort_vs_results: number | null;
          energy: number | null;
          id: string;
          local_date: string;
          mood: number | null;
          note: string | null;
          sleep_quality: number | null;
          stress: number | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'daily_checkins';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      skip_task: { Args: { p_task_id: string }; Returns: undefined };
      uncheck_habit: { Args: { p_habit_id: string }; Returns: Json };
      undo_task: { Args: { p_task_id: string }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
