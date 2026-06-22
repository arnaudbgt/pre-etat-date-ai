"use client";

import { useState, type FormEvent } from "react";

import { PdfDropzone } from "./pdf-dropzone";

type ProjectUploadFormProps = {
  classificationMaxCharacters: number;
  classificationMaxPages: number;
  maxFiles: number;
  maxPdfSizeBytes: number;
  maxPdfSizeMb: number;
};

export function ProjectUploadForm({
  classificationMaxCharacters,
  classificationMaxPages,
  maxFiles,
  maxPdfSizeBytes,
  maxPdfSizeMb,
}: ProjectUploadFormProps) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/projects", {
        body: JSON.stringify({
          email: formData.get("email"),
          propertyAddress: formData.get("propertyAddress"),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        projectId?: string;
      };

      if (!response.ok || !payload.projectId) {
        throw new Error(payload.error ?? "Impossible de créer le dossier.");
      }

      setProjectId(payload.projectId);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (projectId) {
    return (
      <PdfDropzone
        classificationMaxCharacters={classificationMaxCharacters}
        classificationMaxPages={classificationMaxPages}
        maxFiles={maxFiles}
        maxPdfSizeBytes={maxPdfSizeBytes}
        maxPdfSizeMb={maxPdfSizeMb}
        projectId={projectId}
      />
    );
  }

  return (
    <form
      className="space-y-6 rounded-2xl border border-neutral-200 p-6"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="email">
          Adresse email
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="propertyAddress">
          Adresse du bien
        </label>
        <textarea
          className="min-h-24 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          id="propertyAddress"
          maxLength={500}
          minLength={5}
          name="propertyAddress"
          required
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Création…" : "Continuer vers le dépôt"}
      </button>
    </form>
  );
}
