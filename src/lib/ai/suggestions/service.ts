import "server-only";

import { buildAiSuggestionContext } from "./context-builder";
import {
  AI_SUGGESTION_PROMPT_VERSION,
  getAiSuggestionConfig,
} from "./config";
import { applyFieldAiGuardrailsToSuggestions } from "./field-ai-guardrails";
import { persistAiFieldSuggestions } from "./persistence";
import { mergeAiFieldSuggestions } from "./merge-suggestions";
import { selectAiPromptGroups } from "./prompt-groups";
import {
  AI_SUGGESTIONS_JSON_SCHEMA,
  type AiFieldSuggestion,
  normalizeAiSuggestion,
  normalizeAiSuggestionsResponse,
} from "./schema";
import { AI_SUGGESTION_FIELD_IDS } from "./field-allowlist";

const SYSTEM_PROMPT = `Tu es un spécialiste français du pré-état daté en copropriété.

Tu analyses des extraits de documents de copropriété : appels de fonds, relevés copropriétaires, PV d’AG, annexes comptables, fiche synthétique, diagnostics, règlement de copropriété et titre de propriété.

Ton objectif est de proposer des valeurs pour les champs du catalogue fourni, uniquement lorsque l’information est explicitement présente dans les extraits.

Règles impératives :
- Ne jamais inventer.
- Ne jamais calculer, déduire, estimer ou extrapoler une valeur non explicitement indiquée.
- Ne jamais produire d’interprétation juridique.
- Utiliser owner_reference en priorité lorsqu’il existe.
- Utiliser owner_context pour rattacher les lots, tantièmes, soldes et montants au bon propriétaire.
- Si une information concerne un autre copropriétaire, ne pas la proposer.
- Si une information est absente, ambiguë ou insuffisamment sourcée, ne pas proposer.
- Ne jamais proposer d’écrasement d’un champ protégé.
- Pour un champ confirmed déterministe, proposer uniquement une contradiction importante avec status proposed_review ou proposed_conflict.
- Remplir aussi les champs d’identification vendeur depuis les appels de fonds lorsque le document indique explicitement le copropriétaire, son adresse, son numéro client ou son compte.
- Extraire seller_account_number depuis les libellés "Numéro client", "compte copropriétaire" ou "référence client" uniquement si le contexte rattache ce numéro au vendeur.
- Extraire account_statement_date depuis "Solde au", "arrêté au" ou une date de relevé de compte explicitement associée.
- Extraire current_balance_amount depuis "Solde au" uniquement avec le montant explicitement associé ; préciser current_balance_label si le texte indique débiteur, créditeur, à payer ou en votre faveur.
- Extraire current_quarter depuis la période d’appel de fonds, par exemple "période du", "période de", "01/01", "31/03", "T1", "T2", "T3" ou "T4".
- Extraire works_fund_seller_share_amount et works_fund_seller_share_date uniquement si une quote-part vendeur, part attachée au lot, montant acquis ou montant de fonds travaux rattaché au copropriétaire est explicitement indiqué.
- Extraire works_fund_annual_amount seulement si un montant annuel ou global du fonds travaux est explicitement indiqué ; ne jamais annualiser une cotisation trimestrielle.
- Extraire legal_proceedings_description depuis les sections "compte rendu du syndic", "procédure", "contentieux" ou "à l’encontre de", en conservant une formulation factuelle courte issue du document.
- Si ces champs sont explicitement présents dans les extraits, proposer-les même si le moteur déterministe ne les a pas trouvés : account_statement_date, current_balance_amount, current_balance_label, current_quarter, works_fund_annual_amount, works_fund_seller_share_amount, works_fund_seller_share_date, legal_proceedings_description.
- Utiliser les groupes métier transmis dans le contexte pour traiter systématiquement : identité/propriétaire/lots, syndic, situation financière, charges/budget/fonds travaux, travaux/juridique/diagnostics.
- Pour les lots et tantièmes, fusionner les informations complémentaires seulement si elles sont explicitement sourcées.
- Pour chaque suggestion, fournir source_document, source_page si possible, source_excerpt court et reasoning court.
- Retourner uniquement un JSON conforme au schéma.`;

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

function estimateInputTokens(context: unknown) {
  return Math.ceil(approximateContextSize(context) / 4);
}

