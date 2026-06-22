import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUploadConfig } from "@/lib/upload/config";
import { SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import {
  isUuid,
  sanitizePdfFilename,
  validateFileMetadata,
} from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

type SignUploadBody = {
  documentId?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isUuid(projectId) || getUploadSessionProjectId(request) !== projectId) {
    return NextResponse.json(
      { error: "Session d’upload invalide." },
      { status: 401 },
    );
  }

  let body: SignUploadBody;

  try {
    body = (await request.json()) as SignUploadBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const documentId = typeof body.documentId === "string" ? body.documentId : "";
  const filename = typeof body.filename === "string" ? body.filename : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const sizeBytes =
    typeof body.sizeBytes === "number" ? body.sizeBytes : Number.NaN;
  const config = getUploadConfig();
  const validationError = validateFileMetadata(
    { filename, mimeType, sizeBytes },
    config.maxPdfSizeBytes,
  );

  if (!isUuid(documentId) || validationError) {
    return NextResponse.json(
      { error: validationError ?? "Identifiant de document invalide." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const safeFilename = sanitizePdfFilename(filename);
  const storagePath = `${projectId}/${documentId}/${safeFilename}`;
  const autoDeleteAfter = new Date(
    Date.now() + config.retentionHours * 60 * 60 * 1000,
  ).toISOString();

  const { data: existingDocument, error: existingError } = await supabase
    .from("documents")
    .select(
      "id, filename, mime_type, size_bytes, storage_path, processing_status",
    )
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existingError) {
    console.error("document_lookup_failed", { code: existingError.code });
    return NextResponse.json(
      { error: "Impossible de préparer le document." },
      { status: 500 },
    );
  }

  if (existingDocument?.processing_status === "deleted") {
    return NextResponse.json(
      { error: "Ce document a déjà été supprimé." },
      { status: 410 },
    );
  }

  if (existingDocument) {
    const sameRequest =
      existingDocument.filename === filename &&
      existingDocument.mime_type === mimeType &&
      existingDocument.size_bytes === sizeBytes &&
      existingDocument.storage_path === storagePath;

    if (!sameRequest) {
      return NextResponse.json(
        { error: "Cet identifiant est déjà associé à un autre document." },
        { status: 409 },
      );
    }

    const pathParts = storagePath.split("/");
    const objectName = pathParts.pop();
    const folder = pathParts.join("/");
    const { data: existingObjects, error: objectLookupError } =
      await supabase.storage
        .from(SOURCE_DOCUMENTS_BUCKET)
        .list(folder, { limit: 1, search: objectName });

    if (objectLookupError) {
      console.error("existing_upload_lookup_failed", {
        message: objectLookupError.message,
      });
      return NextResponse.json(
        { error: "Impossible de vérifier l’upload." },
        { status: 500 },
      );
    }

    if (existingObjects.some((object) => object.name === objectName)) {
      return NextResponse.json({ alreadyUploaded: true, documentId });
    }
  } else {
    const { count, error: countError } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .neq("processing_status", "deleted");

    if (countError) {
      console.error("document_count_failed", { code: countError.code });
      return NextResponse.json(
        { error: "Impossible de préparer le document." },
        { status: 500 },
      );
    }

    if ((count ?? 0) >= config.maxFiles) {
      return NextResponse.json(
        { error: `La limite de ${config.maxFiles} documents est atteinte.` },
        { status: 400 },
      );
    }

    const { error: insertError } = await supabase.from("documents").insert({
      auto_delete_after: autoDeleteAfter,
      filename,
      id: documentId,
      mime_type: mimeType,
      project_id: projectId,
      size_bytes: sizeBytes,
      storage_path: storagePath,
    });

    if (insertError) {
      console.error("document_create_failed", { code: insertError.code });
      return NextResponse.json(
        { error: "Impossible de préparer le document." },
        { status: 500 },
      );
    }
  }

  const { data, error: signedUploadError } = await supabase.storage
    .from(SOURCE_DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (signedUploadError) {
    console.error("signed_upload_creation_failed", {
      message: signedUploadError.message,
    });
    return NextResponse.json(
      { error: "Impossible de signer l’upload." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    documentId,
    path: data.path,
    token: data.token,
  });
}
