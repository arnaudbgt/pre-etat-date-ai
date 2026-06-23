import { NextResponse, type NextRequest } from "next/server";

import {
  getProjectOwnerContext,
  normalizeOwnerContextPayload,
  upsertProjectOwnerContext,
} from "@/lib/owner-context/project-owner-context";
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
      { error: "Session propriétaire invalide." },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json({
      ownerContext: await getProjectOwnerContext(projectId),
    });
  } catch (error) {
    console.error("owner_context_get_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      projectId,
    });
    return NextResponse.json(
      { error: "Impossible de lire le contexte propriétaire." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isAuthorized(request, projectId)) {
    return NextResponse.json(
      { error: "Session propriétaire invalide." },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const normalized = normalizeOwnerContextPayload(
    payload && typeof payload === "object" ? payload : {},
  );

  if (!normalized) {
    return NextResponse.json(
      { error: "Nom du propriétaire obligatoire." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      ownerContext: await upsertProjectOwnerContext({
        knownLotNumber: normalized.known_lot_number,
        ownerName: normalized.owner_name,
        projectId,
      }),
    });
  } catch (error) {
    console.error("owner_context_put_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      projectId,
    });
    return NextResponse.json(
      { error: "Impossible d’enregistrer le contexte propriétaire." },
      { status: 500 },
    );
  }
}
