import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { AI_SUGGESTION_PROMPT_VERSION } from "./config";
import {
  applyAiSuggestionSafetyGuards,
  type AiFieldSuggestion,
} from "./schema";

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
      "id, field_id, value, normalized_value, confidence, should_apply, source_document_filename, source_page, source_excerpt, reasoning, model, prompt_version, status, suggestion_origin, created_at",
    )
    .eq("project_id", projectId)
    .in("status", ["proposed", "proposed_review", "proposed_conflict", "rejected"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`ai_suggestions_list:${error.code}`);
  }

  devLog("ai_suggestions_list", {
    projectId,
    suggestionsCount: data.length,
  });

  return data.map((suggestion) =>
    applyAiSuggestionSafetyGuards(suggestion),
  );
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
    .in("status", ["proposed", "proposed_review", "proposed_conflict", "rejected"]);

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
      input.suggestions.map((suggestion) => {
        const safeSuggestion = applyAiSuggestionSafetyGuards(suggestion);

        return {
        confidence: safeSuggestion.confidence,
        field_id: safeSuggestion.field_id,
        model: input.model,
        normalized_value: safeSuggestion.normalized_value,
        project_id: input.projectId,
        prompt_version: AI_SUGGESTION_PROMPT_VERSION,
        reasoning: safeSuggestion.reasoning,
        should_apply: safeSuggestion.should_apply,
        suggestion_origin: "ai",
        source_document_filename: safeSuggestion.source_document,
        source_document_id: safeSuggestion.source_document
          ? (documentIdByFilename.get(safeSuggestion.source_document) ?? null)
          : null,
        source_excerpt: safeSuggestion.source_excerpt,
        source_page: safeSuggestion.source_page,
        status: safeSuggestion.status,
        value: safeSuggestion.value,
        };
      }),
    )
    .select(
      "id, field_id, value, normalized_value, confidence, should_apply, source_document_filename, source_page, source_excerpt, reasoning, model, prompt_version, status, suggestion_origin, created_at",
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

  return data.map((suggestion) =>
    applyAiSuggestionSafetyGuards(suggestion),
  );
}
