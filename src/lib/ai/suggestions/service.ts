import "server-only";

import { buildAiSuggestionContext } from "./context-builder";
import {
  AI_SUGGESTION_PROMPT_VERSION,
  getAiSuggestionConfig,
} from "./config";
import { persistAiFieldSuggestions } from "./persistence";
import {
  AI_SUGGESTIONS_JSON_SCHEMA,
  normalizeAiSuggestion,
  normalizeAiSuggestionsResponse,
} from "./schema";

const SYSTEM_PROMPT = `Tu es un moteur d’aide à l’extraction documentaire pour un pré-état daté de copropriété.

Tu dois proposer uniquement des valeurs explicitement présentes dans les extraits fournis.
Tu ne dois jamais inventer, extrapoler, additionner ou interpréter juridiquement.
Tu dois utiliser owner_context pour rattacher les lots, tantièmes et soldes au bon copropriétaire.
Si une information ne concerne pas clairement le propriétaire indiqué, ne la propose pas.
Si la source est ambiguë, mets confidence < 85 et should_apply=false.
Si la valeur est absente, ne retourne pas de suggestion pour ce champ.
Pour les procédures, conserve une formulation factuelle courte issue du document, sans analyse juridique.
Retourne uniquement du JSON conforme au schéma.`;

function parseOpenAiJsonResponse(payload: unknown) {
  const record = payload as {
    output?: Array<{
      content?: Array<{ text?: string; type?: string }>;
    }>;
    output_text?: string;
  };

  const text =
    record.output_text ??
    record.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => typeof content.text === "string")?.text;

  if (!text) {
    return { suggestions: [] };
  }

  return JSON.parse(text) as unknown;
}

function approximateContextSize(context: unknown) {
  return JSON.stringify(context).length;
}

function requestedFieldsCount(context: unknown) {
  const candidate = context as { eligible_fields?: unknown };

  return Array.isArray(candidate.eligible_fields)
    ? candidate.eligible_fields.length
    : 0;
}

function extractOpenAiError(payload: unknown) {
  const record = payload as {
    error?: {
      code?: unknown;
      message?: unknown;
      type?: unknown;
    };
  };

  return {
    code:
      typeof record.error?.code === "string" ? record.error.code : null,
    message:
      typeof record.error?.message === "string"
        ? record.error.message.slice(0, 500)
        : null,
    type:
      typeof record.error?.type === "string" ? record.error.type : null,
  };
}

function logOpenAiError(input: {
  context: unknown;
  errorPayload: unknown;
  model: string;
  status: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const error = extractOpenAiError(input.errorPayload);

  console.error("openai_suggestions_failed", {
    contextApproxBytes: approximateContextSize(input.context),
    errorCode: error.code,
    errorMessage: error.message,
    errorType: error.type,
    model: input.model,
    promptVersion: AI_SUGGESTION_PROMPT_VERSION,
    requestedFieldsCount: requestedFieldsCount(input.context),
    status: input.status,
  });
}

function devLog(label: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.error(label, payload);
}

function rawSuggestionsFromResponse(raw: unknown) {
  const record = raw as { suggestions?: unknown };
  return Array.isArray(record?.suggestions) ? record.suggestions : [];
}

function fieldIdFromRawSuggestion(raw: unknown) {
  const record = raw as { field_id?: unknown };
  return typeof record?.field_id === "string" ? record.field_id : "unknown";
}

function rejectionReason(input: {
  eligibleFieldIds: Set<string>;
  eligibilityReasonByFieldId: Map<string, string>;
  minApplyConfidence: number;
  rawSuggestion: unknown;
}) {
  const normalized = normalizeAiSuggestion(
    input.rawSuggestion,
    input.minApplyConfidence,
  );
  const fieldId = fieldIdFromRawSuggestion(input.rawSuggestion);

  if (!normalized) {
    return { fieldId, reason: "invalid_schema_or_allowlist" };
  }

  if (!input.eligibleFieldIds.has(normalized.field_id)) {
    return {
      fieldId: normalized.field_id,
      reason:
        input.eligibilityReasonByFieldId.get(normalized.field_id) ??
        "not_requested",
    };
  }

  if (normalized.confidence < input.minApplyConfidence) {
    return { fieldId: normalized.field_id, reason: "confidence_below_apply_threshold" };
  }

  return null;
}

async function callOpenAiForSuggestions(input: {
  apiKey: string;
  context: unknown;
  model: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content: SYSTEM_PROMPT,
          role: "system",
        },
        {
          content: JSON.stringify({
            context: input.context,
            prompt_version: AI_SUGGESTION_PROMPT_VERSION,
          }),
          role: "user",
        },
      ],
      model: input.model,
      text: {
        format: {
          name: "pre_etat_date_ai_field_suggestions",
          schema: AI_SUGGESTIONS_JSON_SCHEMA,
          strict: true,
          type: "json_schema",
        },
      },
    }),
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    let errorPayload: unknown = null;

    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = null;
    }

    logOpenAiError({
      context: input.context,
      errorPayload,
      model: input.model,
      status: response.status,
    });

    const openAiError = extractOpenAiError(errorPayload);
    const suffix = [openAiError.type, openAiError.code]
      .filter(Boolean)
      .join(":");

    throw new Error(
      `openai_suggestions_failed:${response.status}${suffix ? `:${suffix}` : ""}`,
    );
  }

  return parseOpenAiJsonResponse(await response.json());
}

