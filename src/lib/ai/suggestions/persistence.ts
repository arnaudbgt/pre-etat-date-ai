import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { AI_SUGGESTION_PROMPT_VERSION } from "./config";
import type { AiFieldSuggestion } from "./schema";

function devLog(label: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.error(label, payload);
}

export async function listAiFieldSuggestions(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_field_suggestions")
    .select(
      "id, field_id, value, normalized_value, confidence, should_apply, source_document_filename, source_page, source_excerpt, reasoning, model, prompt_version, status, created_at",
    )
    .eq("project_id", projectId)
    .eq("status", "proposed")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`ai_suggestions_list:${error.code}`);
  }

  devLog("ai_suggestions_list", {
    projectId,
    suggestionsCount: data.length,
  });

  return data;
}

export async function persistAiFieldSuggestions(input: {
  model: string;
  projectId: string;
  suggestions: AiFieldSuggestion[];
}) {
  const supabase = getSupabaseAdmin();

  const obsoleteResult = await supabase
    .from("ai_field_suggestions")
    .update({ status: "obsolete" })
    .eq("project_id", input.projectId)
    .eq("prompt_version", AI_SUGGESTION_PROMPT_VERSION)
    .eq("status", "proposed");

  if (obsoleteResult.error) {
    throw new Error(`ai_suggestions_obsolete:${obsoleteResult.error.code}`);
  }

  devLog("ai_suggestions_obsolete_previous", {
    incomingSuggestionsCount: input.suggestions.length,
    projectId: input.projectId,
  });

  if (input.suggestions.length === 0) {
    return [];
  }

  const documentsResult = await supabase
    .from("documents")
    .select("id, filename")
    .eq("project_id", input.projectId);

  if (documentsResult.error) {
    throw new Error(`ai_suggestions_documents:${documentsResult.error.code}`);
  }

  const documentIdByFilename = new Map(
    documentsResult.data.map((document) => [document.filename, document.id]),
  );

  const { data, error } = await supabase
    .from("ai_field_suggestions")
    .insert(
      input.suggestions.map((suggestion) => ({
        confidence: suggestion.confidence,
        field_id: suggestion.field_id,
        model: input.model,
        normalized_value: suggestion.normalized_value,
        project_id: input.projectId,
        prompt_version: AI_SUGGESTION_PROMPT_VERSION,
        reasoning: suggestion.reasoning,
        should_apply: suggestion.should_apply,
        source_document_filename: suggestion.source_document,
        source_document_id: suggestion.source_document
          ? (documentIdByFilename.get(suggestion.source_document) ?? null)
          : null,
        source_excerpt: suggestion.source_excerpt,
        source_page: suggestion.source_page,
        status: "proposed",
        value: suggestion.value,
      })),
    )
    .select(
      "id, field_id, value, normalized_value, confidence, should_apply, source_document_filename, source_page, source_excerpt, reasoning, model, prompt_version, status, created_at",
    );

  if (error) {
    devLog("ai_suggestions_insert_failed", {
      code: error.code,
      details: error.details,
      message: error.message,
      projectId: input.projectId,
    });
    throw new Error(`ai_suggestions_insert:${error.code}`);
  }

  devLog("ai_suggestions_inserted", {
    fieldIds: data.map((suggestion) => suggestion.field_id),
    insertedCount: data.length,
    projectId: input.projectId,
  });

  return data;
}
