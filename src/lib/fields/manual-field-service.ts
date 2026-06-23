import "server-only";

import type { Json } from "@/types/database.types";

import { evaluateAndPersistProjectConsistency } from "@/lib/consistency/persistence";
import { EXTRACTION_FIELD_BY_ID } from "@/lib/extraction/simple/catalog";
import { normalizeComparable } from "@/lib/extraction/simple/normalization";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type FieldStatus = "confirmed" | "uncertain" | "missing" | "inconsistent";
type FieldOrigin = "automatic" | "manual" | "validated";

export function isKnownFieldId(fieldId: string) {
  return fieldId in EXTRACTION_FIELD_BY_ID;
}

export function normalizeManualFieldValue(value: string) {
  return normalizeComparable(value);
}

export function buildManualFieldUpdate(input: {
  origin: Exclude<FieldOrigin, "automatic">;
  value?: string;
}) {
  const update: {
    confidence: number;
    edited_by_user_at: string;
    field_origin: FieldOrigin;
    manually_edited: boolean;
    normalized_value?: string;
    status: FieldStatus;
    value?: Json;
  } = {
    confidence: 100,
    edited_by_user_at: new Date().toISOString(),
    field_origin: input.origin,
    manually_edited: true,
    status: "confirmed",
  };

  if (input.value !== undefined) {
    update.value = input.value;
    update.normalized_value = normalizeManualFieldValue(input.value);
  }

  return update;
}

async function assertProjectField(projectId: string, fieldId: string) {
  if (!isKnownFieldId(fieldId)) {
    throw new Error("manual_field_unknown");
  }

  const supabase = getSupabaseAdmin();
  const { data: field, error } = await supabase
    .from("extracted_fields")
    .select("id")
    .eq("project_id", projectId)
    .eq("field_id", fieldId)
    .maybeSingle();

  if (error) {
    throw new Error(`manual_field_load:${error.code}`);
  }

  if (!field) {
    throw new Error("manual_field_not_found");
  }
}

export async function updateManualField(input: {
  fieldId: string;
  projectId: string;
  value: string;
}) {
  await assertProjectField(input.projectId, input.fieldId);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("extracted_fields")
    .update(buildManualFieldUpdate({ origin: "manual", value: input.value }))
    .eq("project_id", input.projectId)
    .eq("field_id", input.fieldId);

  if (error) {
    throw new Error(`manual_field_update:${error.code}`);
  }

  return evaluateAndPersistProjectConsistency(input.projectId);
}

export async function validateManualField(input: {
  fieldId: string;
  projectId: string;
}) {
  await assertProjectField(input.projectId, input.fieldId);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("extracted_fields")
    .update(buildManualFieldUpdate({ origin: "validated" }))
    .eq("project_id", input.projectId)
    .eq("field_id", input.fieldId);

  if (error) {
    throw new Error(`manual_field_validate:${error.code}`);
  }

  return evaluateAndPersistProjectConsistency(input.projectId);
}
