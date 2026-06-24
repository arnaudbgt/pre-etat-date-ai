export const AI_SUGGESTION_FIELD_IDS = [
  "annual_budget_amount",
  "approval_date",
  "budget_vote_date",
  "works_fund_quarterly_contribution",
  "works_fund_budget_percentage",
  "lot_number",
  "lot_tantiemes",
  "legal_proceedings_description",
  "collective_loan",
  "ppt_status",
  "dtg_status",
  "collective_dpe_status",
] as const;

export type AiSuggestionFieldId = (typeof AI_SUGGESTION_FIELD_IDS)[number];

const allowedFields = new Set<string>(AI_SUGGESTION_FIELD_IDS);

export function isAiSuggestionFieldId(value: unknown): value is AiSuggestionFieldId {
  return typeof value === "string" && allowedFields.has(value);
}
