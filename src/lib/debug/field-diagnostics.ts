import type { Json } from "@/types/database.types";

import { EXTRACTION_FIELD_BY_ID } from "@/lib/extraction/simple/catalog";

export type FieldFailureStage =
  | "document_type_gate"
  | "label_not_found"
  | "amount_not_found"
  | "date_not_found"
  | "normalization_failed"
  | "candidate_below_threshold"
  | "merge_rejected"
  | "manual_protected"
  | "not_implemented";

type FieldStatus = "confirmed" | "uncertain" | "missing" | "inconsistent";

type DebugFieldInput = {
  field_id: string;
  manually_edited: boolean;
  status: FieldStatus;
};

type DebugDocumentInput = {
  classification_status: string;
  document_type: string;
  document_type_override?: string | null;
};

type DebugSourceInput = {
  confidence: number | null;
  matched_rule: string | null;
  source_value?: Json | null;
};

export type FieldDebugDiagnostic = {
  best_candidate_confidence: number | null;
  best_candidate_rule: string | null;
  candidate_count: number;
  failure_stage: FieldFailureStage | null;
  rejection_reason: string;
};

const FIELD_DOCUMENT_TYPE_GATES: Record<string, string[]> = {
  account_statement_date: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "annexe_comptable",
    "fiche_synthetique",
  ],
  annual_budget_amount: ["pv_ag", "annexe_comptable", "fiche_synthetique"],
  approval_date: ["pv_ag", "annexe_comptable"],
  budget_vote_date: ["pv_ag"],
  collective_dpe_status: ["dpe_collectif", "fiche_synthetique", "pv_ag"],
  collective_loan: ["pv_ag", "annexe_comptable", "fiche_synthetique"],
  current_balance_amount: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "fiche_synthetique",
  ],
  current_balance_label: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "fiche_synthetique",
  ],
  current_quarter: ["appel_de_fonds"],
  dtg_status: ["dtg", "fiche_synthetique", "pv_ag"],
  future_works_calls: ["pv_ag", "annexe_comptable"],
  last_age_date: ["pv_ag"],
  last_ago_date: ["pv_ag"],
  legal_proceedings_description: [
    "pv_ag",
    "annexe_comptable",
    "fiche_synthetique",
  ],
  ppt_status: ["ppt", "fiche_synthetique", "pv_ag"],
  property_address: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "pv_ag",
    "fiche_synthetique",
  ],
  seller_financial_comment: ["releve_coproprietaire", "fiche_synthetique"],
  syndic_address: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "pv_ag",
    "fiche_synthetique",
  ],
  syndic_email: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "pv_ag",
    "fiche_synthetique",
  ],
  syndic_manager: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "pv_ag",
    "fiche_synthetique",
  ],
  syndic_mandate_end: ["pv_ag", "fiche_synthetique"],
  syndic_mandate_start: ["pv_ag", "fiche_synthetique"],
  syndic_name: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "pv_ag",
    "fiche_synthetique",
  ],
  syndic_phone: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "pv_ag",
    "fiche_synthetique",
  ],
  treasury_advance_amount: [
    "releve_coproprietaire",
    "annexe_comptable",
    "fiche_synthetique",
  ],
  unpaid_charges_amount: [
    "releve_coproprietaire",
    "annexe_comptable",
    "fiche_synthetique",
  ],
  voted_not_called_works: ["pv_ag", "annexe_comptable"],
  voted_paid_works: ["pv_ag", "annexe_comptable"],
  works_fund_annual_amount: [
    "appel_de_fonds",
    "annexe_comptable",
    "fiche_synthetique",
  ],
  works_fund_budget_percentage: ["pv_ag", "annexe_comptable"],
  works_fund_quarterly_contribution: ["appel_de_fonds"],
  works_fund_seller_share_amount: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "fiche_synthetique",
  ],
  works_fund_seller_share_date: [
    "appel_de_fonds",
    "releve_coproprietaire",
    "fiche_synthetique",
  ],
};

const AMOUNT_FIELDS = new Set([
  "annual_budget_amount",
  "current_balance_amount",
  "treasury_advance_amount",
  "unpaid_charges_amount",
  "works_fund_annual_amount",
  "works_fund_quarterly_contribution",
  "works_fund_seller_share_amount",
]);

