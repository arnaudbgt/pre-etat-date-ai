import { NextResponse, type NextRequest } from "next/server";

import { validateManualField } from "@/lib/fields/manual-field-service";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ fieldId: string; projectId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { fieldId, projectId } = await context.params;

  if (!isUuid(projectId) || getUploadSessionProjectId(request) !== projectId) {
    return NextResponse.json(
      { error: "Session de validation invalide." },
      { status: 401 },
    );
  }

  try {
    const summary = await validateManualField({ fieldId, projectId });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("manual_field_validate_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      fieldId,
      projectId,
    });
    return NextResponse.json(
      { error: "Impossible de valider le champ." },
      { status: 500 },
    );
  }
}
