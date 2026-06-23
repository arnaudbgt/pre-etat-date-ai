import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ProjectResultView } from "@/components/result/project-result-view";
import { getProjectResultData } from "@/lib/result/project-result-data";
import { UPLOAD_SESSION_COOKIE } from "@/lib/upload/constants";
import { getUploadSessionProjectIdFromValue } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

type ResultPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectResultPage({ params }: ResultPageProps) {
  const { projectId } = await params;
  const cookieStore = await cookies();
  const sessionProjectId = getUploadSessionProjectIdFromValue(
    cookieStore.get(UPLOAD_SESSION_COOKIE)?.value,
  );

  if (!isUuid(projectId) || sessionProjectId !== projectId) {
    notFound();
  }

  const data = await getProjectResultData(projectId);

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-8 bg-neutral-50 px-6 py-10">
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-500">
          Synthèse du pré-état daté
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
          Résultat de l’analyse
        </h1>
        <p className="max-w-3xl text-neutral-600">
          Vérifiez les informations détectées, corrigez les champs inexacts et
          validez les données fiables. Aucun PDF final ni paiement n’est généré
          depuis cette page.
        </p>
      </div>

      <ProjectResultView data={data} projectId={projectId} />
    </main>
  );
}