const DATE_FIELDS = new Set([
  "account_statement_date",
  "approval_date",
  "budget_vote_date",
  "last_age_date",
  "last_ago_date",
  "syndic_mandate_end",
  "syndic_mandate_start",
  "works_fund_seller_share_date",
]);

const USEFUL_CANDIDATE_THRESHOLD = 50;

function effectiveDocumentType(document: DebugDocumentInput) {
  return document.document_type_override ?? document.document_type;
}

function hasRelevantDocument(fieldId: string, documents: DebugDocumentInput[]) {
  const allowedTypes = FIELD_DOCUMENT_TYPE_GATES[fieldId];

  if (!allowedTypes) {
    return true;
  }

  return documents.some(
    (document) =>
      document.classification_status !== "insufficient_text" &&
      allowedTypes.includes(effectiveDocumentType(document)),
  );
}

function hasNormalizationFailure(sources: DebugSourceInput[]) {
  return sources.some((source) => {
    const sourceValue = source.source_value;

    if (
      !sourceValue ||
      typeof sourceValue !== "object" ||
      Array.isArray(sourceValue)
    ) {
      return false;
    }

    return (
      "value" in sourceValue &&
      (!("normalizedValue" in sourceValue) ||
        typeof sourceValue.normalizedValue !== "string" ||
        sourceValue.normalizedValue.length === 0)
    );
  });
}

function missingStageForField(fieldId: string): FieldFailureStage {
  if (AMOUNT_FIELDS.has(fieldId)) {
    return "amount_not_found";
  }

  if (DATE_FIELDS.has(fieldId)) {
    return "date_not_found";
  }

  return "label_not_found";
}

function reasonForStage(stage: FieldFailureStage) {
  switch (stage) {
    case "amount_not_found":
      return "montant non trouvé";
    case "candidate_below_threshold":
      return "candidat rejeté par le seuil";
    case "date_not_found":
      return "date non trouvée";
    case "document_type_gate":
      return "aucun document prioritaire disponible";
    case "label_not_found":
      return "aucun libellé reconnu";
    case "manual_protected":
      return "champ protégé manuellement";
    case "merge_rejected":
      return "sources rejetées au merge";
    case "normalization_failed":
      return "normalisation impossible";
    case "not_implemented":
      return "champ non implémenté dans les extracteurs actuels";
  }
}

export function buildFieldDebugDiagnostic(input: {
  candidateCountOverride?: number;
  documents: DebugDocumentInput[];
  field: DebugFieldInput;
  sources: DebugSourceInput[];
}): FieldDebugDiagnostic {
  const candidateCount = input.candidateCountOverride ?? input.sources.length;
  const bestSource =
    input.sources.length > 0
      ? input.sources.reduce((best, source) =>
          (source.confidence ?? 0) > (best.confidence ?? 0) ? source : best,
        )
      : null;
  const bestConfidence = bestSource?.confidence ?? null;
  let failureStage: FieldFailureStage | null;

  if (input.field.manually_edited) {
    failureStage = "manual_protected";
  } else if (input.field.status === "confirmed") {
    failureStage = null;
  } else if (!(input.field.field_id in EXTRACTION_FIELD_BY_ID)) {
    failureStage = "not_implemented";
  } else if (!hasRelevantDocument(input.field.field_id, input.documents)) {
    failureStage = "document_type_gate";
  } else if (hasNormalizationFailure(input.sources)) {
    failureStage = "normalization_failed";
  } else if (
    bestConfidence !== null &&
    bestConfidence < USEFUL_CANDIDATE_THRESHOLD
  ) {
    failureStage = "candidate_below_threshold";
  } else if (input.sources.length > 0) {
    failureStage = "merge_rejected";
  } else {
    failureStage = missingStageForField(input.field.field_id);
  }

  return {
    best_candidate_confidence: bestConfidence,
    best_candidate_rule: bestSource?.matched_rule ?? null,
    candidate_count: candidateCount,
    failure_stage: failureStage,
    rejection_reason: failureStage
      ? reasonForStage(failureStage)
      : "champ confirmé",
  };
}
