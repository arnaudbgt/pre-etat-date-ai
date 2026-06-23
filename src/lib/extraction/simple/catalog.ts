export const SIMPLE_EXTRACTION_VERSION = "simple-rules-v1";
export const FINANCIAL_EXTRACTION_VERSION = "financial-rules-v1";
export const COMPLEX_EXTRACTION_VERSION = "complex-rules-v1";

export const SIMPLE_FIELD_DEFINITIONS = [
  {
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    fieldId: "syndic_name",
    label: "Nom du syndic",
    section: "syndic",
  },
  {
    fieldId: "syndic_manager",
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    label: "Gestionnaire de copropriété",
    section: "syndic",
  },
  {
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    fieldId: "syndic_address",
    label: "Adresse du syndic",
    section: "syndic",
  },
  {
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    fieldId: "syndic_phone",
    label: "Téléphone du syndic",
    section: "syndic",
  },
  {
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    fieldId: "syndic_email",
    label: "Email du syndic",
    section: "syndic",
  },
  {
    fieldId: "property_address",
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    label: "Adresse de la copropriété",
    section: "identification_immeuble",
  },
  {
    fieldId: "approval_date",
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    label: "Date d’approbation des comptes",
    section: "charges_copropriete",
  },
  {
    fieldId: "last_ago_date",
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    label: "Date de la dernière AG ordinaire",
    section: "informations_complementaires",
  },
  {
    fieldId: "last_age_date",
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    label: "Date de la dernière AG extraordinaire",
    section: "informations_complementaires",
  },
  {
    fieldId: "syndic_mandate_start",
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    label: "Début du mandat du syndic",
    section: "syndic",
  },
  {
    fieldId: "syndic_mandate_end",
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
    label: "Fin du mandat du syndic",
    section: "syndic",
  },
] as const;

export const FINANCIAL_FIELD_DEFINITIONS = [
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "account_statement_date",
    label: "Date du relevé de compte",
    section: "situation_financiere_vendeur",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "current_balance_amount",
    label: "Solde actuel du vendeur",
    section: "situation_financiere_vendeur",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "current_balance_label",
    label: "Nature du solde",
    section: "situation_financiere_vendeur",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "unpaid_charges_amount",
    label: "Charges impayées",
    section: "situation_financiere_vendeur",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "treasury_advance_amount",
    label: "Avance de trésorerie",
    section: "situation_financiere_vendeur",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "seller_financial_comment",
    label: "Commentaire sur la situation financière",
    section: "situation_financiere_vendeur",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "current_quarter",
    label: "Trimestre en cours",
    section: "charges_copropriete",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "annual_budget_amount",
    label: "Budget prévisionnel annuel",
    section: "charges_copropriete",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "budget_vote_date",
    label: "Date de vote du budget",
    section: "charges_copropriete",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "works_fund_quarterly_contribution",
    label: "Cotisation trimestrielle au fonds travaux",
    section: "fonds_travaux",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "works_fund_annual_amount",
    label: "Cotisation annuelle au fonds travaux",
    section: "fonds_travaux",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "works_fund_budget_percentage",
    label: "Pourcentage du budget affecté au fonds travaux",
    section: "fonds_travaux",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "works_fund_seller_share_amount",
    label: "Part du fonds travaux rattachée aux lots",
    section: "fonds_travaux",
  },
  {
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId: "works_fund_seller_share_date",
    label: "Date de la part du fonds travaux",
    section: "fonds_travaux",
  },
] as const;

export const COMPLEX_FIELD_DEFINITIONS = [
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "voted_paid_works",
    label: "Travaux votés et payés",
    section: "travaux_votes",
  },
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "future_works_calls",
    label: "Appels de fonds travaux futurs",
    section: "travaux_votes",
  },
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "voted_not_called_works",
    label: "Travaux votés non encore appelés",
    section: "travaux_votes",
  },
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "legal_proceedings_description",
    label: "Procédures concernant la copropriété",
    section: "procedures",
  },
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "collective_loan",
    label: "Emprunt collectif en cours",
    section: "procedures",
  },
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "ppt_status",
    label: "Statut du plan pluriannuel de travaux",
    section: "informations_complementaires",
  },
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "collective_dpe_status",
    label: "Statut du DPE collectif",
    section: "informations_complementaires",
  },
  {
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId: "dtg_status",
    label: "Statut du diagnostic technique global",
    section: "informations_complementaires",
  },
] as const;

export const EXTRACTION_FIELD_DEFINITIONS = [
  ...SIMPLE_FIELD_DEFINITIONS,
  ...FINANCIAL_FIELD_DEFINITIONS,
  ...COMPLEX_FIELD_DEFINITIONS,
] as const;

export type SimpleFieldId =
  (typeof SIMPLE_FIELD_DEFINITIONS)[number]["fieldId"];
export type FinancialFieldId =
  (typeof FINANCIAL_FIELD_DEFINITIONS)[number]["fieldId"];
export type ComplexFieldId =
  (typeof COMPLEX_FIELD_DEFINITIONS)[number]["fieldId"];
export type ExtractionFieldId =
  (typeof EXTRACTION_FIELD_DEFINITIONS)[number]["fieldId"];

export const EXTRACTION_FIELD_BY_ID = Object.fromEntries(
  EXTRACTION_FIELD_DEFINITIONS.map((field) => [field.fieldId, field]),
) as Record<ExtractionFieldId, (typeof EXTRACTION_FIELD_DEFINITIONS)[number]>;
