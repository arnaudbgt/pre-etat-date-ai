export const CLASSIFICATION_VERSION = "rules-v1";

export const CLASSIFIABLE_DOCUMENT_TYPES = [
  "appel_de_fonds",
  "releve_coproprietaire",
  "pv_ag",
  "annexe_comptable",
  "reglement_copropriete",
  "fiche_synthetique",
  "dtg",
  "ppt",
  "dpe_collectif",
] as const;

export type ClassifiableDocumentType =
  (typeof CLASSIFIABLE_DOCUMENT_TYPES)[number];
export type ClassifiedDocumentType = ClassifiableDocumentType | "other";
export type ClassificationStatus =
  | "classified"
  | "uncertain"
  | "insufficient_text";

export type TextPage = {
  pageNumber: number;
  text: string;
};

export type Signal = {
  all?: string[];
  any?: string[];
  id: string;
};

export type ClassificationRule = {
  incompatible: Signal[];
  majorStructures: Signal[];
  negativeStrong: Signal[];
  negativeWeak: Signal[];
  positiveKeywords: Signal[];
  secondaryStructures: Signal[];
  strongExpressions: Signal[];
  titleSignals: Signal[];
  type: ClassifiableDocumentType;
};

export type CandidateScore = {
  hasDiscriminant: boolean;
  majorStructureCount: number;
  matchedSignals: Array<{
    id: string;
    kind: string;
  }>;
  score: number;
  type: ClassifiableDocumentType;
};

export type ClassificationResult = {
  confidence: number;
  details: {
    analyzedPages: number;
    candidates: Array<{
      score: number;
      type: ClassifiableDocumentType;
    }>;
    margin: number;
    matchedSignals: Array<{
      id: string;
      kind: string;
      type: ClassifiableDocumentType;
    }>;
    truncated: boolean;
    version: string;
  };
  documentType: ClassifiedDocumentType;
  status: ClassificationStatus;
};
