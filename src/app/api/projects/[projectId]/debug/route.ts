import { NextResponse, type NextRequest } from "next/server";

import { getProjectDebugData } from "@/lib/debug/project-debug-data";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isUuid(projectId) || getUploadSessionProjectId(request) !== projectId) {
    return NextResponse.json(
      { error: "Session de diagnostic invalide." },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json(await getProjectDebugData(projectId));
  } catch (error) {
    console.error("project_debug_load_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Impossible de charger le diagnostic projet." },
      { status: 500 },
    );
  }
}
