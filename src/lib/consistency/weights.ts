import { EXTRACTION_FIELD_DEFINITIONS } from "../extraction/simple/catalog";

export type ConsistencyWeight = 1 | 2 | 3;

export type ConsistencyFieldDefinition = {
  fieldId: string;
  label: string;
  section: string;
  weight: ConsistencyWeight;
};

const veryImportantFields = new Set([
  "property_address",
  "seller_name",
  "lot_number",
  "current_balance_amount",
  "unpaid_charges_amount",
  "annual_budget_amount",
  "works_fund_seller_share_amount",
  "legal_proceedings_description",
  "collective_loan",
]);

const importantFields = new Set([
  "syndic_name",
  "syndic_email",
  "account_statement_date",
  "current_quarter",
  "budget_vote_date",
  "ppt_status",
  "dtg_status",
  "collective_dpe_status",
]);

const secondaryFields = new Set([
  "syndic_phone",
  "syndic_manager",
  "payment_method",
  "seller_financial_comment",
]);

const additionalCatalogFields: Array<
  Omit<ConsistencyFieldDefinition, "weight">
> = [
  {
    fieldId: "seller_name",
    label: "Nom du vendeur",
    section: "identification_vendeur",
  },
  {
    fieldId: "lot_number",
    label: "Numéro des lots vendus",
    section: "lots_vendus",
  },
  {
    fieldId: "payment_method",
    label: "Mode de paiement habituel",
    section: "situation_financiere_vendeur",
  },
];

export function getFieldWeight(fieldId: string): ConsistencyWeight {
  if (veryImportantFields.has(fieldId)) {
    return 3;
  }

  if (importantFields.has(fieldId)) {
    return 2;
  }

  if (secondaryFields.has(fieldId)) {
    return 1;
  }

  return 1;
}

export function isVeryImportantField(fieldId: string) {
  return veryImportantFields.has(fieldId);
}

export const CONSISTENCY_FIELD_DEFINITIONS: ConsistencyFieldDefinition[] = [
  ...EXTRACTION_FIELD_DEFINITIONS.map((field) => ({
    fieldId: field.fieldId,
    label: field.label,
    section: field.section,
    weight: getFieldWeight(field.fieldId),
  })),
  ...additionalCatalogFields.map((field) => ({
    ...field,
    weight: getFieldWeight(field.fieldId),
  })),
];
