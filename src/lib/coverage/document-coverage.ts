import type { ClassifiedDocumentType } from "@/lib/classification/types";
import { getEffectiveDocumentType } from "@/lib/documents/document-types";
import type { Database } from "@/types/database.types";

type CoverageFieldInput = {
  field_id: string;
  status: Database["public"]["Enums"]["field_status"];
};

type CoverageDocumentInput = {
  classification_status: string;
  document_type: Database["public"]["Enums"]["document_type"];
  document_type_override?: Database["public"]["Enums"]["document_type"] | null;
};

type CoverageDefinition = {
  alternatives: ClassifiedDocumentType[];
  impact: "faible" | "moyen" | "élevé";
  improves: string[];
  primary: ClassifiedDocumentType;
  reason: string;
};

export type MissingDocumentRecommendation = {
  alternative_documents: ClassifiedDocumentType[];
  field_id: string;
  impact: "faible" | "moyen" | "élevé";
  potentially_improves: string[];
  primary_document: ClassifiedDocumentType;
  primary_document_present: boolean;
  reason: string;
  status: "document_probably_missing" | "document_present_rule_missing";
};

const DEFAULT_COVERAGE: CoverageDefinition = {
  alternatives: ["fiche_synthetique", "pv_ag"],
  impact: "moyen",
  improves: [],
  primary: "fiche_synthetique",
  reason:
    "Le champ n’est pas couvert par une règle documentaire spécifique ; vérifier les pièces générales du dossier.",
};

