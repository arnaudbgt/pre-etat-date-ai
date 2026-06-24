import type { ClassifiedDocumentType } from "@/lib/classification/types";
import type { Database } from "@/types/database.types";

export const DOCUMENT_TYPE_OPTIONS = [
  "appel_de_fonds",
  "releve_coproprietaire",
  "pv_ag",
  "annexe_comptable",
  "reglement_copropriete",
  "fiche_synthetique",
  "dtg",
  "ppt",
  "dpe_collectif",
  "titre_propriete",
  "other",
] as const satisfies readonly ClassifiedDocumentType[];

export type ManualDocumentType = (typeof DOCUMENT_TYPE_OPTIONS)[number];

type StoredDocumentType = Database["public"]["Enums"]["document_type"];

export const DOCUMENT_TYPE_LABELS: Record<ManualDocumentType, string> = {
  annexe_comptable: "Annexe comptable",
  appel_de_fonds: "Appel de fonds",
  dpe_collectif: "DPE collectif",
  dtg: "Diagnostic technique global",
  fiche_synthetique: "Fiche synthétique",
  other: "Autre document",
  ppt: "Plan pluriannuel de travaux",
  pv_ag: "PV d’AG",
  reglement_copropriete: "Règlement de copropriété",
  releve_coproprietaire: "Relevé copropriétaire",
  titre_propriete: "Titre de propriété",
};

export function isManualDocumentType(
  value: unknown,
): value is ManualDocumentType {
  return (
    typeof value === "string" &&
    DOCUMENT_TYPE_OPTIONS.includes(value as ManualDocumentType)
  );
}

export function getEffectiveDocumentType(document: {
  document_type: StoredDocumentType;
  document_type_override?: StoredDocumentType | null;
}): ClassifiedDocumentType {
  const effectiveType =
    document.document_type_override ?? document.document_type;

  return isManualDocumentType(effectiveType) ? effectiveType : "other";
}

export function buildManualDocumentTypeUpdate(
  documentType: ManualDocumentType,
) {
  return {
    document_type_override: documentType,
    is_document_type_manual: true,
  };
}