export async function generateAiFieldSuggestions(projectId: string) {
  const config = getAiSuggestionConfig();

  if (!config.enabled) {
    return {
      reason: "disabled",
      skipped: true,
      suggestions: [],
    };
  }

  if (!config.openAiApiKey) {
    return {
      reason: "missing_api_key",
      skipped: true,
      suggestions: [],
    };
  }

  const context = await buildAiSuggestionContext(projectId);

  devLog("ai_suggestions_before_openai", {
    contextApproxBytes: approximateContextSize(context),
    documentsIncluded: context.documents.length,
    eligibleFieldsCount: context.eligible_fields.length,
    fieldEligibility: context.field_eligibility.map((field) => ({
      confidence: field.confidence,
      eligible: field.eligible,
      field_id: field.field_id,
      field_origin: field.field_origin,
      manually_edited: field.manually_edited,
      reason: field.reason,
      status: field.status,
    })),
    ownerContextPresent: Boolean(context.owner_context),
    requestedFields: context.eligible_fields.map((field) => field.field_id),
  });

  if (context.eligible_fields.length === 0) {
    return {
      reason: "no_eligible_fields",
      skipped: true,
      suggestions: [],
    };
  }

  const raw = await callOpenAiForSuggestions({
    apiKey: config.openAiApiKey,
    context,
    model: config.model,
  });
  const rawSuggestions = rawSuggestionsFromResponse(raw);
  const eligibleFieldIds = new Set(
    context.eligible_fields.map((field) => field.field_id),
  );
  const eligibilityReasonByFieldId = new Map(
    context.field_eligibility.map((field) => [field.field_id, field.reason]),
  );
  const suggestions = normalizeAiSuggestionsResponse(
    raw,
    config.minApplyConfidence,
  ).filter((suggestion) =>
    context.eligible_fields.some((field) => field.field_id === suggestion.field_id),
  );
  const rejectedReasons = rawSuggestions
    .map((rawSuggestion) =>
      rejectionReason({
        eligibleFieldIds,
        eligibilityReasonByFieldId,
        minApplyConfidence: config.minApplyConfidence,
        rawSuggestion,
      }),
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  devLog("ai_suggestions_after_openai", {
    acceptedSuggestionsCount: suggestions.length,
    rawSuggestionsCount: rawSuggestions.length,
    rejectedReasons,
    rejectedSuggestionsCount: rejectedReasons.length,
  });

  const persisted = await persistAiFieldSuggestions({
    model: config.model,
    projectId,
    suggestions,
  });

  devLog("ai_suggestions_after_persist", {
    persistedSuggestionsCount: persisted.length,
  });

  return {
    reason: null,
    skipped: false,
    suggestions: persisted,
  };
}

export const AI_SUGGESTIONS_SYSTEM_PROMPT = SYSTEM_PROMPT;
