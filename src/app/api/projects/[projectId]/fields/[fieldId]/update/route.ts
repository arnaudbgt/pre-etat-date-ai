import { NextResponse, type NextRequest } from "next/server";

import { updateManualField } from "@/lib/fields/manual-field-service";
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
      { error: "Session de correction invalide." },
      { status: 401 },
    );
  }

  let payload: { status?: unknown; value?: unknown };

  try {
    payload = (await request.json()) as { status?: unknown; value?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  if (
    typeof payload.value !== "string" ||
    payload.value.trim().length === 0 ||
    payload.status !== "confirmed"
  ) {
    return NextResponse.json(
      { error: "Données de champ invalides." },
      { status: 400 },
    );
  }

  try {
    const summary = await updateManualField({
      fieldId,
      projectId,
      value: payload.value,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("manual_field_update_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      fieldId,
      projectId,
    });
    return NextResponse.json(
      { error: "Impossible de corriger le champ." },
      { status: 500 },
    );
  }
}
