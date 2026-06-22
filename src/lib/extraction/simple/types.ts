import type {
  ClassificationStatus,
  ClassifiedDocumentType,
  TextPage,
} from "@/lib/classification/types";

import type { SimpleFieldId } from "./catalog";

export type SimpleExtractionContext = {
  classificationStatus: ClassificationStatus;
  documentType: ClassifiedDocumentType;
  pages: TextPage[];
};

export type SimpleFieldCandidate = {
  confidence: number;
  excerpt: string;
  fieldId: SimpleFieldId;
  matchedRule: string;
  normalizedValue: string;
  page: number;
  value: string;
};

export type StoredSourceCandidate = {
  confidence: number;
  documentId: string;
  excerpt: string | null;
  matchedRule: string | null;
  normalizedValue: string;
  page: number | null;
  value: string;
};

export type MergedSimpleField = {
  confidence: number;
  normalizedValue: string | null;
  sourceDocumentId: string | null;
  status: "confirmed" | "uncertain" | "missing";
  value: string | null;
};
