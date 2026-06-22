import "server-only";

import type { Json } from "@/types/database.types";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import {
  SIMPLE_EXTRACTION_VERSION,
  SIMPLE_FIELD_BY_ID,
  SIMPLE_FIELD_DEFINITIONS,
  type SimpleFieldId,
} from "./catalog";
import { canUpdateCanonicalField, mergeSimpleFieldSources } from "./merge";
import type { SimpleFieldCandidate, StoredSourceCandidate } from "./types";

type PersistenceInput = {
  candidates: SimpleFieldCandidate[];
  classificationStatus: string;
  documentId: string;
  documentType: string;
  projectId: string;
};

function storedValue(value: Json | null) {
  if (typeof value === "string") {
    return { normalizedValue: value, value };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const raw = value as Record<string, Json | undefined>;

    if (
      typeof raw.value === "string" &&
      typeof raw.normalizedValue === "string"
    ) {
      return { normalizedValue: raw.normalizedValue, value: raw.value };
    }
  }

  return null;
}

export async function persistSimpleExtraction(input: PersistenceInput) {
  const supabase = getSupabaseAdmin();
  const { error: ensureError } = await supabase.from("extracted_fields").upsert(
    SIMPLE_FIELD_DEFINITIONS.map((field) => ({
      confidence: 0,
      extraction_version: SIMPLE_EXTRACTION_VERSION,
      field_id: field.fieldId,
      label: field.label,
      project_id: input.projectId,
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
    throw new Error(`ensure_fields:${ensureError.code}`);
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("extracted_fields")
    .select("id, field_id, manually_edited")
    .eq("project_id", input.projectId)
    .in(
      "field_id",
      SIMPLE_FIELD_DEFINITIONS.map((field) => field.fieldId),
    );

  if (fieldsError) {
    throw new Error(`load_fields:${fieldsError.code}`);
  }

  const fieldsById = new Map(
    fields.map((field) => [field.field_id as SimpleFieldId, field]),
  );

  for (const item of input.candidates) {
    const field = fieldsById.get(item.fieldId);

    if (!field) {
      throw new Error("field_missing_after_upsert");
    }

    const { error: sourceError } = await supabase
      .from("extracted_field_sources")
      .upsert(
        {
          confidence: item.confidence,
          document_id: input.documentId,
          extracted_field_id: field.id,
          matched_rule: item.matchedRule,
          source_excerpt: item.excerpt.slice(0, 200),
          source_locator: {
            classificationStatus: input.classificationStatus,
            documentType: input.documentType,
          },
          source_page: item.page,
          source_value: {
            normalizedValue: item.normalizedValue,
            value: item.value,
          },
        },
        { onConflict: "extracted_field_id,document_id" },
      );

    if (sourceError) {
      throw new Error(`upsert_source:${sourceError.code}`);
    }
  }

  const fieldIds = fields.map((field) => field.id);
  const { data: sourceRows, error: sourcesError } = await supabase
    .from("extracted_field_sources")
    .select(
      "confidence, document_id, extracted_field_id, matched_rule, source_excerpt, source_page, source_value",
    )
    .in("extracted_field_id", fieldIds);

  if (sourcesError) {
    throw new Error(`load_sources:${sourcesError.code}`);
  }

  const sourcesByField = new Map<string, StoredSourceCandidate[]>();

  for (const row of sourceRows) {
    const parsed = storedValue(row.source_value);

    if (!parsed || row.confidence === null) {
      continue;
    }

    const source: StoredSourceCandidate = {
      confidence: row.confidence,
      documentId: row.document_id,
      excerpt: row.source_excerpt,
      matchedRule: row.matched_rule,
      normalizedValue: parsed.normalizedValue,
      page: row.source_page,
      value: parsed.value,
    };
    const current = sourcesByField.get(row.extracted_field_id) ?? [];
    current.push(source);
    sourcesByField.set(row.extracted_field_id, current);
  }

  for (const field of fields) {
    if (!canUpdateCanonicalField(field.manually_edited)) {
      continue;
    }

    const definition = SIMPLE_FIELD_BY_ID[field.field_id as SimpleFieldId];
    const merged = mergeSimpleFieldSources(sourcesByField.get(field.id) ?? []);
    const { error: updateError } = await supabase
      .from("extracted_fields")
      .update({
        confidence: merged.confidence,
        extraction_version: SIMPLE_EXTRACTION_VERSION,
        label: definition.label,
        normalized_value: merged.normalizedValue,
        section: definition.section,
        source_document_id: merged.sourceDocumentId,
        status: merged.status,
        value: merged.value,
      })
      .eq("id", field.id)
      .eq("project_id", input.projectId)
      .eq("manually_edited", false);

    if (updateError) {
      throw new Error(`update_field:${updateError.code}`);
    }
  }
}