export const FIELD_DOCUMENT_COVERAGE: Record<string, CoverageDefinition> = {
  account_statement_date: {
    alternatives: ["appel_de_fonds"],
    impact: "élevé",
    improves: ["current_balance_amount", "current_balance_label"],
    primary: "releve_coproprietaire",
    reason:
      "La date de relevé est généralement portée par le relevé copropriétaire.",
  },
  annual_budget_amount: {
    alternatives: ["annexe_comptable", "fiche_synthetique"],
    impact: "moyen",
    improves: ["budget_vote_date", "works_fund_budget_percentage"],
    primary: "pv_ag",
    reason:
      "Le budget est généralement voté en AG ou présent dans les annexes comptables.",
  },
  approval_date: {
    alternatives: ["annexe_comptable"],
    impact: "moyen",
    improves: ["budget_vote_date", "annual_budget_amount"],
    primary: "pv_ag",
    reason: "L’approbation des comptes est normalement votée en AG.",
  },
  budget_vote_date: {
    alternatives: ["annexe_comptable"],
    impact: "moyen",
    improves: ["annual_budget_amount"],
    primary: "pv_ag",
    reason: "La date de vote du budget est normalement portée par le PV d’AG.",
  },
  collective_dpe_status: {
    alternatives: ["dpe_collectif", "pv_ag"],
    impact: "moyen",
    improves: ["dtg_status", "ppt_status"],
    primary: "fiche_synthetique",
    reason:
      "Le statut du DPE collectif peut être indiqué dans la fiche synthétique ou dans le DPE collectif.",
  },
  collective_loan: {
    alternatives: ["annexe_comptable", "fiche_synthetique"],
    impact: "moyen",
    improves: ["legal_proceedings_description"],
    primary: "pv_ag",
    reason:
      "L’emprunt collectif est généralement mentionné en AG ou dans les annexes.",
  },
  current_balance_amount: {
    alternatives: ["appel_de_fonds", "fiche_synthetique"],
    impact: "élevé",
    improves: ["current_balance_label", "seller_financial_comment"],
    primary: "releve_coproprietaire",
    reason:
      "Le solde vendeur est généralement indiqué dans le relevé copropriétaire.",
  },
  current_balance_label: {
    alternatives: ["appel_de_fonds"],
    impact: "élevé",
    improves: ["current_balance_amount"],
    primary: "releve_coproprietaire",
    reason:
      "La nature débiteur/créditeur vient généralement du relevé copropriétaire.",
  },
  current_quarter: {
    alternatives: ["releve_coproprietaire"],
    impact: "moyen",
    improves: ["works_fund_quarterly_contribution"],
    primary: "appel_de_fonds",
    reason:
      "Le trimestre en cours est généralement visible dans l’appel de fonds.",
  },
  dtg_status: {
    alternatives: ["dtg", "pv_ag"],
    impact: "moyen",
    improves: ["ppt_status", "collective_dpe_status"],
    primary: "fiche_synthetique",
    reason:
      "Le DTG est généralement indiqué dans la fiche synthétique ou le diagnostic.",
  },
  future_works_calls: {
    alternatives: ["appel_de_fonds"],
    impact: "moyen",
    improves: ["voted_paid_works", "voted_not_called_works"],
    primary: "pv_ag",
    reason:
      "Les futurs appels de fonds travaux doivent être explicitement mentionnés.",
  },
  last_age_date: {
    alternatives: ["fiche_synthetique"],
    impact: "faible",
    improves: ["last_ago_date"],
    primary: "pv_ag",
    reason:
      "La dernière AG extraordinaire est portée par le PV si elle existe.",
  },
  last_ago_date: {
    alternatives: ["fiche_synthetique"],
    impact: "faible",
    improves: ["approval_date"],
    primary: "pv_ag",
    reason: "La dernière AG ordinaire est généralement portée par le PV d’AG.",
  },
  legal_proceedings_description: {
    alternatives: ["fiche_synthetique", "annexe_comptable"],
    impact: "élevé",
    improves: ["collective_loan"],
    primary: "pv_ag",
    reason:
      "Les procédures sont souvent mentionnées en AG ou dans la fiche synthétique.",
  },
  ppt_status: {
    alternatives: ["ppt", "pv_ag"],
    impact: "moyen",
    improves: ["dtg_status", "collective_dpe_status"],
    primary: "fiche_synthetique",
    reason:
      "Le PPT est généralement indiqué dans la fiche synthétique ou le document PPT.",
  },
  property_address: {
    alternatives: ["appel_de_fonds", "pv_ag", "fiche_synthetique"],
    impact: "élevé",
    improves: ["seller_name", "lot_number", "lot_tantiemes"],
    primary: "titre_propriete",
    reason:
      "L’adresse de l’immeuble apparaît généralement dans les documents principaux.",
  },
  property_reference: {
    alternatives: ["fiche_synthetique", "pv_ag"],
    impact: "moyen",
    improves: ["property_address", "lot_number"],
    primary: "titre_propriete",
    reason:
      "Les références cadastrales ou d’immeuble sont souvent indiquées dans le titre de propriété.",
  },
  lot_number: {
    alternatives: ["appel_de_fonds", "releve_coproprietaire"],
    impact: "élevé",
    improves: ["lot_tantiemes", "works_fund_seller_share_amount"],
    primary: "titre_propriete",
    reason:
      "Le titre de propriété est la source prioritaire pour rattacher les lots au vendeur.",
  },
  lot_description: {
    alternatives: ["fiche_synthetique", "appel_de_fonds"],
    impact: "moyen",
    improves: ["lot_number", "lot_tantiemes"],
    primary: "titre_propriete",
    reason:
      "La description des lots est généralement détaillée dans le titre de propriété.",
  },
  lot_tantiemes: {
    alternatives: ["appel_de_fonds", "releve_coproprietaire"],
    impact: "élevé",
    improves: ["lot_number", "works_fund_seller_share_amount"],
    primary: "titre_propriete",
    reason:
      "Le titre de propriété permet de rattacher les tantièmes au bon copropriétaire.",
  },
  seller_name: {
    alternatives: ["appel_de_fonds", "releve_coproprietaire"],
    impact: "élevé",
    improves: ["lot_number", "seller_account_number"],
    primary: "titre_propriete",
    reason:
      "Le titre de propriété est la source prioritaire pour identifier le vendeur.",
  },
  seller_address: {
    alternatives: ["appel_de_fonds", "releve_coproprietaire"],
    impact: "moyen",
    improves: ["seller_name", "seller_account_number"],
    primary: "titre_propriete",
    reason:
      "L’adresse du vendeur peut être indiquée dans le titre ou les documents de gestion.",
  },
  seller_account_number: {
    alternatives: ["releve_coproprietaire"],
    impact: "élevé",
    improves: ["current_balance_amount", "unpaid_charges_amount"],
    primary: "appel_de_fonds",
    reason:
      "Le numéro client ou compte copropriétaire est souvent visible dans les appels de fonds.",
  },
  seller_financial_comment: {
    alternatives: ["fiche_synthetique"],
    impact: "moyen",
    improves: ["current_balance_amount", "unpaid_charges_amount"],
    primary: "releve_coproprietaire",
    reason:
      "Le commentaire financier dépend généralement de la situation de compte.",
  },
  syndic_address: {
    alternatives: ["pv_ag", "fiche_synthetique"],
    impact: "faible",
    improves: ["syndic_name", "syndic_email"],
    primary: "appel_de_fonds",
    reason: "L’adresse du syndic est généralement présente dans l’en-tête.",
  },
  syndic_email: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    impact: "faible",
    improves: ["syndic_phone", "syndic_address"],
    primary: "appel_de_fonds",
    reason:
      "L’email du syndic apparaît souvent dans les coordonnées de l’agence.",
  },
  syndic_manager: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    impact: "faible",
    improves: ["syndic_name", "syndic_email"],
    primary: "appel_de_fonds",
    reason: "Le gestionnaire est souvent indiqué sur les documents de gestion.",
  },
  syndic_mandate_end: {
    alternatives: ["fiche_synthetique"],
    impact: "faible",
    improves: ["syndic_mandate_start"],
    primary: "pv_ag",
    reason:
      "La fin du mandat du syndic est généralement votée ou rappelée en AG.",
  },
  syndic_mandate_start: {
    alternatives: ["fiche_synthetique"],
    impact: "faible",
    improves: ["syndic_mandate_end"],
    primary: "pv_ag",
    reason:
      "Le début du mandat du syndic est généralement voté ou rappelé en AG.",
  },
  syndic_name: {
    alternatives: ["pv_ag", "fiche_synthetique"],
    impact: "moyen",
    improves: ["syndic_manager", "syndic_email"],
    primary: "appel_de_fonds",
    reason: "Le nom du syndic apparaît généralement dans les en-têtes.",
  },
  syndic_phone: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    impact: "faible",
    improves: ["syndic_email"],
    primary: "appel_de_fonds",
    reason:
      "Le téléphone du syndic apparaît souvent dans les coordonnées de gestion.",
  },
  treasury_advance_amount: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    impact: "moyen",
    improves: ["current_balance_amount"],
    primary: "annexe_comptable",
    reason:
      "L’avance de trésorerie est souvent présente dans les annexes comptables.",
  },
  unpaid_charges_amount: {
    alternatives: ["annexe_comptable", "fiche_synthetique"],
    impact: "élevé",
    improves: ["current_balance_amount", "seller_financial_comment"],
    primary: "releve_coproprietaire",
    reason:
      "Les impayés sont habituellement visibles dans le relevé copropriétaire.",
  },
  voted_not_called_works: {
    alternatives: ["annexe_comptable"],
    impact: "moyen",
    improves: ["future_works_calls"],
    primary: "pv_ag",
    reason:
      "Les travaux votés non appelés doivent être explicitement mentionnés.",
  },
  voted_paid_works: {
    alternatives: ["annexe_comptable"],
    impact: "moyen",
    improves: ["future_works_calls", "voted_not_called_works"],
    primary: "pv_ag",
    reason: "Les travaux votés sont généralement portés par le PV d’AG.",
  },
  works_fund_annual_amount: {
    alternatives: ["appel_de_fonds", "fiche_synthetique"],
    impact: "moyen",
    improves: ["works_fund_budget_percentage"],
    primary: "annexe_comptable",
    reason:
      "Le montant annuel du fonds travaux est souvent dans les annexes comptables.",
  },
  works_fund_budget_percentage: {
    alternatives: ["annexe_comptable"],
    impact: "moyen",
    improves: ["works_fund_annual_amount"],
    primary: "pv_ag",
    reason:
      "Le pourcentage du budget affecté au fonds travaux est généralement décidé en AG.",
  },
  works_fund_quarterly_contribution: {
    alternatives: ["fiche_synthetique"],
    impact: "moyen",
    improves: ["works_fund_annual_amount"],
    primary: "appel_de_fonds",
    reason:
      "La cotisation trimestrielle au fonds travaux est généralement appelée dans l’appel de fonds.",
  },
  works_fund_seller_share_amount: {
    alternatives: ["appel_de_fonds", "fiche_synthetique"],
    impact: "élevé",
    improves: ["works_fund_seller_share_date"],
    primary: "releve_coproprietaire",
    reason:
      "La quote-part vendeur se trouve souvent dans le relevé ou l’appel de fonds.",
  },
  works_fund_seller_share_date: {
    alternatives: ["appel_de_fonds"],
    impact: "moyen",
    improves: ["works_fund_seller_share_amount"],
    primary: "releve_coproprietaire",
    reason:
      "La date de quote-part dépend généralement du document de situation.",
  },
};

