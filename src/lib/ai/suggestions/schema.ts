import type { Json } from "@/types/database.types";

import { AI_SUGGESTION_FIELD_IDS, isAiSuggestionFieldId } from "./field-allowlist";

export type AiSuggestionStatus =
  | "proposed"
  | "proposed_review"
  | "proposed_conflict"
  | "rejected";

export type AiFieldSuggestion = {
  confidence: number;
  field_id: string;
  normalized_value: string | null;
  reasoning: string | null;
  should_apply: boolean;
  source_document: string | null;
  source_page: number | null;
  source_excerpt: string | null;
  status: AiSuggestionStatus;
  value: Json;
};

const INFERENCE_MARKER_PATTERN =
  /\b(?:implicite|calcule|deduit|estime|extrapole|inferred|calculated|estimated)\b/i;

function truncate(value: string, limit: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= limit ? compact : `${compact.slice(0, limit - 1)}…`;
}

function normalizeComparable(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsInferenceMarker(value: string | null) {
  return value ? INFERENCE_MARKER_PATTERN.test(normalizeComparable(value)) : false;
}

export function applyAiSuggestionSafetyGuards<T extends {
  confidence: number;
  field_id: string;
  reasoning: string | null;
  should_apply: boolean;
  source_excerpt: string | null;
  status?: string | null;
}>(suggestion: T): T {
  let guarded = suggestion;

  if (!guarded.source_excerpt) {
    guarded = {
      ...guarded,
      confidence: Math.min(guarded.confidence, 60),
      should_apply: false,
    };
  }

  if (guarded.status && guarded.status !== "proposed") {
    guarded = { ...guarded, should_apply: false };
  }

  if (
    !containsInferenceMarker(guarded.reasoning) &&
    !containsInferenceMarker(guarded.source_excerpt)
  ) {
    return guarded;
  }

  return {
    ...guarded,
    confidence: Math.min(guarded.confidence, 60),
    should_apply: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isJsonValue(value: unknown): value is Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

export function normalizeAiSuggestion(
  raw: unknown,
  minApplyConfidence: number,
): AiFieldSuggestion | null {
  const record = asRecord(raw);

  if (!record || !isAiSuggestionFieldId(record.field_id)) {
    return null;
  }

  if (!isJsonValue(record.value)) {
    return null;
  }

  const confidence = Number(record.confidence);

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    return null;
  }

  const sourcePage =
    typeof record.source_page === "number" &&
    Number.isInteger(record.source_page) &&
    record.source_page > 0
      ? record.source_page
      : null;
  const status: AiSuggestionStatus =
    record.status === "proposed_review" ||
    record.status === "proposed_conflict" ||
    record.status === "rejected"
      ? record.status
      : "proposed";

  return applyAiSuggestionSafetyGuards({
    confidence,
    field_id: record.field_id,
    normalized_value:
      typeof record.normalized_value === "string"
        ? truncate(record.normalized_value, 500)
        : null,
    reasoning:
      typeof record.reasoning === "string"
        ? truncate(record.reasoning, 500)
        : null,
    should_apply:
      Boolean(record.should_apply) && confidence >= minApplyConfidence,
    source_document:
      typeof record.source_document === "string"
        ? truncate(record.source_document, 260)
        : null,
    source_excerpt:
      typeof record.source_excerpt === "string"
        ? truncate(record.source_excerpt, 200)
        : null,
    source_page: sourcePage,
    status,
    value: record.value,
  });
}

export function normalizeAiSuggestionsResponse(
  raw: unknown,
  minApplyConfidence: number,
) {
  const record = asRecord(raw);
  const suggestions = Array.isArray(record?.suggestions)
    ? record.suggestions
    : [];

  return suggestions
    .map((suggestion) =>
      normalizeAiSuggestion(suggestion, minApplyConfidence),
    )
    .filter((suggestion): suggestion is AiFieldSuggestion => Boolean(suggestion));
}

export const AI_SUGGESTIONS_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    suggestions: {
      items: {
        additionalProperties: false,
        properties: {
          confidence: { maximum: 100, minimum: 0, type: "number" },
          field_id: {
            enum: AI_SUGGESTION_FIELD_IDS,
            type: "string",
          },
          normalized_value: { type: ["string", "null"] },
          reasoning: { type: ["string", "null"] },
          should_apply: { type: "boolean" },
          source_document: { type: ["string", "null"] },
          source_excerpt: { type: ["string", "null"] },
          source_page: { type: ["integer", "null"] },
          status: {
            enum: [
              "proposed",
              "proposed_review",
              "proposed_conflict",
              "rejected",
            ],
            type: "string",
          },
          value: {
            items: {
              type: ["string", "number", "boolean", "null"],
            },
            type: ["string", "number", "boolean", "array", "null"],
          },
        },
        required: [
          "field_id",
          "value",
          "normalized_value",
          "confidence",
          "source_document",
          "source_page",
          "source_excerpt",
          "reasoning",
          "should_apply",
          "status",
        ],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["suggestions"],
  type: "object",
} as const;
