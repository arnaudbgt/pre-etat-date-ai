export type ResultFieldDefinition = {
  fieldId: string;
  label: string;
};

export type ResultSection = {
  fields: ResultFieldDefinition[];
  id: string;
  title: string;
};

export const RESULT_SECTIONS: ResultSection[] = [
  {
    fields: [
      { fieldId: "seller_name", label: "Vendeur" },
      { fieldId: "seller_address", label: "Adresse du vendeur" },
      { fieldId: "seller_account_number", label: "Compte copropriétaire" },
      { fieldId: "property_address", label: "Immeuble" },
      { fieldId: "property_reference", label: "Référence immeuble" },
      { fieldId: "lot_number", label: "Lots vendus" },
      { fieldId: "lot_description", label: "Description des lots" },
      { fieldId: "lot_tantiemes", label: "Tantièmes des lots" },
      { fieldId: "syndic_name", label: "Syndic" },
      { fieldId: "syndic_manager", label: "Gestionnaire" },
      { fieldId: "syndic_address", label: "Adresse du syndic" },
      { fieldId: "syndic_phone", label: "Téléphone du syndic" },
      { fieldId: "syndic_email", label: "Email du syndic" },
    ],
    id: "identification",
    title: "Identification",
  },
  {
    fields: [
      { fieldId: "account_statement_date", label: "Date de situation" },
      { fieldId: "current_balance_amount", label: "Solde vendeur" },
      { fieldId: "current_balance_label", label: "Nature du solde" },
      { fieldId: "unpaid_charges_amount", label: "Impayés" },
      { fieldId: "treasury_advance_amount", label: "Avance de trésorerie" },
      {
        fieldId: "seller_financial_comment",
        label: "Commentaire financier",
      },
    ],
    id: "situation_financiere",
    title: "Situation financière",
  },
  {
    fields: [
      { fieldId: "current_quarter", label: "Trimestre en cours" },
      { fieldId: "annual_budget_amount", label: "Budget annuel" },
      { fieldId: "budget_vote_date", label: "Date de vote du budget" },
    ],
    id: "charges_budget",
    title: "Charges et budget",
  },
  {
    fields: [
      {
        fieldId: "works_fund_quarterly_contribution",
        label: "Cotisation trimestrielle",
      },
      { fieldId: "works_fund_annual_amount", label: "Montant annuel" },
      {
        fieldId: "works_fund_budget_percentage",
        label: "Pourcentage du budget",
      },
      {
        fieldId: "works_fund_seller_share_amount",
        label: "Quote-part vendeur",
      },
      {
        fieldId: "works_fund_seller_share_date",
        label: "Date de quote-part",
      },
    ],
    id: "fonds_travaux",
    title: "Fonds travaux",
  },
  {
    fields: [
      { fieldId: "voted_paid_works", label: "Travaux votés/payés" },
      { fieldId: "future_works_calls", label: "Appels futurs" },
      { fieldId: "voted_not_called_works", label: "Travaux non appelés" },
    ],
    id: "travaux",
    title: "Travaux",
  },
  {
    fields: [
      {
        fieldId: "legal_proceedings_description",
        label: "Procédures",
      },
      { fieldId: "collective_loan", label: "Emprunt collectif" },
      { fieldId: "ppt_status", label: "PPT" },
      { fieldId: "dtg_status", label: "DTG" },
      { fieldId: "collective_dpe_status", label: "DPE collectif" },
    ],
    id: "juridique_diagnostics",
    title: "Juridique et diagnostics",
  },
];