function presentDocumentTypes(documents: CoverageDocumentInput[]) {
  return new Set(
    documents
      .filter(
        (document) =>
          document.classification_status === "classified" ||
          document.classification_status === "uncertain",
      )
      .map((document) => getEffectiveDocumentType(document)),
  );
}

export function buildDocumentCoverageReport(input: {
  documents: CoverageDocumentInput[];
  fields: CoverageFieldInput[];
}): MissingDocumentRecommendation[] {
  const presentTypes = presentDocumentTypes(input.documents);

  return input.fields
    .filter((field) => field.status === "missing")
    .map((field) => {
      const definition =
        FIELD_DOCUMENT_COVERAGE[field.field_id] ?? DEFAULT_COVERAGE;
      const primaryDocumentPresent = presentTypes.has(definition.primary);

      return {
        alternative_documents: definition.alternatives,
        field_id: field.field_id,
        impact: definition.impact,
        potentially_improves: definition.improves,
        primary_document: definition.primary,
        primary_document_present: primaryDocumentPresent,
        reason: primaryDocumentPresent
          ? `Document attendu présent mais champ non extrait : ${definition.reason}`
          : `Document probablement manquant : ${definition.reason}`,
        status: primaryDocumentPresent
          ? "document_present_rule_missing"
          : "document_probably_missing",
      };
    });
}
