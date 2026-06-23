import "server-only";

import type { ClassificationStatus } from "@/lib/classification/types";

import { getClassificationLimits } from "@/lib/classification/config";
import { evaluateAndPersistProjectConsistency } from "@/lib/consistency/persistence";
import { extractComplexFields } from "@/lib/extraction/simple/complex-extractor";
import { extractSimpleFields } from "@/lib/extraction/simple/extractor";
import { extractFinancialFields } from "@/lib/extraction/simple/financial-extractor";
import { persistDeterministicExtraction } from "@/lib/extraction/simple/persistence";
import { extractTextFromPdfBuffer } from "@/lib/pdf/extract-text-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";

import {
  buildManualDocumentTypeUpdate,
  getEffectiveDocumentType,
  type ManualDocumentType,
} from "./document-types";

export type DocumentTypeOverrideResult = {
  documentId: string;
  effectiveDocumentType: ManualDocumentType;
  extractedFieldCount: number;
  projectId: string;
  reportStatus: "draft" | "preview" | "ready";
};

function extractionClassificationStatus(status: string): ClassificationStatus {
  return status === "classified" ||
    status === "uncertain" ||
    status === "insufficient_text"
    ? status
    : "uncertain";
}

export async function overrideDocumentTypeAndReprocess(input: {
  documentId: string;
  documentType: ManualDocumentType;
  projectId: string;
}): Promise<DocumentTypeOverrideResult> {
  const supabase = getSupabaseAdmin();
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select(
      "id, classification_status, deleted_at, document_type, document_type_override, storage_path",
    )
    .eq("id", input.documentId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (documentError) {
    throw new Error(`override_load_document:${documentError.code}`);
  }

  if (!document) {
    throw new Error("override_document_not_found");
  }

  if (document.deleted_at) {
    throw new Error("override_document_deleted");
  }

  if (!document.storage_path) {
    throw new Error("override_document_without_storage_path");
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update(buildManualDocumentTypeUpdate(input.documentType))
    .eq("id", input.documentId)
    .eq("project_id", input.projectId)
    .is("deleted_at", null);

  if (updateError) {
    throw new Error(`override_update_document:${updateError.code}`);
  }

  const effectiveDocumentType = getEffectiveDocumentType({
    ...document,
    document_type_override: input.documentType,
  });
  const { data: pdfBlob, error: downloadError } = await supabase.storage
    .from(SOURCE_DOCUMENTS_BUCKET)
    .download(document.storage_path);

  if (downloadError || !pdfBlob) {
    throw new Error(
      `override_download_pdf:${downloadError?.name ?? "missing"}`,
    );
  }

  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  if (pdfBuffer.byteLength === 0) {
    throw new Error("override_pdf_empty");
  }

  const limits = getClassificationLimits();
  const extractedText = await extractTextFromPdfBuffer(
    pdfBuffer,
    {
      maxCharacters: limits.maxCharacters,
      maxPages: limits.maxPages,
    },
    {
      documentId: input.documentId,
      storagePath: document.storage_path,
    },
  );
  const extractionContext = {
    classificationStatus: extractionClassificationStatus(
      document.classification_status,
    ),
    documentType: effectiveDocumentType,
    pages: extractedText.pages,
  };
  const { error: deleteSourcesError } = await supabase
    .from("extracted_field_sources")
    .delete()
    .eq("document_id", input.documentId);

  if (deleteSourcesError) {
    throw new Error(
      `override_delete_document_sources:${deleteSourcesError.code}`,
    );
  }

  const candidates = [
    ...extractSimpleFields(extractionContext),
    ...extractFinancialFields(extractionContext),
    ...extractComplexFields(extractionContext),
  ];

  await persistDeterministicExtraction({
    candidates,
    classificationStatus: extractionContext.classificationStatus,
    documentId: input.documentId,
    documentType: effectiveDocumentType,
    projectId: input.projectId,
  });

  const consistency = await evaluateAndPersistProjectConsistency(
    input.projectId,
  );

  return {
    documentId: input.documentId,
    effectiveDocumentType,
    extractedFieldCount: candidates.length,
    projectId: input.projectId,
    reportStatus: consistency.report_status,
  };
}
