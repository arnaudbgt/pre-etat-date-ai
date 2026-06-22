"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileUp } from "lucide-react";

import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { PDF_MIME_TYPE, SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";
import { hasPdfSignature, validateFileMetadata } from "@/lib/upload/validation";

import { UploadList, type UploadEntry } from "./upload-list";

type PdfDropzoneProps = {
  maxFiles: number;
  maxPdfSizeBytes: number;
  maxPdfSizeMb: number;
  projectId: string;
};

type SignedUpload = {
  alreadyUploaded?: boolean;
  documentId: string;
  error?: string;
  path?: string;
  token?: string;
};

export function PdfDropzone({
  maxFiles,
  maxPdfSizeBytes,
  maxPdfSizeMb,
  projectId,
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [dropError, setDropError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function updateEntry(id: string, update: Partial<UploadEntry>) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry,
      ),
    );
  }

  async function uploadFile(file: File, documentId: string) {
    updateEntry(documentId, { status: "uploading" });

    try {
      const signatureIsValid = await hasPdfSignature(file);

      if (!signatureIsValid) {
        throw new Error("La signature du fichier ne correspond pas à un PDF.");
      }

      const signResponse = await fetch(
        `/api/projects/${projectId}/documents/sign`,
        {
          body: JSON.stringify({
            documentId,
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const signedUpload = (await signResponse.json()) as SignedUpload;

      if (!signResponse.ok) {
        throw new Error(
          signedUpload.error ?? "Impossible de préparer l’upload.",
        );
      }

      if (!signedUpload.alreadyUploaded) {
        if (!signedUpload.path || !signedUpload.token) {
          throw new Error("Réponse de signature incomplète.");
        }

        const supabase = getSupabaseBrowser();
        const { error: uploadError } = await supabase.storage
          .from(SOURCE_DOCUMENTS_BUCKET)
          .uploadToSignedUrl(signedUpload.path, signedUpload.token, file, {
            contentType: PDF_MIME_TYPE,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }
      }

      const confirmationResponse = await fetch(
        `/api/projects/${projectId}/documents/confirm`,
        {
          body: JSON.stringify({ documentId }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const confirmation = (await confirmationResponse.json()) as {
        error?: string;
      };

      if (!confirmationResponse.ok) {
        throw new Error(
          confirmation.error ?? "Impossible de confirmer l’upload.",
        );
      }

      updateEntry(documentId, { error: undefined, status: "uploaded" });
    } catch (uploadError) {
      updateEntry(documentId, {
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Échec de l’upload.",
        status: "failed",
      });
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    setDropError(null);
    const files = Array.from(fileList);
    const activeCount = entries.filter(
      (entry) => entry.status !== "failed",
    ).length;

    if (activeCount + files.length > maxFiles) {
      setDropError(`Vous pouvez déposer au maximum ${maxFiles} PDF.`);
      return;
    }

    const acceptedFiles: Array<{ documentId: string; file: File }> = [];
    const rejectedEntries: UploadEntry[] = [];

    for (const file of files) {
      const documentId = crypto.randomUUID();
      const validationError = validateFileMetadata(
        { filename: file.name, mimeType: file.type, sizeBytes: file.size },
        maxPdfSizeBytes,
      );

      if (validationError) {
        rejectedEntries.push({
          error: validationError,
          id: documentId,
          name: file.name,
          status: "failed",
        });
      } else {
        acceptedFiles.push({ documentId, file });
      }
    }

    setEntries((current) => [
      ...current,
      ...rejectedEntries,
      ...acceptedFiles.map(({ documentId, file }) => ({
        id: documentId,
        name: file.name,
        status: "pending" as const,
      })),
    ]);

    await Promise.all(
      acceptedFiles.map(({ documentId, file }) => uploadFile(file, documentId)),
    );
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
          isDragging
            ? "border-neutral-900 bg-neutral-100"
            : "border-neutral-300"
        }`}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <FileUp aria-hidden className="mx-auto mb-4 size-8 text-neutral-600" />
        <p className="font-medium">Glissez vos PDF ici</p>
        <p className="mt-1 text-sm text-neutral-500">
          Jusqu’à {maxFiles} fichiers de {maxPdfSizeMb} Mo maximum chacun
        </p>
        <input
          accept="application/pdf,.pdf"
          className="sr-only"
          multiple
          onChange={handleInput}
          ref={inputRef}
          type="file"
        />
        <button
          className="mt-5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Choisir des fichiers
        </button>
      </div>

      {dropError ? <p className="text-sm text-red-700">{dropError}</p> : null}
      <UploadList entries={entries} />
    </div>
  );
}
