import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ProjectDebugView } from "@/components/debug/project-debug-view";
import { getProjectDebugData } from "@/lib/debug/project-debug-data";
import { getUploadSessionProjectIdFromValue } from "@/lib/upload/session";
import { UPLOAD_SESSION_COOKIE } from "@/lib/upload/constants";
import { isUuid } from "@/lib/upload/validation";

type DebugPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDebugPage({ params }: DebugPageProps) {
  const { projectId } = await params;
  const cookieStore = await cookies();
  const sessionProjectId = getUploadSessionProjectIdFromValue(
    cookieStore.get(UPLOAD_SESSION_COOKIE)?.value,
  );

  if (!isUuid(projectId) || sessionProjectId !== projectId) {
    notFound();
  }

  let data;

  try {
    data = await getProjectDebugData(projectId);
  } catch (error) {
    console.error("debug_page_failed", error);
    throw error;
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-500">
          Diagnostic extraction
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Projet {projectId}
        </h1>
        <p className="max-w-3xl text-neutral-600">
          Vue technique des classifications, extractions, sources et scores de
          cohérence. Le texte complet des PDF n’est pas affiché ni stocké.
        </p>
      </div>

      <ProjectDebugView data={data} projectId={projectId} />
    </main>
  );
}
