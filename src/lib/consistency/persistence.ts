import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { evaluateProjectConsistency } from "./evaluator";
import type {
  ConsistencyDocument,
  ConsistencyFieldInput,
  ConsistencySource,
  ProjectConsistencySummary,
} from "./types";
import { CONSISTENCY_FIELD_DEFINITIONS } from "./weights";

function fieldRowsToInput(
  rows: Array<{
    confidence: number | null;
    field_id: string;
    id: string;
    manually_edited: boolean;
    normalized_value: string | null;
    status: ConsistencyFieldInput["status"];
    value: ConsistencyFieldInput["value"];
  }>,
): ConsistencyFieldInput[] {
  return rows.map((row) => ({
    confidence: row.confidence,
    fieldId: row.field_id,
    id: row.id,
    manuallyEdited: row.manually_edited,
    normalizedValue: row.normalized_value,
    status: row.status,
    value: row.value,
  }));
}

export async function evaluateAndPersistProjectConsistency(
  projectId: string,
): Promise<ProjectConsistencySummary> {
  const supabase = getSupabaseAdmin();
  const { error: ensureError } = await supabase.from("extracted_fields").upsert(
    CONSISTENCY_FIELD_DEFINITIONS.map((field) => ({
      confidence: 0,
      extraction_version: "consistency-catalog-v1",
      field_id: field.fieldId,
      label: field.label,
      project_id: projectId,
      section: field.section,
      status: "missing" as const,
      value: null,
    })),
    {
      ignoreDuplicates: true,
      onConflict: "project_id,field_id",
    },
  );

  if (ensureError) {
    throw new Error(`consistency_ensure_fields:${ensureError.code}`);
  }

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, classification_status, document_type")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (documentsError) {
    throw new Error(`consistency_load_documents:${documentsError.code}`);
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("extracted_fields")
    .select(
      "id, field_id, status, confidence, normalized_value, value, manually_edited",
    )
    .eq("project_id", projectId)
    .in(
      "field_id",
      CONSISTENCY_FIELD_DEFINITIONS.map((field) => field.fieldId),
    );

  if (fieldsError) {
    throw new Error(`consistency_load_fields:${fieldsError.code}`);
  }

  const fieldIds = fields.map((field) => field.id);
  const { data: sources, error: sourcesError } =
    fieldIds.length > 0
      ? await supabase
          .from("extracted_field_sources")
          .select(
            "confidence, document_id, extracted_field_id, matched_rule, source_value",
          )
          .in("extracted_field_id", fieldIds)
      : { data: [], error: null };

  if (sourcesError) {
    throw new Error(`consistency_load_sources:${sourcesError.code}`);
  }

  const summary = evaluateProjectConsistency({
    documents: documents.map(
      (document): ConsistencyDocument => ({
        classificationStatus: document.classification_status,
        documentType: document.document_type,
        id: document.id,
      }),
    ),
    fields: fieldRowsToInput(fields),
    projectId,
    sources: sources.map(
      (source): ConsistencySource => ({
        confidence: source.confidence,
        documentId: source.document_id,
        extractedFieldId: source.extracted_field_id,
        matchedRule: source.matched_rule,
        sourceValue: source.source_value,
      }),
    ),
  });

  for (const decision of summary.fields) {
    if (decision.manually_edited) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("extracted_fields")
      .update({
        confidence: decision.confidence,
        status: decision.status,
      })
      .eq("project_id", projectId)
      .eq("field_id", decision.field_id)
      .eq("manually_edited", false);

    if (updateError) {
      throw new Error(`consistency_update_field:${updateError.code}`);
    }
  }

  const { error: reportError } = await supabase.from("reports").upsert(
    {
      completion_rate: summary.completion_rate,
      confidence_score: summary.confidence_score,
      project_id: projectId,
      status: summary.report_status,
    },
    { onConflict: "project_id" },
  );

  if (reportError) {
    throw new Error(`consistency_update_report:${reportError.code}`);
  }

  return summary;
}
