import { NextResponse, type NextRequest } from "next/server";

import { listAiFieldSuggestions } from "@/lib/ai/suggestions/persistence";
import { generateAiFieldSuggestions } from "@/lib/ai/suggestions/service";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function isAuthorized(request: NextRequest, projectId: string) {
  return isUuid(projectId) && getUploadSessionProjectId(request) === projectId;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isAuthorized(request, projectId)) {
    return NextResponse.json(
      { error: "Session IA invalide." },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json({
      suggestions: await listAiFieldSuggestions(projectId),
    });
  } catch (error) {
    console.error("ai_suggestions_get_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      projectId,
    });
    return NextResponse.json(
      { error: "Impossible de lire les suggestions IA." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isAuthorized(request, projectId)) {
    return NextResponse.json(
      { error: "Session IA invalide." },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json(await generateAiFieldSuggestions(projectId));
  } catch (error) {
    console.error("ai_suggestions_generate_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      projectId,
    });
    return NextResponse.json(
      { error: "Impossible de générer les suggestions IA." },
      { status: 500 },
    );
  }
}
