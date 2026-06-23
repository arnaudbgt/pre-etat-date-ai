import type { Json } from "@/types/database.types";

export type ConsistencyFieldStatus =
  | "confirmed"
  | "uncertain"
  | "missing"
  | "inconsistent";

export type ConsistencyDocument = {
  classificationStatus:
    | "pending"
    | "processing"
    | "classified"
    | "uncertain"
    | "insufficient_text"
    | "failed";
  documentType: string;
  id: string;
};

export type ConsistencySource = {
  confidence: number | null;
  documentId: string;
  extractedFieldId: string;
  matchedRule: string | null;
  sourceValue: Json | null;
};

export type ConsistencyFieldInput = {
  confidence: number | null;
  fieldId: string;
  id?: string;
  manuallyEdited: boolean;
  normalizedValue: string | null;
  status: ConsistencyFieldStatus;
  value: Json | null;
};

export type FieldConsistencyDecision = {
  confidence: number;
  field_id: string;
  manually_edited: boolean;
  previous_confidence: number;
  previous_status: ConsistencyFieldStatus;
  reason: string;
  sources_count: number;
  sources_used: string[];
  status: ConsistencyFieldStatus;
  weight: number;
};

export type ProjectConsistencyInput = {
  documents: ConsistencyDocument[];
  fields: ConsistencyFieldInput[];
  projectId: string;
  sources: ConsistencySource[];
};

export type ProjectConsistencySummary = {
  classified_documents_count: number;
  completion_rate: number;
  confidence_score: number;
  confirmed_count: number;
  documents_count: number;
  fields: FieldConsistencyDecision[];
  inconsistent_count: number;
  missing_count: number;
  project_id: string;
  report_status: "draft" | "preview" | "ready";
  uncertain_count: number;
};
