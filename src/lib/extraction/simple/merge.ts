import type { MergedSimpleField, StoredSourceCandidate } from "./types";

export function canUpdateCanonicalField(manuallyEdited: boolean) {
  return !manuallyEdited;
}

export function mergeSimpleFieldSources(
  sources: StoredSourceCandidate[],
): MergedSimpleField {
  if (sources.length === 0) {
    return {
      confidence: 0,
      normalizedValue: null,
      sourceDocumentId: null,
      status: "missing",
      value: null,
    };
  }

  const ordered = [...sources].sort(
    (left, right) =>
      right.confidence - left.confidence ||
      left.documentId.localeCompare(right.documentId),
  );
  const winner = ordered[0];
  const distinctValues = new Set(
    ordered.map((source) => source.normalizedValue),
  );

  if (distinctValues.size > 1) {
    return {
      confidence: winner.confidence,
      normalizedValue: winner.normalizedValue,
      sourceDocumentId: winner.documentId,
      status: "uncertain",
      value: winner.value,
    };
  }

  const confidence = Math.min(
    100,
    winner.confidence + Math.min(10, (ordered.length - 1) * 5),
  );

  return {
    confidence,
    normalizedValue: winner.normalizedValue,
    sourceDocumentId: winner.documentId,
    status: confidence >= 85 ? "confirmed" : "uncertain",
    value: winner.value,
  };
}
