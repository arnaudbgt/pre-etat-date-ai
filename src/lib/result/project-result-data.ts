import "server-only";

import { buildDocumentCoverageReport } from "@/lib/coverage/document-coverage";
import type { MissingDocumentRecommendation } from "@/lib/coverage/document-coverage";
import { RESULT_SECTIONS, type ResultSection } from "@/lib/result/sections";
import type { Database, Json } from "@/types/database.types";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type FieldStatus = Database["public"]["Enums"]["field_status"];

export type ProjectResultField = {
  confidence: number | null;
  existsInDatabase: boolean;
  field_id: string;
  id: string | null;
  label: string;
  normalized_value: string | null;
  source: {
    confidence: number | null;
    document_filename: string | null;
    matched_rule: string | null;
    source_excerpt: string | null;
    source_page: number | null;
  } | null;
  status: FieldStatus;
  value: Json | null;
};

export type ProjectResultData = {
  coverage: MissingDocumentRecommendation[];
  fieldsById: Record<string, ProjectResultField>;
  report: {
    completion_rate: number;
    confidence_score: number;
    confirmed: number;
    inconsistent: number;
    missing: number;
    status: string;
    uncertain: number;
  };
  sections: ResultSection[];
};

const allSectionFields = RESULT_SECTIONS.flatMap((section) => section.fields);

function statusCounts(fields: ProjectResultField[]) {
  return fields.reduce(
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
}

function bestSource<T extends { confidence: number | null }>(sources: T[]) {
  return sources.reduce<T | null>(
    (best, source) =>
      !best || (source.confidence ?? 0) > (best.confidence ?? 0)
        ? source
        : best,
    null,
  );
}

export async function getProjectResultData(
  projectId: string,
): Promise<ProjectResultData> {
  const supabase = getSupabaseAdmin();
  const [documentsResult, fieldsResult, sourcesResult, reportResult] =
    await Promise.all([
      supabase
        .from("documents")
        .select(
          "id, filename, document_type, document_type_override, classification_status",
        )
        .eq("project_id", projectId)
        .is("deleted_at", null),
      supabase
        .from("extracted_fields")
        .select(
          "id, field_id, label, value, normalized_value, confidence, status",
        )
        .eq("project_id", projectId),
      supabase
        .from("extracted_field_sources")
        .select(
          "confidence, document_id, extracted_field_id, matched_rule, source_excerpt, source_page",
        ),
      supabase
        .from("reports")
        .select("completion_rate, confidence_score, status")
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  if (documentsResult.error) {
    throw new Error(`result_documents:${documentsResult.error.code}`);
  }

  if (fieldsResult.error) {
    throw new Error(`result_fields:${fieldsResult.error.code}`);
  }

  if (sourcesResult.error) {
    throw new Error(`result_sources:${sourcesResult.error.code}`);
  }

  if (reportResult.error) {
    throw new Error(`result_report:${reportResult.error.code}`);
  }

  const documentsById = new Map(
    documentsResult.data.map((document) => [document.id, document]),
  );
  const sourcesByFieldId = new Map<string, typeof sourcesResult.data>();

  for (const source of sourcesResult.data) {
    const current = sourcesByFieldId.get(source.extracted_field_id) ?? [];
    current.push(source);
    sourcesByFieldId.set(source.extracted_field_id, current);
  }

  const persistedFieldsById = new Map(
    fieldsResult.data.map((field) => [field.field_id, field]),
  );
  const resultFields = allSectionFields.map(
    (definition): ProjectResultField => {
      const field = persistedFieldsById.get(definition.fieldId);

      if (!field) {
        return {
          confidence: 0,
          existsInDatabase: false,
          field_id: definition.fieldId,
          id: null,
          label: definition.label,
          normalized_value: null,
          source: null,
          status: "missing",
          value: null,
        };
      }

      const source = bestSource(sourcesByFieldId.get(field.id) ?? []);
      const document = source ? documentsById.get(source.document_id) : null;

      return {
        confidence: field.confidence,
        existsInDatabase: true,
        field_id: field.field_id,
        id: field.id,
        label: definition.label || field.label,
        normalized_value: field.normalized_value,
        source: source
          ? {
              confidence: source.confidence,
              document_filename: document?.filename ?? source.document_id,
              matched_rule: source.matched_rule,
              source_excerpt: source.source_excerpt,
              source_page: source.source_page,
            }
          : null,
        status: field.status,
        value: field.value,
      };
    },
  );
  const fieldsById = Object.fromEntries(
    resultFields.map((field) => [field.field_id, field]),
  );
  const counts = statusCounts(resultFields);

  return {
    coverage: buildDocumentCoverageReport({
      documents: documentsResult.data,
      fields: resultFields.map((field) => ({
        field_id: field.field_id,
        status: field.status,
      })),
    }),
    fieldsById,
    report: {
      completion_rate: reportResult.data?.completion_rate ?? 0,
      confidence_score: reportResult.data?.confidence_score ?? 0,
      status: reportResult.data?.status ?? "draft",
      ...counts,
    },
    sections: RESULT_SECTIONS,
  };
}
