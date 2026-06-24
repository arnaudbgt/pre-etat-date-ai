import type { AiFieldSuggestion } from "./schema";

type GuardrailResult = {
  reason: string | null;
  suggestion: AiFieldSuggestion;
};

function normalize(value: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function textForSuggestion(suggestion: AiFieldSuggestion) {
  return normalize(
    [suggestion.source_excerpt, suggestion.reasoning, suggestion.normalized_value]
      .filter(Boolean)
      .join(" "),
  );
}

function downgrade(
  suggestion: AiFieldSuggestion,
  reason: string,
  status: AiFieldSuggestion["status"] = "rejected",
): GuardrailResult {
  return {
    reason,
    suggestion: {
      ...suggestion,
      confidence: Math.min(suggestion.confidence, 60),
      should_apply: false,
      status,
    },
  };
}

function pass(suggestion: AiFieldSuggestion): GuardrailResult {
  return { reason: null, suggestion };
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

const BALANCE_CONTEXT = [
  /solde\s+au/i,
  /solde\s+debiteur/i,
  /solde\s+crediteur/i,
  /situation\s+de\s+compte/i,
  /compte\s+coproprietaire/i,
];

const NOT_BALANCE_CONTEXT = [
  /montant\s+a\s+payer/i,
  /provisions?\s+appelees?/i,
  /appel\s+(?:de\s+)?travaux/i,
  /cotisation\s+(?:au\s+)?fonds\s+(?:de\s+)?travaux/i,
];

export function applyFieldAiGuardrails(
  suggestion: AiFieldSuggestion,
): GuardrailResult {
  const text = textForSuggestion(suggestion);

  if (suggestion.field_id === "current_balance_amount") {
    if (!hasAny(text, BALANCE_CONTEXT)) {
      return downgrade(suggestion, "current_balance_without_balance_context");
    }

    if (hasAny(text, NOT_BALANCE_CONTEXT) && !/solde/i.test(text)) {
      return downgrade(suggestion, "current_balance_forbidden_amount_context");
    }
  }

  if (suggestion.field_id === "current_quarter") {
    const hasFullPeriod =
      /(?:periode\s+)?du\s+\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\s+au\s+\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?/i.test(
        text,
      ) ||
      /\bT[1-4]\b/i.test(suggestion.source_excerpt ?? "") ||
      /trimestre/i.test(text);
    const dateOnly =
      /^\s*\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\s*$/.test(
        String(suggestion.value ?? ""),
      ) || /^\s*\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\s*$/.test(text);

    if (!hasFullPeriod || dateOnly) {
      return downgrade(suggestion, "current_quarter_requires_full_period");
    }
  }

  if (suggestion.field_id === "works_fund_budget_percentage") {
    if (!/%|pourcentage|fixee?\s+a\s+\d+(?:[,.]\d+)?\s*%/i.test(text)) {
      return downgrade(suggestion, "works_fund_percentage_not_explicit");
    }
  }

  if (suggestion.field_id === "works_fund_seller_share_amount") {
    const hasShareContext =
      /quote[\s-]*part|votre\s+quote[\s-]*part|part\s+(?:acquise|vendeur)|lot\s+du\s+vendeur/i.test(
        text,
      );
    const hasFundContext = /fonds\s+(?:de\s+)?travaux|travaux/i.test(text);

    if (!hasShareContext || !hasFundContext) {
      return downgrade(suggestion, "works_fund_seller_share_context_missing");
    }
  }

  if (
    suggestion.field_id === "lot_number" &&
    /\b413\b/.test(String(suggestion.value)) &&
    !/\b413\b/.test(text)
  ) {
    return downgrade(suggestion, "lot_number_not_supported_by_excerpt");
  }

  return pass(suggestion);
}

export function applyFieldAiGuardrailsToSuggestions(
  suggestions: AiFieldSuggestion[],
) {
  return suggestions.map((suggestion) => applyFieldAiGuardrails(suggestion));
}
