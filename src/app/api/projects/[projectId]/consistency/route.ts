import { NextResponse, type NextRequest } from "next/server";

import { evaluateAndPersistProjectConsistency } from "@/lib/consistency/persistence";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isUuid(projectId) || getUploadSessionProjectId(request) !== projectId) {
    return NextResponse.json(
      { error: "Session de cohérence invalide." },
      { status: 401 },
    );
  }

  try {
    const summary = await evaluateAndPersistProjectConsistency(projectId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("consistency_engine_failed", {
      code: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Le calcul de cohérence a échoué." },
      { status: 500 },
    );
  }
}
