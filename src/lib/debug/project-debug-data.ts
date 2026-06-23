import "server-only";

import type { Json } from "@/types/database.types";

import { buildDocumentCoverageReport } from "@/lib/coverage/document-coverage";
import { buildFieldDebugDiagnostic } from "@/lib/debug/field-diagnostics";
import { getEffectiveDocumentType } from "@/lib/documents/document-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
          "confidence, document_id, extracted_field_id, matched_rule, source_excerpt, source_locator, source_page, source_value",
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
  return {
    coverage: buildDocumentCoverageReport({
      documents: documentsResult.data,
      fields: fieldsResult.data,
    }),
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
      const diagnostic = buildFieldDebugDiagnostic({
        documents: documentsResult.data,
        field,
        sources,
      });

      return {
        ...field,
        debug_diagnostic: {
          ...diagnostic,
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
