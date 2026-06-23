import type { Json } from "@/types/database.types";

import { CONSISTENCY_FIELD_DEFINITIONS } from "./weights";
import {
  calculateCompletionRate,
  calculateConfidenceScore,
  getReportStatus,
} from "./scoring";
import type {
  ConsistencyDocument,
  ConsistencyFieldInput,
  ConsistencySource,
  FieldConsistencyDecision,
  ProjectConsistencyInput,
  ProjectConsistencySummary,
} from "./types";

function asRecord(value: Json | null): Record<string, Json | undefined> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : null;
}

function sourceNormalizedValue(source: ConsistencySource) {
  const record = asRecord(source.sourceValue);

  if (typeof record?.normalizedValue === "string") {
    return record.normalizedValue.trim().toLowerCase();
  }

  if (typeof record?.value === "string") {
    return record.value.trim().toLowerCase();
  }

  if (typeof record?.value === "number") {
    return record.value.toString();
  }

  return "";
}

function fieldHasValue(field: ConsistencyFieldInput | undefined) {
  if (!field) {
    return false;
  }

  if (field.normalizedValue && field.normalizedValue.trim().length > 0) {
    return true;
  }

  if (typeof field.value === "string") {
    return field.value.trim().length > 0;
  }

  if (typeof field.value === "number" || typeof field.value === "boolean") {
    return true;
  }

  if (Array.isArray(field.value)) {
    return field.value.length > 0;
  }

  return Boolean(field.value);
}

function documentById(documents: ConsistencyDocument[]) {
  return new Map(documents.map((document) => [document.id, document]));
}

function isClassifiedDocument(document: ConsistencyDocument | undefined) {
  return document?.classificationStatus === "classified";
}

function isWeakDocument(document: ConsistencyDocument | undefined) {
  return (
    !document ||
    document.classificationStatus === "uncertain" ||
    document.classificationStatus === "insufficient_text" ||
    document.classificationStatus === "pending" ||
    document.classificationStatus === "processing" ||
    document.classificationStatus === "failed"
  );
}

function sourceConfidence(source: ConsistencySource) {
  return source.confidence ?? 0;
}

function hasPositiveNegativeContradiction(values: Set<string>) {
  const positives = new Set(["yes", "true", "adopted", "completed"]);
  const negatives = new Set(["no", "false", "absent", "[]"]);
  let hasPositive = false;
  let hasNegative = false;

  for (const value of values) {
    if (positives.has(value)) {
      hasPositive = true;
    }

    if (negatives.has(value)) {
      hasNegative = true;
    }
  }

  return hasPositive && hasNegative;
}

