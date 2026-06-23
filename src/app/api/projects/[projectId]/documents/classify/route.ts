import { NextResponse, type NextRequest } from "next/server";

import { classifyDocument } from "@/lib/classification/classifier";
import { getClassificationLimits } from "@/lib/classification/config";
import {
  CLASSIFICATION_VERSION,
  type ClassificationResult,
} from "@/lib/classification/types";
import { extractSimpleFields } from "@/lib/extraction/simple/extractor";
import { extractComplexFields } from "@/lib/extraction/simple/complex-extractor";
import { extractFinancialFields } from "@/lib/extraction/simple/financial-extractor";
import { persistDeterministicExtraction } from "@/lib/extraction/simple/persistence";
import {
  extractTextFromPdfBuffer,
  PdfServerTextExtractionError,
  type ServerExtractedPdfText,
} from "@/lib/pdf/extract-text-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";
import { getUploadSessionProjectId } from "@/lib/upload/session";
import { isUuid } from "@/lib/upload/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

type ClassificationPayload = {
  documentId?: unknown;
};

class PayloadTooLargeError extends Error {}

function logClassificationDebug(
  event: string,
  details: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "development") {
    console.error(event, details);
  }
}

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

  if (!isUuid(documentId)) {
    return NextResponse.json(
      { error: "Données de classification invalides." },
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

  logClassificationDebug("classification_pdf_storage_download_start", {
    documentId,
    storage_path: document.storage_path,
  });

  const { data: pdfBlob, error: downloadError } = await supabase.storage
    .from(SOURCE_DOCUMENTS_BUCKET)
    .download(document.storage_path);

  if (downloadError || !pdfBlob) {
    logClassificationDebug("classification_pdf_storage_download_failed", {
      code: downloadError?.name,
      documentId,
      errorMessage: downloadError?.message,
      stage: "storage_download",
      storage_path: document.storage_path,
    });
    return NextResponse.json(
      { error: "Impossible de récupérer le PDF pour classification." },
      { status: 500 },
    );
  }

  let extractedText: ServerExtractedPdfText;
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  logClassificationDebug("classification_pdf_storage_download_succeeded", {
    bufferByteLength: pdfBuffer.byteLength,
    documentId,
    isEmpty: pdfBuffer.byteLength === 0,
    stage: "storage_download",
    storage_path: document.storage_path,
  });

  if (pdfBuffer.byteLength === 0) {
    logClassificationDebug("classification_pdf_storage_download_empty", {
      bufferByteLength: pdfBuffer.byteLength,
      documentId,
      stage: "storage_download_empty",
      storage_path: document.storage_path,
    });
    await supabase
      .from("documents")
      .update({
        classification_status: "failed",
        error_message: "pdf_storage_object_empty",
        processing_status: "failed",
      })
      .eq("id", documentId)
      .eq("project_id", projectId)
      .is("deleted_at", null);
    return NextResponse.json(
      {
        error:
          "Erreur d’extraction PDF : impossible de lire le texte du fichier.",
      },
      { status: 500 },
    );
  }

  try {
    extractedText = await extractTextFromPdfBuffer(
      pdfBuffer,
      {
        maxCharacters: limits.maxCharacters,
        maxPages: limits.maxPages,
      },
      {
        documentId,
        storagePath: document.storage_path,
      },
    );
  } catch (error) {
    const diagnostics =
      error instanceof PdfServerTextExtractionError
        ? error.diagnostics
        : undefined;

    logClassificationDebug("classification_pdf_extraction_failed", {
      bufferByteLength: pdfBuffer.byteLength,
      documentId,
      errorMessage:
        diagnostics?.errorMessage ??
        (error instanceof Error ? error.message : String(error)),
      errorName:
        diagnostics?.errorName ??
        (error instanceof Error ? error.name : "UnknownError"),
      errorStack:
        diagnostics?.stack ?? (error instanceof Error ? error.stack : undefined),
      pdfjsVersion: diagnostics?.version,
      stage: diagnostics?.step ?? "unknown_pdf_extraction_step",
      storage_path: document.storage_path,
    });
    await supabase
      .from("documents")
      .update({
        classification_status: "failed",
        error_message: "pdf_text_extraction_failed",
        processing_status: "failed",
      })
      .eq("id", documentId)
      .eq("project_id", projectId)
      .is("deleted_at", null);
    return NextResponse.json(
      {
        error:
          "Erreur d’extraction PDF : impossible de lire le texte du fichier.",
      },
      { status: 500 },
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
    const classificationStartedAt = performance.now();
    result = classifyDocument(extractedText.pages, {
      extractedCharacters: extractedText.extractedCharacters,
      minCharacters: limits.minCharacters,
      totalPages: extractedText.totalPages,
      truncated: extractedText.truncated,
    });
    result = {
      ...result,
      details: {
        ...result.details,
        classificationDurationMs: Math.max(
          0,
          Math.round(performance.now() - classificationStartedAt),
        ),
      },
    };
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

  let extractedFieldCount = 0;

  try {
    const extractionContext = {
      classificationStatus: result.status,
      documentType: result.documentType,
      pages: extractedText.pages,
    };
    const candidates = [
      ...extractSimpleFields(extractionContext),
      ...extractFinancialFields(extractionContext),
      ...extractComplexFields(extractionContext),
    ];
    await persistDeterministicExtraction({
      candidates,
      classificationStatus: result.status,
      documentId,
      documentType: result.documentType,
      projectId,
    });
    extractedFieldCount = candidates.length;
  } catch {
    console.error("simple_extraction_failed", { documentId });
    await supabase
      .from("documents")
      .update({
        error_message: "simple_extraction_failed",
        processing_status: "failed",
      })
      .eq("id", documentId)
      .eq("project_id", projectId)
      .is("deleted_at", null);
    return NextResponse.json(
      { error: "L’extraction des champs simples a échoué." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    confidence: result.confidence,
    documentType: result.documentType,
    extractedFieldCount,
    pdfHasTextLayer: result.details.pdf_has_text_layer,
    status: result.status,
  });
}
