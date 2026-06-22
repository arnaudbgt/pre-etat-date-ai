import {
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Clock3,
  LoaderCircle,
} from "lucide-react";

import type { ClassifiedDocumentType } from "@/lib/classification/types";

export type UploadEntry = {
  confidence?: number;
  documentType?: ClassifiedDocumentType;
  error?: string;
  id: string;
  name: string;
  status:
    | "pending"
    | "uploading"
    | "classifying"
    | "classified"
    | "classification_uncertain"
    | "insufficient_text"
    | "failed";
};

const statusLabels: Record<UploadEntry["status"], string> = {
  classified: "Document reconnu",
  classification_uncertain: "Type à vérifier",
  classifying: "Reconnaissance…",
  failed: "Échec",
  insufficient_text: "Texte insuffisant",
  pending: "En attente",
  uploading: "Envoi…",
};

const documentTypeLabels: Record<ClassifiedDocumentType, string> = {
  annexe_comptable: "Annexe comptable",
  appel_de_fonds: "Appel de fonds",
  dpe_collectif: "DPE collectif",
  dtg: "Diagnostic technique global",
  fiche_synthetique: "Fiche synthétique",
  other: "Autre document",
  ppt: "Plan pluriannuel de travaux",
  pv_ag: "Procès-verbal d’AG",
  reglement_copropriete: "Règlement de copropriété",
  releve_coproprietaire: "Relevé copropriétaire",
};

function StatusIcon({ status }: { status: UploadEntry["status"] }) {
  if (status === "classified") {
    return <CheckCircle2 aria-hidden className="size-5 text-green-700" />;
  }

  if (status === "failed") {
    return <CircleAlert aria-hidden className="size-5 text-red-700" />;
  }

  if (status === "classification_uncertain") {
    return <CircleHelp aria-hidden className="size-5 text-amber-700" />;
  }

  if (status === "uploading" || status === "classifying") {
    return (
      <LoaderCircle
        aria-hidden
        className="size-5 animate-spin text-neutral-700"
      />
    );
  }

  return <Clock3 aria-hidden className="size-5 text-neutral-500" />;
}

export function UploadList({ entries }: { entries: UploadEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
      {entries.map((entry) => (
        <li className="flex items-start gap-3 p-4" key={entry.id}>
          <StatusIcon status={entry.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{entry.name}</p>
            <p
              className={
                entry.status === "failed"
                  ? "text-sm text-red-700"
                  : "text-sm text-neutral-500"
              }
            >
              {entry.error ??
                (entry.documentType
                  ? `${documentTypeLabels[entry.documentType]}${
                      typeof entry.confidence === "number"
                        ? ` — ${entry.confidence} %`
                        : ""
                    }`
                  : statusLabels[entry.status])}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
