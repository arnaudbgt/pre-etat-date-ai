import "server-only";

import type { ClassificationStatus } from "@/lib/classification/types";
import type { Json } from "@/types/database.types";

import { getClassificationLimits } from "@/lib/classification/config";
import { getEffectiveDocumentType } from "@/lib/documents/document-types";
import { analyzeSyndicEmailCandidates } from "@/lib/extraction/simple/extractor";
import { extractTextFromPdfBuffer } from "@/lib/pdf/extract-text-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";

type ClassificationDetails = {
  candidates?: Array<{ score?: number; type?: string }>;
  extractedCharacters?: number;
  pdf_has_text_layer?: boolean;
  totalPages?: number;
};

function asRecord(value: Json | null): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

function parseClassificationDetails(value: Json | null): ClassificationDetails {
  const record = asRecord(value);
  const candidates = Array.isArray(record.candidates)
    ? record.candidates
        .map((candidate) => {
          const item =
            candidate &&
            typeof candidate === "object" &&
            !Array.isArray(candidate)
              ? (candidate as Record<string, Json | undefined>)
              : {};

          return {
            score: typeof item.score === "number" ? item.score : undefined,
            type: typeof item.type === "string" ? item.type : undefined,
          };
        })
        .filter((candidate) => candidate.type)
    : [];

  return {
    candidates,
    extractedCharacters:
      typeof record.extractedCharacters === "number"
        ? record.extractedCharacters
        : undefined,
    pdf_has_text_layer:
      typeof record.pdf_has_text_layer === "boolean"
        ? record.pdf_has_text_layer
        : undefined,
    totalPages:
      typeof record.totalPages === "number" ? record.totalPages : undefined,
  };
}

function extractionClassificationStatus(status: string): ClassificationStatus {
  return status === "classified" ||
    status === "uncertain" ||
    status === "insufficient_text"
    ? status
    : "uncertain";
}

