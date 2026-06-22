import { NextResponse, type NextRequest } from "next/server";

import { classifyDocument } from "@/lib/classification/classifier";
import { getClassificationLimits } from "@/lib/classification/config";
import {
  CLASSIFICATION_VERSION,
  type ClassificationResult,
  type TextPage,
} from "@/lib/classification/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

type ClassificationPayload = {
  documentId?: unknown;
  pages?: unknown;
  totalPages?: unknown;
  truncated?: unknown;
};

class PayloadTooLargeError extends Error {}

async function readLimitedJson(request: NextRequest, maximumBytes: number) {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError();
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    receivedBytes += value.byteLength;

    if (receivedBytes > maximumBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }

    body += decoder.decode(value, { stream: true });
  }

  body += decoder.decode();
  return JSON.parse(body) as ClassificationPayload;
}

function validatePages(
  value: unknown,
  maxPages: number,
  maxCharacters: number,
) {
  if (!Array.isArray(value) || value.length > maxPages) {
    return null;
  }

  const pages: TextPage[] = [];
  let characterCount = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const page = item as { pageNumber?: unknown; text?: unknown };

    if (
      !Number.isInteger(page.pageNumber) ||
      Number(page.pageNumber) <= 0 ||
      typeof page.text !== "string"
    ) {
      return null;
    }

    characterCount += page.text.length;

    if (characterCount > maxCharacters) {
      return null;
    }

    pages.push({ pageNumber: Number(page.pageNumber), text: page.text });
  }

  return pages;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  if (!isUuid(projectId) || getUploadSessionProjectId(request) !== projectId) {
    return NextResponse.json(
      { error: "Session de classification invalide." },
      { status: 401 },
    );
  }

  const limits = getClassificationLimits();
  let payload: ClassificationPayload;

  try {
    payload = await readLimitedJson(request, limits.maxPayloadBytes);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { error: "Payload de classification trop volumineux." },
        { status: 413 },
      );
    }

    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const documentId =
    typeof payload.documentId === "string" ? payload.documentId : "";
  const totalPages = Number(payload.totalPages);
  const pages = validatePages(
    payload.pages,
    limits.maxPages,
    limits.maxCharacters,
  );

  if (
    !isUuid(documentId) ||
    !pages ||
    !Number.isInteger(totalPages) ||
    totalPages < pages.length ||
    totalPages < 0 ||
    typeof payload.truncated !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Données de classification invalides." },
      { status: 400 },
    );
  }

  if (
    pages.some(
      (page, index) =>
        page.pageNumber > totalPages ||
        (index > 0 && page.pageNumber <= pages[index - 1].pageNumber),
    )
  ) {
    return NextResponse.json(
      { error: "Pagination de classification invalide." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: document, error: lookupError } = await supabase
    .from("documents")
    .select("id, deleted_at, processing_status, storage_path")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) {
    console.error("classification_document_lookup_failed", {
      code: lookupError.code,
    });
    return NextResponse.json(
      { error: "Impossible de retrouver le document." },
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
      { error: "L’upload doit être confirmé avant la classification." },
      { status: 409 },
    );
  }

  const { error: processingError } = await supabase
    .from("documents")
    .update({ classification_status: "processing" })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (processingError) {
    console.error("classification_status_update_failed", {
      code: processingError.code,
    });
    return NextResponse.json(
      { error: "Impossible de démarrer la classification." },
      { status: 500 },
    );
  }

  let result: ClassificationResult;

  try {
    result = classifyDocument(pages, {
      minCharacters: limits.minCharacters,
      truncated: payload.truncated || totalPages > pages.length,
    });
  } catch {
    console.error("classification_engine_failed", { documentId });
    await supabase
      .from("documents")
      .update({ classification_status: "failed" })
      .eq("id", documentId)
      .eq("project_id", projectId)
      .is("deleted_at", null);
    return NextResponse.json(
      { error: "La classification a échoué." },
      { status: 500 },
    );
  }
  const classifiedAt = new Date().toISOString();
  const { error: saveError } = await supabase
    .from("documents")
    .update({
      classification_confidence: result.confidence,
      classification_details: result.details,
      classification_status: result.status,
      classification_version: CLASSIFICATION_VERSION,
      classified_at: classifiedAt,
      document_type: result.documentType,
      error_message: null,
      processing_status: "processed",
    })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (saveError) {
    console.error("classification_result_save_failed", {
      code: saveError.code,
    });
    await supabase
      .from("documents")
      .update({ classification_status: "failed" })
      .eq("id", documentId)
      .eq("project_id", projectId)
      .is("deleted_at", null);
    return NextResponse.json(
      { error: "Impossible d’enregistrer la classification." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    confidence: result.confidence,
    documentType: result.documentType,
    status: result.status,
  });
}