function decideField(
  definition: (typeof CONSISTENCY_FIELD_DEFINITIONS)[number],
  field: ConsistencyFieldInput | undefined,
  sources: ConsistencySource[],
  documents: Map<string, ConsistencyDocument>,
): FieldConsistencyDecision {
  const previousStatus = field?.status ?? "missing";
  const previousConfidence = field?.confidence ?? 0;
  const present = fieldHasValue(field);
  const sourcesWithValue = sources.filter(
    (source) => sourceNormalizedValue(source).length > 0,
  );
  const strongSources = sourcesWithValue.filter((source) => {
    const document = documents.get(source.documentId);
    return sourceConfidence(source) >= 85 && isClassifiedDocument(document);
  });
  const weakSources = sourcesWithValue.filter((source) =>
    isWeakDocument(documents.get(source.documentId)),
  );
  const strongValues = new Set(strongSources.map(sourceNormalizedValue));
  const allValues = new Set(sourcesWithValue.map(sourceNormalizedValue));
  const hasStrongContradiction =
    strongValues.size > 1 || hasPositiveNegativeContradiction(strongValues);
  const sourcesUsed = sourcesWithValue.map((source) => source.documentId);

  if (field?.manuallyEdited) {
    return {
      confidence: previousConfidence,
      field_id: definition.fieldId,
      manually_edited: true,
      previous_confidence: previousConfidence,
      previous_status: previousStatus,
      reason:
        "Champ modifié manuellement : inclus dans les scores, non recalculé.",
      sources_count: sourcesWithValue.length,
      sources_used: sourcesUsed,
      status: previousStatus,
      weight: definition.weight,
    };
  }

  if (!present && sourcesWithValue.length === 0) {
    return {
      confidence: 0,
      field_id: definition.fieldId,
      manually_edited: false,
      previous_confidence: previousConfidence,
      previous_status: previousStatus,
      reason: "Aucune valeur exploitable ni source fiable trouvée.",
      sources_count: 0,
      sources_used: [],
      status: "missing",
      weight: definition.weight,
    };
  }

  if (hasStrongContradiction) {
    return {
      confidence: Math.max(50, Math.min(84, previousConfidence || 70)),
      field_id: definition.fieldId,
      manually_edited: false,
      previous_confidence: previousConfidence,
      previous_status: previousStatus,
      reason: "Valeurs incompatibles détectées entre plusieurs sources fortes.",
      sources_count: sourcesWithValue.length,
      sources_used: sourcesUsed,
      status: "inconsistent",
      weight: definition.weight,
    };
  }

  if (allValues.size > 1 && strongSources.length >= 1) {
    return {
      confidence: Math.max(50, Math.min(84, previousConfidence || 75)),
      field_id: definition.fieldId,
      manually_edited: false,
      previous_confidence: previousConfidence,
      previous_status: previousStatus,
      reason: "Valeur présente mais ambiguë entre plusieurs sources.",
      sources_count: sourcesWithValue.length,
      sources_used: sourcesUsed,
      status: "uncertain",
      weight: definition.weight,
    };
  }

  if (
    previousConfidence >= 85 &&
    strongSources.length >= 1 &&
    weakSources.length === 0
  ) {
    return {
      confidence: Math.min(100, previousConfidence),
      field_id: definition.fieldId,
      manually_edited: false,
      previous_confidence: previousConfidence,
      previous_status: previousStatus,
      reason: "Valeur présente, source forte et aucune contradiction détectée.",
      sources_count: sourcesWithValue.length,
      sources_used: sourcesUsed,
      status: "confirmed",
      weight: definition.weight,
    };
  }

  if (sourcesWithValue.length > 0 || present) {
    const confidence =
      previousConfidence > 0
        ? Math.max(50, Math.min(84, previousConfidence))
        : 50;

    return {
      confidence,
      field_id: definition.fieldId,
      manually_edited: false,
      previous_confidence: previousConfidence,
      previous_status: previousStatus,
      reason:
        weakSources.length > 0
          ? "Valeur trouvée mais document source faible ou classification incertaine."
          : "Valeur trouvée avec un niveau de confiance insuffisant.",
      sources_count: sourcesWithValue.length,
      sources_used: sourcesUsed,
      status: "uncertain",
      weight: definition.weight,
    };
  }

  return {
    confidence: 0,
    field_id: definition.fieldId,
    manually_edited: false,
    previous_confidence: previousConfidence,
    previous_status: previousStatus,
    reason: "Silence documentaire.",
    sources_count: sourcesWithValue.length,
    sources_used: sourcesUsed,
    status: "missing",
    weight: definition.weight,
  };
}

export function evaluateProjectConsistency(
  input: ProjectConsistencyInput,
): ProjectConsistencySummary {
  const fieldsById = new Map(
    input.fields.map((field) => [field.fieldId, field]),
  );
  const sourcesByFieldId = new Map<string, ConsistencySource[]>();
  const fieldIdByRowId = new Map(
    input.fields
      .filter((field) => field.id)
      .map((field) => [field.id as string, field.fieldId]),
  );

  for (const source of input.sources) {
    const fieldId = fieldIdByRowId.get(source.extractedFieldId);

    if (!fieldId) {
      continue;
    }

    const current = sourcesByFieldId.get(fieldId) ?? [];
    current.push(source);
    sourcesByFieldId.set(fieldId, current);
  }

  const documents = documentById(input.documents);
  const decisions = CONSISTENCY_FIELD_DEFINITIONS.map((definition) =>
    decideField(
      definition,
      fieldsById.get(definition.fieldId),
      sourcesByFieldId.get(definition.fieldId) ?? [],
      documents,
    ),
  );
  const completionRate = calculateCompletionRate(decisions);
  const confidenceScore = calculateConfidenceScore(decisions);
  const reportStatus = getReportStatus(decisions, confidenceScore);

  return {
    classified_documents_count: input.documents.filter(
      (document) => document.classificationStatus === "classified",
    ).length,
    completion_rate: completionRate,
    confidence_score: confidenceScore,
    confirmed_count: decisions.filter((field) => field.status === "confirmed")
      .length,
    documents_count: input.documents.length,
    fields: decisions,
    inconsistent_count: decisions.filter(
      (field) => field.status === "inconsistent",
    ).length,
    missing_count: decisions.filter((field) => field.status === "missing")
      .length,
    project_id: input.projectId,
    report_status: reportStatus,
    uncertain_count: decisions.filter((field) => field.status === "uncertain")
      .length,
  };
}
