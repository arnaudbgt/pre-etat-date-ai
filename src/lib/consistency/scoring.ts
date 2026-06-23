import { isVeryImportantField } from "./weights";
import type {
  FieldConsistencyDecision,
  ProjectConsistencySummary,
} from "./types";

export function calculateCompletionRate(fields: FieldConsistencyDecision[]) {
  const totalWeight = fields.reduce((sum, field) => sum + field.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const presentWeight = fields
    .filter((field) => field.status !== "missing")
    .reduce((sum, field) => sum + field.weight, 0);

  return Math.round((presentWeight / totalWeight) * 100);
}

export function calculateConfidenceScore(fields: FieldConsistencyDecision[]) {
  const scoredFields = fields.filter(
    (field) => field.status === "confirmed" || field.status === "uncertain",
  );
  const scoredWeight = scoredFields.reduce(
    (sum, field) => sum + field.weight,
    0,
  );

  const weightedConfidence =
    scoredWeight === 0
      ? 0
      : scoredFields.reduce(
          (sum, field) => sum + field.confidence * field.weight,
          0,
        ) / scoredWeight;

  const inconsistencyPenalty = fields
    .filter((field) => field.status === "inconsistent")
    .reduce((penalty, field) => {
      if (field.weight === 3) {
        return penalty + 8;
      }

      if (field.weight === 2) {
        return penalty + 5;
      }

      return penalty + 3;
    }, 0);

  return Math.max(
    0,
    Math.min(100, Math.round(weightedConfidence - inconsistencyPenalty)),
  );
}

export function getReportStatus(
  fields: FieldConsistencyDecision[],
  confidenceScore: number,
): ProjectConsistencySummary["report_status"] {
  const hasVeryImportantBlockingField = fields.some(
    (field) =>
      isVeryImportantField(field.field_id) &&
      (field.status === "missing" || field.status === "inconsistent"),
  );

  if (hasVeryImportantBlockingField) {
    return "draft";
  }

  if (confidenceScore >= 85) {
    return "ready";
  }

  return "preview";
}
