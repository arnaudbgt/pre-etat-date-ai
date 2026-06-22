import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUploadConfig } from "@/lib/upload/config";
import { PDF_MIME_TYPE, SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

type ConfirmUploadBody = {
  documentId?: unknown;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isUuid(projectId) || getUploadSessionProjectId(request) !== projectId) {
    return NextResponse.json(
      { error: "Session d’upload invalide." },
      { status: 401 },
    );
  }

  let body: ConfirmUploadBody;

  try {
    body = (await request.json()) as ConfirmUploadBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const documentId = typeof body.documentId === "string" ? body.documentId : "";

  if (!isUuid(documentId)) {
    return NextResponse.json(
      { error: "Identifiant de document invalide." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, storage_path, processing_status, deleted_at")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (documentError) {
    console.error("document_confirmation_lookup_failed", {
      code: documentError.code,
    });
    return NextResponse.json(
      { error: "Impossible de confirmer le document." },
      { status: 500 },
    );
  }

  if (!document) {
    return NextResponse.json(
      { error: "Document introuvable." },
      { status: 404 },
    );
  }

  if (document.deleted_at || document.processing_status === "deleted") {
    return NextResponse.json(
      { error: "Ce document a été supprimé." },
      { status: 410 },
    );
  }

  if (!document.storage_path) {
    return NextResponse.json(
      { error: "Chemin de stockage manquant." },
      { status: 409 },
    );
  }

  const pathParts = document.storage_path.split("/");
  const objectName = pathParts.pop();
  const folder = pathParts.join("/");

  if (!objectName || folder !== `${projectId}/${documentId}`) {
    return NextResponse.json(
      { error: "Chemin de stockage invalide." },
      { status: 409 },
    );
  }

  const { data: objects, error: listError } = await supabase.storage
    .from(SOURCE_DOCUMENTS_BUCKET)
    .list(folder, { limit: 10, search: objectName });

  if (listError) {
    console.error("uploaded_object_lookup_failed", {
      message: listError.message,
    });
    return NextResponse.json(
      { error: "Impossible de vérifier l’upload." },
      { status: 500 },
    );
  }

  const object = objects.find((candidate) => candidate.name === objectName);

  if (!object) {
    return NextResponse.json({ error: "Upload non terminé." }, { status: 409 });
  }

  const metadata = (object.metadata ?? {}) as Record<string, unknown>;
  const sizeBytes = Number(metadata.size);
  const mimeType = String(metadata.mimetype ?? metadata.contentType ?? "");
  const config = getUploadConfig();
  const metadataIsValid =
    Number.isInteger(sizeBytes) &&
    sizeBytes > 0 &&
    sizeBytes <= config.maxPdfSizeBytes &&
    mimeType === PDF_MIME_TYPE;

  if (!metadataIsValid) {
    const { error: removalError } = await supabase.storage
      .from(SOURCE_DOCUMENTS_BUCKET)
      .remove([document.storage_path]);

    if (removalError) {
      console.error("invalid_object_removal_failed", {
        message: removalError.message,
      });
      return NextResponse.json(
        { error: "Le fichier invalide n’a pas pu être supprimé." },
        { status: 500 },
      );
    }

    const deletedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        deleted_at: deletedAt,
        deleted_reason: "invalid_storage_metadata",
        processing_status: "deleted",
        storage_path: null,
      })
      .eq("id", documentId)
      .eq("project_id", projectId)
      .is("deleted_at", null);

    if (updateError) {
      console.error("invalid_document_update_failed", {
        code: updateError.code,
      });
    }

    return NextResponse.json(
      { error: "Le PDF ne respecte pas les contraintes." },
      { status: 400 },
    );
  }

  const { error: confirmationError } = await supabase
    .from("documents")
    .update({
      error_message: null,
      mime_type: PDF_MIME_TYPE,
      size_bytes: sizeBytes,
    })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (confirmationError) {
    console.error("document_confirmation_failed", {
      code: confirmationError.code,
    });
    return NextResponse.json(
      { error: "Impossible de confirmer le document." },
      { status: 500 },
    );
  }

  return NextResponse.json({ documentId, sizeBytes, status: "uploaded" });
}
