// Generated from the SQL migrations in supabase/migrations.
// Regenerate against the local database with `npm run db:types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_field_suggestions: {
        Row: {
          confidence: number;
          created_at: string;
          field_id: string;
          id: string;
          model: string;
          normalized_value: string | null;
          project_id: string;
          prompt_version: string;
          reasoning: string | null;
          should_apply: boolean;
          suggestion_origin: "ai";
          source_document_filename: string | null;
          source_document_id: string | null;
          source_excerpt: string | null;
          source_page: number | null;
          status:
            | "proposed"
            | "proposed_review"
            | "proposed_conflict"
            | "rejected"
            | "obsolete";
          updated_at: string;
          value: Json | null;
        };
        Insert: {
          confidence: number;
          created_at?: string;
          field_id: string;
          id?: string;
          model: string;
          normalized_value?: string | null;
          project_id: string;
          prompt_version: string;
          reasoning?: string | null;
          should_apply?: boolean;
          suggestion_origin?: "ai";
          source_document_filename?: string | null;
          source_document_id?: string | null;
          source_excerpt?: string | null;
          source_page?: number | null;
          status?:
            | "proposed"
            | "proposed_review"
            | "proposed_conflict"
            | "rejected"
            | "obsolete";
          updated_at?: string;
          value?: Json | null;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          field_id?: string;
          id?: string;
          model?: string;
          normalized_value?: string | null;
          project_id?: string;
          prompt_version?: string;
          reasoning?: string | null;
          should_apply?: boolean;
          suggestion_origin?: "ai";
          source_document_filename?: string | null;
          source_document_id?: string | null;
          source_excerpt?: string | null;
          source_page?: number | null;
          status?:
            | "proposed"
            | "proposed_review"
            | "proposed_conflict"
            | "rejected"
            | "obsolete";
          updated_at?: string;
          value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_field_suggestions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_field_suggestions_source_document_id_fkey";
            columns: ["source_document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          auto_delete_after: string | null;
          classification_confidence: number | null;
          classification_details: Json | null;
          classification_status: Database["public"]["Enums"]["classification_status"];
          classification_version: string | null;
          classified_at: string | null;
          created_at: string;
          deleted_at: string | null;
          deleted_reason: string | null;
          detected_syndic: string | null;
          document_type: Database["public"]["Enums"]["document_type"];
          document_type_override: Database["public"]["Enums"]["document_type"] | null;
          error_message: string | null;
          filename: string;
          id: string;
          is_document_type_manual: boolean;
          mime_type: string;
          processing_status: Database["public"]["Enums"]["document_processing_status"];
          project_id: string;
          size_bytes: number | null;
          storage_path: string | null;
          updated_at: string;
        };
        Insert: {
          auto_delete_after?: string | null;
          classification_confidence?: number | null;
          classification_details?: Json | null;
          classification_status?: Database["public"]["Enums"]["classification_status"];
          classification_version?: string | null;
          classified_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_reason?: string | null;
          detected_syndic?: string | null;
          document_type?: Database["public"]["Enums"]["document_type"];
          document_type_override?: Database["public"]["Enums"]["document_type"] | null;
          error_message?: string | null;
          filename: string;
          id?: string;
          is_document_type_manual?: boolean;
          mime_type?: string;
          processing_status?: Database["public"]["Enums"]["document_processing_status"];
          project_id: string;
          size_bytes?: number | null;
          storage_path?: string | null;
          updated_at?: string;
        };
        Update: {
          auto_delete_after?: string | null;
          classification_confidence?: number | null;
          classification_details?: Json | null;
          classification_status?: Database["public"]["Enums"]["classification_status"];
          classification_version?: string | null;
          classified_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_reason?: string | null;
          detected_syndic?: string | null;
          document_type?: Database["public"]["Enums"]["document_type"];
          document_type_override?: Database["public"]["Enums"]["document_type"] | null;
          error_message?: string | null;
          filename?: string;
          id?: string;
          is_document_type_manual?: boolean;
          mime_type?: string;
          processing_status?: Database["public"]["Enums"]["document_processing_status"];
          project_id?: string;
          size_bytes?: number | null;
          storage_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      extracted_field_sources: {
        Row: {
          confidence: number | null;
          created_at: string;
          document_id: string;
          extracted_field_id: string;
          matched_rule: string | null;
          source_excerpt: string | null;
          source_locator: Json | null;
          source_page: number | null;
          source_value: Json | null;
        };
        Insert: {
          confidence?: number | null;
          created_at?: string;
          document_id: string;
          extracted_field_id: string;
          matched_rule?: string | null;
          source_excerpt?: string | null;
          source_locator?: Json | null;
          source_page?: number | null;
          source_value?: Json | null;
        };
        Update: {
          confidence?: number | null;
          created_at?: string;
          document_id?: string;
          extracted_field_id?: string;
          matched_rule?: string | null;
          source_excerpt?: string | null;
          source_locator?: Json | null;
          source_page?: number | null;
          source_value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "extracted_field_sources_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extracted_field_sources_extracted_field_id_fkey";
            columns: ["extracted_field_id"];
            isOneToOne: false;
            referencedRelation: "extracted_fields";
            referencedColumns: ["id"];
          },
        ];
      };
      extracted_fields: {
        Row: {
          confidence: number | null;
          created_at: string;
          edited_by_user_at: string | null;
          extraction_version: string;
          field_id: string;
          field_origin: "automatic" | "manual" | "validated";
          id: string;
          label: string;
          manually_edited: boolean;
          normalized_value: string | null;
          project_id: string;
          section: string;
          source_document_id: string | null;
          status: Database["public"]["Enums"]["field_status"];
          updated_at: string;
          value: Json | null;
        };
        Insert: {
          confidence?: number | null;
          created_at?: string;
          edited_by_user_at?: string | null;
          extraction_version?: string;
          field_id: string;
          field_origin?: "automatic" | "manual" | "validated";
          id?: string;
          label: string;
          manually_edited?: boolean;
          normalized_value?: string | null;
          project_id: string;
          section: string;
          source_document_id?: string | null;
          status?: Database["public"]["Enums"]["field_status"];
          updated_at?: string;
          value?: Json | null;
        };
        Update: {
          confidence?: number | null;
          created_at?: string;
          edited_by_user_at?: string | null;
          extraction_version?: string;
          field_id?: string;
          field_origin?: "automatic" | "manual" | "validated";
          id?: string;
          label?: string;
          manually_edited?: boolean;
          normalized_value?: string | null;
          project_id?: string;
          section?: string;
          source_document_id?: string | null;
          status?: Database["public"]["Enums"]["field_status"];
          updated_at?: string;
          value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "extracted_fields_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extracted_fields_source_document_id_fkey";
            columns: ["source_document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          id: string;
          project_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          stripe_session_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          id?: string;
          project_id: string;
          status?: Database["public"]["Enums"]["payment_status"];
          stripe_session_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          project_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          stripe_session_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_owner_context: {
        Row: {
          created_at: string;
          known_lot_number: string | null;
          owner_name: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          known_lot_number?: string | null;
          owner_name: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          known_lot_number?: string | null;
          owner_name?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_owner_context_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          download_token_expires_at: string | null;
          download_token_hash: string | null;
          email: string;
          id: string;
          paid_at: string | null;
          property_address: string;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          download_token_expires_at?: string | null;
          download_token_hash?: string | null;
          email: string;
          id?: string;
          paid_at?: string | null;
          property_address: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          download_token_expires_at?: string | null;
          download_token_hash?: string | null;
          email?: string;
          id?: string;
          paid_at?: string | null;
          property_address?: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          completion_rate: number;
          confidence_score: number;
          created_at: string;
          expires_at: string | null;
          final_pdf_generated_at: string | null;
          id: string;
          is_watermarked: boolean;
          pdf_storage_path: string | null;
          project_id: string;
          report_type: string;
          status: Database["public"]["Enums"]["report_status"];
          updated_at: string;
          user_validated: boolean;
          user_validation_checkbox_label: string | null;
          validated_at: string | null;
          validation_ip: unknown | null;
        };
        Insert: {
          completion_rate?: number;
          confidence_score?: number;
          created_at?: string;
          expires_at?: string | null;
          final_pdf_generated_at?: string | null;
          id?: string;
          is_watermarked?: boolean;
          pdf_storage_path?: string | null;
          project_id: string;
          report_type?: string;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
          user_validated?: boolean;
          user_validation_checkbox_label?: string | null;
          validated_at?: string | null;
          validation_ip?: unknown | null;
        };
        Update: {
          completion_rate?: number;
          confidence_score?: number;
          created_at?: string;
          expires_at?: string | null;
          final_pdf_generated_at?: string | null;
          id?: string;
          is_watermarked?: boolean;
          pdf_storage_path?: string | null;
          project_id?: string;
          report_type?: string;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
          user_validated?: boolean;
          user_validation_checkbox_label?: string | null;
          validated_at?: string | null;
          validation_ip?: unknown | null;
        };
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    Enums: {
      classification_status:
        | "pending"
        | "processing"
        | "classified"
        | "uncertain"
        | "insufficient_text"
        | "failed";
      document_processing_status: "pending" | "processing" | "processed" | "failed" | "deleted";
      document_type:
        | "unknown"
        | "appel_de_fonds"
        | "releve_coproprietaire"
        | "pv_ag"
        | "annexe_comptable"
        | "reglement_copropriete"
        | "fiche_synthetique"
        | "dtg"
        | "ppt"
        | "dpe_collectif"
        | "titre_propriete"
        | "other";
      field_status: "confirmed" | "uncertain" | "missing" | "inconsistent";
      payment_status: "pending" | "paid" | "failed" | "refunded" | "expired";
      project_status:
        | "draft"
        | "processing"
        | "review"
        | "awaiting_payment"
        | "completed"
        | "failed"
        | "expired";
      report_status: "draft" | "preview" | "ready" | "expired" | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends { Row: infer R }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never;

export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName] extends { Insert: infer I } ? I : never;

export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName] extends { Update: infer U } ? U : never;

export type Enums<EnumName extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][EnumName];
