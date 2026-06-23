"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  type ManualDocumentType,
} from "@/lib/documents/document-types";

type DocumentTypeOverrideProps = {
  currentType: ManualDocumentType;
  documentId: string;
  projectId: string;
};

export function DocumentTypeOverride({
  currentType,
  documentId,
  projectId,
}: DocumentTypeOverrideProps) {
  const router = useRouter();
  const [value, setValue] = useState<ManualDocumentType>(currentType);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const documentType = event.target.value as ManualDocumentType;
    setValue(documentType);
    setStatus("saving");

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentId}/type-override`,
        {
          body: JSON.stringify({ documentType }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("override_failed");
      }

      setStatus("idle");
      router.refresh();
    } catch {
      setValue(currentType);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-1">
      <select
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
        disabled={status === "saving"}
        onChange={handleChange}
        value={value}
      >
        {DOCUMENT_TYPE_OPTIONS.map((documentType) => (
          <option key={documentType} value={documentType}>
            {DOCUMENT_TYPE_LABELS[documentType]}
          </option>
        ))}
      </select>
      {status === "saving" ? (
        <p className="text-xs text-neutral-500">Recalcul en cours…</p>
      ) : null}
      {status === "error" ? (
        <p className="text-xs text-red-700">Correction impossible.</p>
      ) : null}
    </div>
  );
}
