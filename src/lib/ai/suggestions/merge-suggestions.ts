import type { AiFieldSuggestion } from "./schema";

type SuggestionDocument = {
  document_type: string;
  filename: string;
};

const DOCUMENT_PRIORITY = [
  "titre_propriete",
  "releve_coproprietaire",
  "appel_de_fonds",
  "pv_ag",
  "fiche_synthetique",
  "annexe_comptable",
  "other",
];

function normalizeValue(value: AiFieldSuggestion["value"]) {
  return JSON.stringify(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sourcePriority(
  suggestion: AiFieldSuggestion,
  documentTypeByFilename: Map<string, string>,
) {
  const type = suggestion.source_document
    ? documentTypeByFilename.get(suggestion.source_document)
    : null;
  const index = type ? DOCUMENT_PRIORITY.indexOf(type) : -1;
  return index === -1 ? DOCUMENT_PRIORITY.length : index;
}

function sortSuggestions(
  suggestions: AiFieldSuggestion[],
  documentTypeByFilename: Map<string, string>,
) {
  return [...suggestions].sort((a, b) => {
    const rejectedA = a.status === "rejected" ? 1 : 0;
    const rejectedB = b.status === "rejected" ? 1 : 0;
    if (rejectedA !== rejectedB) return rejectedA - rejectedB;

    const priority = sourcePriority(a, documentTypeByFilename) - sourcePriority(b, documentTypeByFilename);
    if (priority !== 0) return priority;

    return b.confidence - a.confidence;
  });
}

function asStringArray(value: AiFieldSuggestion["value"]) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : null))
      .filter((item): item is string => Boolean(item));
  }

  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }

  return [];
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mergeComplementaryValues(
  fieldId: string,
  suggestions: AiFieldSuggestion[],
  documentTypeByFilename: Map<string, string>,
) {
  const candidates = sortSuggestions(
    suggestions.filter((suggestion) => suggestion.status !== "rejected"),
    documentTypeByFilename,
  );

  if (candidates.length === 0) {
    return sortSuggestions(suggestions, documentTypeByFilename)[0] ?? null;
  }

  const values = unique(candidates.flatMap((suggestion) => asStringArray(suggestion.value)));
  const best = candidates[0];

  if (values.length <= 1) {
    return best;
  }

  return {
    ...best,
    confidence: Math.min(best.confidence, Math.max(...candidates.map((item) => item.confidence))),
    normalized_value: values.join(", "),
    reasoning: [
      best.reasoning,
      `Valeurs complémentaires fusionnées pour ${fieldId}.`,
    ]
      .filter(Boolean)
      .join(" "),
    should_apply: candidates.every((item) => item.should_apply),
    value: values,
  } satisfies AiFieldSuggestion;
}

function mergeFieldSuggestions(
  fieldId: string,
  suggestions: AiFieldSuggestion[],
  documentTypeByFilename: Map<string, string>,
): AiFieldSuggestion[] {
  if (fieldId === "lot_number" || fieldId === "lot_tantiemes") {
    const merged = mergeComplementaryValues(fieldId, suggestions, documentTypeByFilename);
    return merged ? [merged] : [];
  }

  const byValue = new Map<string, AiFieldSuggestion[]>();
  for (const suggestion of suggestions) {
    const key = normalizeValue(suggestion.value);
    byValue.set(key, [...(byValue.get(key) ?? []), suggestion]);
  }

  const bestByValue = [...byValue.values()].map(
    (items) => sortSuggestions(items, documentTypeByFilename)[0],
  );
  const sorted = sortSuggestions(bestByValue, documentTypeByFilename);

  if (sorted.length <= 1) {
    return sorted;
  }

  const best = sorted[0];
  const meaningfulConflicts = sorted.filter(
    (suggestion) =>
      suggestion.status !== "rejected" && normalizeValue(suggestion.value) !== normalizeValue(best.value),
  );

  if (meaningfulConflicts.length === 0) {
    return [best];
  }

  return [
    {
      ...best,
      confidence: Math.min(best.confidence, 80),
      reasoning: [
        best.reasoning,
        "Plusieurs valeurs différentes ont été proposées ; revue utilisateur nécessaire.",
      ]
        .filter(Boolean)
        .join(" "),
      should_apply: false,
      status: "proposed_conflict" as const,
    },
  ];
}

export function mergeAiFieldSuggestions(input: {
  documents: SuggestionDocument[];
  suggestions: AiFieldSuggestion[];
}) {
  const documentTypeByFilename = new Map(
    input.documents.map((document) => [document.filename, document.document_type]),
  );
  const byField = new Map<string, AiFieldSuggestion[]>();

  for (const suggestion of input.suggestions) {
    byField.set(suggestion.field_id, [
      ...(byField.get(suggestion.field_id) ?? []),
      suggestion,
    ]);
  }

  return [...byField.entries()].flatMap(([fieldId, suggestions]) =>
    mergeFieldSuggestions(fieldId, suggestions, documentTypeByFilename),
  );
}
