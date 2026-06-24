import type { AiSuggestionFieldId } from "./field-allowlist";

export type AiPromptGroupId =
  | "identity_owner_lots"
  | "syndic"
  | "financial_position"
  | "charges_budget_works_fund"
  | "works_legal_diagnostics";

export type AiPromptGroup = {
  fields: AiSuggestionFieldId[];
  id: AiPromptGroupId;
  instructions: string[];
  priorityDocuments: string[];
  title: string;
};

export const AI_PROMPT_GROUPS: AiPromptGroup[] = [
  {
    fields: [
      "seller_name",
      "seller_address",
      "seller_account_number",
      "property_address",
      "property_reference",
      "lot_number",
      "lot_description",
      "lot_tantiemes",
    ],
    id: "identity_owner_lots",
    instructions: [
      "Prioriser owner_reference issu du titre de propriété.",
      "Rattacher les lots et tantièmes au propriétaire vendeur uniquement.",
      "Conserver plusieurs lots seulement s’ils sont complémentaires et sourcés.",
    ],
    priorityDocuments: [
      "titre_propriete",
      "appel_de_fonds",
      "releve_coproprietaire",
      "fiche_synthetique",
      "pv_ag",
    ],
    title: "Identité / propriétaire / lots",
  },
  {
    fields: [
      "syndic_name",
      "syndic_manager",
      "syndic_address",
      "syndic_phone",
      "syndic_email",
    ],
    id: "syndic",
    instructions: [
      "Préférer les coordonnées agence/syndic/gestionnaire aux informations espace client.",
      "Rejeter les emails proches de numéro client ou identifiant client.",
    ],
    priorityDocuments: ["appel_de_fonds", "pv_ag", "fiche_synthetique"],
    title: "Syndic",
  },
  {
    fields: [
      "account_statement_date",
      "current_balance_amount",
      "current_balance_label",
      "unpaid_charges_amount",
      "treasury_advance_amount",
      "seller_financial_comment",
    ],
    id: "financial_position",
    instructions: [
      "current_balance_amount exige un libellé de solde ou situation de compte.",
      "Ne jamais confondre montant à payer, provisions appelées ou cotisation travaux avec un solde.",
    ],
    priorityDocuments: ["releve_coproprietaire", "appel_de_fonds"],
    title: "Situation financière",
  },
  {
    fields: [
      "current_quarter",
      "annual_budget_amount",
      "budget_vote_date",
      "works_fund_quarterly_contribution",
      "works_fund_annual_amount",
      "works_fund_budget_percentage",
      "works_fund_seller_share_amount",
      "works_fund_seller_share_date",
    ],
    id: "charges_budget_works_fund",
    instructions: [
      "current_quarter exige une période complète ou un trimestre explicite.",
      "works_fund_budget_percentage exige un pourcentage explicitement écrit.",
      "Ne jamais annualiser une cotisation trimestrielle.",
    ],
    priorityDocuments: [
      "appel_de_fonds",
      "pv_ag",
      "annexe_comptable",
      "fiche_synthetique",
    ],
    title: "Charges / budget / fonds travaux",
  },
  {
    fields: [
      "voted_paid_works",
      "future_works_calls",
      "voted_not_called_works",
      "legal_proceedings_description",
      "collective_loan",
      "ppt_status",
      "dtg_status",
      "collective_dpe_status",
    ],
    id: "works_legal_diagnostics",
    instructions: [
      "Conserver uniquement une formulation factuelle issue des extraits.",
      "Ne jamais interpréter juridiquement les procédures.",
      "Statuts diagnostics uniquement sur mention explicite.",
    ],
    priorityDocuments: [
      "pv_ag",
      "fiche_synthetique",
      "dtg",
      "ppt",
      "dpe_collectif",
      "annexe_comptable",
    ],
    title: "Travaux / juridique / diagnostics",
  },
];

export function selectAiPromptGroups(fieldIds: string[]) {
  const requested = new Set(fieldIds);

  return AI_PROMPT_GROUPS.filter((group) =>
    group.fields.some((fieldId) => requested.has(fieldId)),
  );
}
