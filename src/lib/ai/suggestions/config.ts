import "server-only";

export const AI_SUGGESTION_PROMPT_VERSION = "ai-suggestions-v1";

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getAiSuggestionConfig() {
  return {
    enabled: process.env.AI_COMPLETION_ENABLED === "true",
    maxCharsPerDocument: numberFromEnv(
      "AI_COMPLETION_MAX_CHARS_PER_DOCUMENT",
      12_000,
    ),
    maxDocuments: numberFromEnv("AI_COMPLETION_MAX_DOCUMENTS", 8),
    maxPagesPerDocument: numberFromEnv("AI_COMPLETION_MAX_PAGES_PER_DOCUMENT", 6),
    maxTotalChars: numberFromEnv("AI_COMPLETION_MAX_TOTAL_CHARS", 50_000),
    minApplyConfidence: numberFromEnv("AI_COMPLETION_MIN_APPLY_CONFIDENCE", 85),
    model: process.env.AI_COMPLETION_MODEL || "gpt-4.1-mini",
    openAiApiKey: process.env.OPENAI_API_KEY || "",
  };
}
