import type {
  ClassificationStatus,
  ClassifiedDocumentType,
  TextPage,
} from "@/lib/classification/types";

import type { ExtractionFieldId } from "./catalog";

export type SimpleExtractionContext = {
  classificationStatus: ClassificationStatus;
  documentType: ClassifiedDocumentType;
  pages: TextPage[];
};

export type SimpleFieldCandidate = {
  confidence: number;
  excerpt: string;
  extractionVersion: string;
  fieldId: ExtractionFieldId;
  matchKey?: string;
  matchedRule: string;
  normalizedValue: string;
  page: number;
  value: string | number;
};

export type StoredSourceCandidate = {
  confidence: number;
  documentId: string;
  excerpt: string | null;
  extractionVersion: string;
  matchedRule: string | null;
  normalizedValue: string;
  page: number | null;
  value: string | number;
};

export type MergedSimpleField = {
  confidence: number;
  extractionVersion: string | null;
  normalizedValue: string | null;
  sourceDocumentId: string | null;
  status: "confirmed" | "uncertain" | "missing";
  value: string | number | null;
};
