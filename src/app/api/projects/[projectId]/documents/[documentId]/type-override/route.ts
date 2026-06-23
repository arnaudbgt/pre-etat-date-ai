import { NextResponse, type NextRequest } from "next/server";

import { isManualDocumentType } from "@/lib/documents/document-types";
import { overrideDocumentTypeAndReprocess } from "@/lib/documents/type-override-service";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ documentId: string; projectId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { documentId, projectId } = await context.params;

  if (!isUuid(projectId) || getUploadSessionProjectId(request) !== projectId) {
    return NextResponse.json(
      { error: "Session de correction invalide." },
      { status: 401 },
    );
  }

  if (!isUuid(documentId)) {
    return NextResponse.json({ error: "Document invalide." }, { status: 400 });
  }

  let payload: { documentType?: unknown };

  try {
    payload = (await request.json()) as { documentType?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  if (!isManualDocumentType(payload.documentType)) {
    return NextResponse.json(
      { error: "Type documentaire invalide." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await overrideDocumentTypeAndReprocess({
        documentId,
        documentType: payload.documentType,
        projectId,
      }),
    );
  } catch (error) {
    console.error("document_type_override_failed", {
      documentId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
      projectId,
    });
    return NextResponse.json(
      { error: "Impossible de corriger le type documentaire." },
      { status: 500 },
    );
  }
}