function estimateCostUsd(inputTokens: number) {
  return Number(((inputTokens / 1_000_000) * 0.4).toFixed(4));
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
    const reason = input.eligibilityReasonByFieldId.get(normalized.field_id);
    if (
      reason === "confirmed" &&
      (normalized.status === "proposed_review" ||
        normalized.status === "proposed_conflict")
    ) {
      return null;
    }

    return {
      fieldId: normalized.field_id,
      reason: reason ?? "not_requested",
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

function valuesConflict(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;

  const normalize = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  return normalize(a) !== normalize(b);
}

function buildOwnerReferenceConflictSuggestions(
  context: Awaited<ReturnType<typeof buildAiSuggestionContext>>,
): AiFieldSuggestion[] {
  const ownerReference = context.owner_reference;
  const ownerContext = context.owner_context;
  const suggestions: AiFieldSuggestion[] = [];

  if (!ownerReference || !ownerContext) {
    return suggestions;
  }

  if (valuesConflict(ownerReference.owner_name, ownerContext.owner_name)) {
    suggestions.push({
      confidence: ownerReference.confidence,
      field_id: "seller_name",
      normalized_value: ownerReference.owner_name,
      reasoning:
        "Conflit entre le propriétaire identifié dans le titre de propriété et le contexte propriétaire manuel.",
      should_apply: false,
      source_document: ownerReference.source_document_filename,
      source_excerpt: ownerReference.source_excerpt,
      source_page: ownerReference.source_page,
      status: "proposed_conflict",
      value: ownerReference.owner_name,
    });
  }

  if (
    ownerContext.known_lot_number &&
    ownerReference.lot_numbers.length > 0 &&
    !ownerReference.lot_numbers.includes(ownerContext.known_lot_number)
  ) {
    suggestions.push({
      confidence: ownerReference.confidence,
      field_id: "lot_number",
      normalized_value: ownerReference.lot_numbers.join(", "),
      reasoning:
        "Conflit entre les lots du titre de propriété et le numéro de lot manuel.",
      should_apply: false,
      source_document: ownerReference.source_document_filename,
      source_excerpt: ownerReference.source_excerpt,
      source_page: ownerReference.source_page,
      status: "proposed_conflict",
      value: ownerReference.lot_numbers,
    });
  }

  return suggestions;
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
  const promptGroups = selectAiPromptGroups(
    context.eligible_fields.map((field) => field.field_id),
  );
  const openAiContext = {
    ...context,
    prompt_groups: promptGroups,
  };
  const estimatedInputTokens = estimateInputTokens(openAiContext);

  devLog("ai_suggestions_before_openai", {
    allowlistSize: AI_SUGGESTION_FIELD_IDS.length,
    completionMode: context.completion_mode,
    contextApproxBytes: approximateContextSize(openAiContext),
    documentsIncluded: context.documents.length,
    estimatedCost: estimateCostUsd(estimatedInputTokens),
    estimatedInputTokens,
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
    groupsRun: promptGroups.map((group) => group.id),
    ownerContextPresent: Boolean(context.owner_context),
    ownerReferencePresent: Boolean(context.owner_reference),
    promptVersion: AI_SUGGESTION_PROMPT_VERSION,
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
    context: openAiContext,
    model: config.model,
  });
  const rawSuggestions = rawSuggestionsFromResponse(raw);
  const eligibleFieldIds = new Set<string>(
    context.eligible_fields.map((field) => field.field_id),
  );
  const eligibilityReasonByFieldId = new Map<string, string>(
    context.field_eligibility.map((field) => [field.field_id, field.reason]),
  );
  const normalizedSuggestions = normalizeAiSuggestionsResponse(
    raw,
    config.minApplyConfidence,
  )
    .map((suggestion) =>
      eligibilityReasonByFieldId.get(suggestion.field_id) === "confirmed"
        ? { ...suggestion, should_apply: false }
        : suggestion,
    )
    .filter((suggestion) => {
      if (eligibleFieldIds.has(suggestion.field_id)) return true;
      return (
        eligibilityReasonByFieldId.get(suggestion.field_id) === "confirmed" &&
        (suggestion.status === "proposed_review" ||
          suggestion.status === "proposed_conflict")
      );
    });
  const guardrailResults =
    applyFieldAiGuardrailsToSuggestions(normalizedSuggestions);
  const ownerConflictSuggestions = buildOwnerReferenceConflictSuggestions(context);
  const suggestions = mergeAiFieldSuggestions({
    documents: context.documents,
    suggestions: [
      ...guardrailResults.map((result) => result.suggestion),
      ...ownerConflictSuggestions,
    ],
  });
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
    guardrailRejectedReasons: guardrailResults
      .filter((result) => result.reason)
      .map((result) => result.reason),
    groupsRun: promptGroups.map((group) => group.id),
    ownerConflictSuggestionsCount: ownerConflictSuggestions.length,
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
