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
  primary: ClassifiedDocumentType;
  reason: string;
};

export type MissingDocumentRecommendation = {
  alternative_documents: ClassifiedDocumentType[];
  field_id: string;
  primary_document: ClassifiedDocumentType;
  primary_document_present: boolean;
  reason: string;
  status: "document_probably_missing" | "document_present_rule_missing";
};

const DEFAULT_COVERAGE: CoverageDefinition = {
  alternatives: ["fiche_synthetique", "pv_ag"],
  primary: "fiche_synthetique",
  reason:
    "Le champ n’est pas couvert par une règle documentaire spécifique ; vérifier les pièces générales du dossier.",
};

export const FIELD_DOCUMENT_COVERAGE: Record<string, CoverageDefinition> = {
  account_statement_date: {
    alternatives: ["appel_de_fonds"],
    primary: "releve_coproprietaire",
    reason:
      "La date de relevé est généralement portée par le relevé copropriétaire.",
  },
  annual_budget_amount: {
    alternatives: ["annexe_comptable", "fiche_synthetique"],
    primary: "pv_ag",
    reason:
      "Le budget est généralement voté en AG ou présent dans les annexes comptables.",
  },
  approval_date: {
    alternatives: ["annexe_comptable"],
    primary: "pv_ag",
    reason: "L’approbation des comptes est normalement votée en AG.",
  },
  budget_vote_date: {
    alternatives: ["annexe_comptable"],
    primary: "pv_ag",
    reason: "La date de vote du budget est normalement portée par le PV d’AG.",
  },
  collective_dpe_status: {
    alternatives: ["dpe_collectif", "pv_ag"],
    primary: "fiche_synthetique",
    reason:
      "Le statut du DPE collectif peut être indiqué dans la fiche synthétique ou dans le DPE collectif.",
  },
  collective_loan: {
    alternatives: ["annexe_comptable", "fiche_synthetique"],
    primary: "pv_ag",
    reason:
      "L’emprunt collectif est généralement mentionné en AG ou dans les annexes.",
  },
  current_balance_amount: {
    alternatives: ["appel_de_fonds", "fiche_synthetique"],
    primary: "releve_coproprietaire",
    reason:
      "Le solde vendeur est généralement indiqué dans le relevé copropriétaire.",
  },
  current_balance_label: {
    alternatives: ["appel_de_fonds"],
    primary: "releve_coproprietaire",
    reason:
      "La nature débiteur/créditeur vient généralement du relevé copropriétaire.",
  },
  current_quarter: {
    alternatives: ["releve_coproprietaire"],
    primary: "appel_de_fonds",
    reason:
      "Le trimestre en cours est généralement visible dans l’appel de fonds.",
  },
  dtg_status: {
    alternatives: ["dtg", "pv_ag"],
    primary: "fiche_synthetique",
    reason:
      "Le DTG est généralement indiqué dans la fiche synthétique ou le diagnostic.",
  },
  future_works_calls: {
    alternatives: ["appel_de_fonds"],
    primary: "pv_ag",
    reason:
      "Les futurs appels de fonds travaux doivent être explicitement mentionnés.",
  },
  last_age_date: {
    alternatives: ["fiche_synthetique"],
    primary: "pv_ag",
    reason:
      "La dernière AG extraordinaire est portée par le PV si elle existe.",
  },
  last_ago_date: {
    alternatives: ["fiche_synthetique"],
    primary: "pv_ag",
    reason: "La dernière AG ordinaire est généralement portée par le PV d’AG.",
  },
  legal_proceedings_description: {
    alternatives: ["fiche_synthetique", "annexe_comptable"],
    primary: "pv_ag",
    reason:
      "Les procédures sont souvent mentionnées en AG ou dans la fiche synthétique.",
  },
  ppt_status: {
    alternatives: ["ppt", "pv_ag"],
    primary: "fiche_synthetique",
    reason:
      "Le PPT est généralement indiqué dans la fiche synthétique ou le document PPT.",
  },
  property_address: {
    alternatives: ["pv_ag", "fiche_synthetique"],
    primary: "appel_de_fonds",
    reason:
      "L’adresse de l’immeuble apparaît généralement dans les documents principaux.",
  },
  seller_financial_comment: {
    alternatives: ["fiche_synthetique"],
    primary: "releve_coproprietaire",
    reason:
      "Le commentaire financier dépend généralement de la situation de compte.",
  },
  syndic_address: {
    alternatives: ["pv_ag", "fiche_synthetique"],
    primary: "appel_de_fonds",
    reason: "L’adresse du syndic est généralement présente dans l’en-tête.",
  },
  syndic_email: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    primary: "appel_de_fonds",
    reason:
      "L’email du syndic apparaît souvent dans les coordonnées de l’agence.",
  },
  syndic_manager: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    primary: "appel_de_fonds",
    reason: "Le gestionnaire est souvent indiqué sur les documents de gestion.",
  },
  syndic_mandate_end: {
    alternatives: ["fiche_synthetique"],
    primary: "pv_ag",
    reason:
      "La fin du mandat du syndic est généralement votée ou rappelée en AG.",
  },
  syndic_mandate_start: {
    alternatives: ["fiche_synthetique"],
    primary: "pv_ag",
    reason:
      "Le début du mandat du syndic est généralement voté ou rappelé en AG.",
  },
  syndic_name: {
    alternatives: ["pv_ag", "fiche_synthetique"],
    primary: "appel_de_fonds",
    reason: "Le nom du syndic apparaît généralement dans les en-têtes.",
  },
  syndic_phone: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    primary: "appel_de_fonds",
    reason:
      "Le téléphone du syndic apparaît souvent dans les coordonnées de gestion.",
  },
  treasury_advance_amount: {
    alternatives: ["releve_coproprietaire", "fiche_synthetique"],
    primary: "annexe_comptable",
    reason:
      "L’avance de trésorerie est souvent présente dans les annexes comptables.",
  },
  unpaid_charges_amount: {
    alternatives: ["annexe_comptable", "fiche_synthetique"],
    primary: "releve_coproprietaire",
    reason:
      "Les impayés sont habituellement visibles dans le relevé copropriétaire.",
  },
  voted_not_called_works: {
    alternatives: ["annexe_comptable"],
    primary: "pv_ag",
    reason:
      "Les travaux votés non appelés doivent être explicitement mentionnés.",
  },
  voted_paid_works: {
    alternatives: ["annexe_comptable"],
    primary: "pv_ag",
    reason: "Les travaux votés sont généralement portés par le PV d’AG.",
  },
  works_fund_annual_amount: {
    alternatives: ["appel_de_fonds", "fiche_synthetique"],
    primary: "annexe_comptable",
    reason:
      "Le montant annuel du fonds travaux est souvent dans les annexes comptables.",
  },
  works_fund_budget_percentage: {
    alternatives: ["annexe_comptable"],
    primary: "pv_ag",
    reason:
      "Le pourcentage du budget affecté au fonds travaux est généralement décidé en AG.",
  },
  works_fund_quarterly_contribution: {
    alternatives: ["fiche_synthetique"],
    primary: "appel_de_fonds",
    reason:
      "La cotisation trimestrielle au fonds travaux est généralement appelée dans l’appel de fonds.",
  },
  works_fund_seller_share_amount: {
    alternatives: ["appel_de_fonds", "fiche_synthetique"],
    primary: "releve_coproprietaire",
    reason:
      "La quote-part vendeur se trouve souvent dans le relevé ou l’appel de fonds.",
  },
  works_fund_seller_share_date: {
    alternatives: ["appel_de_fonds"],
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