export async function getProjectDebugData(projectId: string) {
  const supabase = getSupabaseAdmin();
  const [documentsResult, fieldsResult, sourcesResult, reportResult] =
    await Promise.all([
      supabase
        .from("documents")
        .select(
          "id, filename, storage_path, document_type, document_type_override, is_document_type_manual, classification_status, classification_confidence, classification_version, classification_details",
        )
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("extracted_fields")
        .select(
          "id, field_id, value, normalized_value, confidence, status, source_document_id, extraction_version, manually_edited, field_origin, edited_by_user_at",
        )
        .eq("project_id", projectId)
        .order("section", { ascending: true })
        .order("field_id", { ascending: true }),
      supabase
        .from("extracted_field_sources")
        .select(
          "confidence, document_id, extracted_field_id, matched_rule, source_excerpt, source_locator, source_page",
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("reports")
        .select("completion_rate, confidence_score, status")
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  if (documentsResult.error) {
    throw new Error(`debug_documents:${documentsResult.error.code}`);
  }

  if (fieldsResult.error) {
    throw new Error(`debug_fields:${fieldsResult.error.code}`);
  }

  if (sourcesResult.error) {
    throw new Error(`debug_sources:${sourcesResult.error.code}`);
  }

  if (reportResult.error) {
    throw new Error(`debug_report:${reportResult.error.code}`);
  }

  const documentIds = new Set(
    documentsResult.data.map((document) => document.id),
  );
  const fieldIds = new Set(fieldsResult.data.map((field) => field.id));
  const documentsById = new Map(
    documentsResult.data.map((document) => [document.id, document]),
  );
  const emailDebugByFieldId = new Map<
    string,
    {
      candidate_count: number;
      rejected_candidates: Array<{
        document: string;
        page: number;
        reason: string | null;
        value: string;
      }>;
      selected_candidate: string | null;
    }
  >();
  const sourcesByFieldId = new Map<string, typeof sourcesResult.data>();

  for (const source of sourcesResult.data) {
    const current = sourcesByFieldId.get(source.extracted_field_id) ?? [];
    current.push(source);
    sourcesByFieldId.set(source.extracted_field_id, current);
  }
  const statusCounts = fieldsResult.data.reduce(
    (counts, field) => ({
      ...counts,
      [field.status]: counts[field.status] + 1,
    }),
    {
      confirmed: 0,
      inconsistent: 0,
      missing: 0,
      uncertain: 0,
    },
  );
  const syndicEmailField = fieldsResult.data.find(
    (field) => field.field_id === "syndic_email",
  );

  if (syndicEmailField) {
    const rejectedCandidates: Array<{
      document: string;
      page: number;
      reason: string | null;
      value: string;
    }> = [];
    let selectedCandidate: string | null = null;
    let candidateCount = 0;
    const limits = getClassificationLimits();

    for (const document of documentsResult.data) {
      const effectiveDocumentType = getEffectiveDocumentType(document);

      if (!document.storage_path) {
        continue;
      }

      try {
        const { data: pdfBlob, error: downloadError } = await supabase.storage
          .from(SOURCE_DOCUMENTS_BUCKET)
          .download(document.storage_path);

        if (downloadError || !pdfBlob) {
          continue;
        }

        const extractedText = await extractTextFromPdfBuffer(
          Buffer.from(await pdfBlob.arrayBuffer()),
          {
            maxCharacters: limits.maxCharacters,
            maxPages: limits.maxPages,
          },
          {
            documentId: document.id,
            storagePath: document.storage_path,
          },
        );
        const diagnostics = analyzeSyndicEmailCandidates({
          classificationStatus: extractionClassificationStatus(
            document.classification_status,
          ),
          documentType: effectiveDocumentType,
          pages: extractedText.pages,
        });

        candidateCount += diagnostics.candidates.length;

        if (!selectedCandidate && diagnostics.selectedCandidate) {
          selectedCandidate = diagnostics.selectedCandidate.value;
        }

        rejectedCandidates.push(
          ...diagnostics.rejectedCandidates.map((candidate) => ({
            document: document.filename,
            page: candidate.page,
            reason: candidate.rejectionReason,
            value: candidate.value,
          })),
        );
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("debug_syndic_email_candidates_failed", {
            documentId: document.id,
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
        }
      }
    }

    emailDebugByFieldId.set(syndicEmailField.id, {
      candidate_count: candidateCount,
      rejected_candidates: rejectedCandidates,
      selected_candidate: selectedCandidate,
    });
  }

  return {
    documents: documentsResult.data.map((document) => {
      const parsedDetails = parseClassificationDetails(
        document.classification_details,
      );

      return {
        ...document,
        classification_metrics: {
          extractedCharacters: parsedDetails.extractedCharacters,
          pdf_has_text_layer: parsedDetails.pdf_has_text_layer,
          totalPages: parsedDetails.totalPages,
        },
        effective_document_type: getEffectiveDocumentType(document),
        top_candidates: (parsedDetails.candidates ?? []).slice(0, 3),
      };
    }),
    fields: fieldsResult.data.map((field) => {
      const sources = sourcesByFieldId.get(field.id) ?? [];
      const bestConfidence = sources.reduce(
        (best, source) => Math.max(best, source.confidence ?? 0),
        0,
      );
      const failureStage =
        field.manually_edited
          ? "manual_protected"
          : field.status !== "missing"
            ? "accepted"
            : sources.length > 0
              ? "merge"
              : "candidate_generation";
      const rejectionReason =
        field.manually_edited
          ? "Champ modifié manuellement : diagnostic automatique ignoré."
          : field.status !== "missing"
            ? "Au moins un candidat a été retenu."
            : sources.length > 0
              ? "Des sources existent mais le merge/cohérence n’a pas retenu de valeur canonique."
              : "Aucun candidat déterministe n’a été produit par les règles actuelles.";

      return {
        ...field,
        debug_diagnostic: {
          best_candidate_confidence: bestConfidence || null,
          candidate_count:
            emailDebugByFieldId.get(field.id)?.candidate_count ??
            sources.length,
          failure_stage: failureStage,
          rejection_reason: rejectionReason,
          rejected_candidates:
            emailDebugByFieldId.get(field.id)?.rejected_candidates ?? [],
          selected_candidate:
            emailDebugByFieldId.get(field.id)?.selected_candidate ?? null,
        },
      };
    }),
    report: {
      completion_rate: reportResult.data?.completion_rate ?? 0,
      confidence_score: reportResult.data?.confidence_score ?? 0,
      status: reportResult.data?.status ?? "draft",
      ...statusCounts,
    },
    sources: sourcesResult.data
      .filter(
        (source) =>
          documentIds.has(source.document_id) &&
          fieldIds.has(source.extracted_field_id),
      )
      .map((source) => ({
        ...source,
        document_filename:
          documentsById.get(source.document_id)?.filename ?? source.document_id,
      })),
  };
}

export type ProjectDebugData = Awaited<ReturnType<typeof getProjectDebugData>>;
