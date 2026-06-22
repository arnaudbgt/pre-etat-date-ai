import { ProjectUploadForm } from "@/components/upload/project-upload-form";
import { getClassificationLimits } from "@/lib/classification/config";
import { getUploadConfig } from "@/lib/upload/config";

export default function AnalysePage() {
  const { maxFiles, maxPdfSizeBytes, maxPdfSizeMb, retentionHours } =
    getUploadConfig();
  const { maxCharacters, maxPages } = getClassificationLimits();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-10 space-y-3">
        <p className="text-sm font-medium text-neutral-500">Dépôt temporaire</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Ajouter vos documents PDF
        </h1>
        <p className="max-w-2xl text-neutral-600">
          Les fichiers sont envoyés directement vers un stockage privé et seront
          supprimés automatiquement sous {retentionHours} heures.
        </p>
      </div>

      <ProjectUploadForm
        classificationMaxCharacters={maxCharacters}
        classificationMaxPages={maxPages}
        maxFiles={maxFiles}
        maxPdfSizeBytes={maxPdfSizeBytes}
        maxPdfSizeMb={maxPdfSizeMb}
      />
    </main>
  );
}
