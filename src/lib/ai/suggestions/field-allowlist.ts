export const AI_SUGGESTION_FIELD_IDS = [
  "seller_name",
  "seller_address",
  "seller_account_number",
  "property_address",
  "property_reference",
  "lot_number",
  "lot_description",
  "lot_tantiemes",
  "syndic_name",
  "syndic_manager",
  "syndic_address",
  "syndic_phone",
  "syndic_email",
  "account_statement_date",
  "current_balance_amount",
  "current_balance_label",
  "unpaid_charges_amount",
  "treasury_advance_amount",
  "seller_financial_comment",
  "current_quarter",
  "annual_budget_amount",
  "budget_vote_date",
  "works_fund_quarterly_contribution",
  "works_fund_annual_amount",
  "works_fund_budget_percentage",
  "works_fund_seller_share_amount",
  "works_fund_seller_share_date",
  "voted_paid_works",
  "future_works_calls",
  "voted_not_called_works",
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
