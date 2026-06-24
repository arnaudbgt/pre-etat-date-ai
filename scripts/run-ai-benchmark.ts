import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { generateAiFieldSuggestions } from "@/lib/ai/suggestions/service";
import { getAiSuggestionConfig } from "@/lib/ai/suggestions/config";
import { listAiFieldSuggestions } from "@/lib/ai/suggestions/persistence";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RealWorldReport = {
  scenarios: Array<{
    missingFields?: Array<{ field_id: string }>;
    name: string;
    projectId: string | null;
    report?: {
      completion_rate: number | null;
    } | null;
  }>;
};

const resultsDir = join(process.cwd(), "test-results");
const realWorldReportPath = join(resultsDir, "real-world-report.json");
const jsonReportPath = join(resultsDir, "ai-benchmark-report.json");
const markdownReportPath = join(resultsDir, "ai-benchmark-report.md");

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadRealWorldReport() {
  if (!existsSync(realWorldReportPath)) return null;
  return JSON.parse(readFileSync(realWorldReportPath, "utf8")) as RealWorldReport;
}

async function deterministicFields(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("extracted_fields")
    .select("field_id, status, confidence")
    .eq("project_id", projectId);

  if (error) throw new Error(`ai_benchmark_fields:${error.code}`);

  return data;
}

function estimateTokensFromSuggestions(suggestions: Awaited<ReturnType<typeof listAiFieldSuggestions>>) {
  return Math.ceil(JSON.stringify(suggestions).length / 4);
}

function estimatedCost(inputTokens: number) {
  return Number(((inputTokens / 1_000_000) * 0.4).toFixed(4));
}

async function run() {
  loadLocalEnv();
  mkdirSync(resultsDir, { recursive: true });

  const config = getAiSuggestionConfig();
  const realWorldReport = loadRealWorldReport();
  const scenarios = realWorldReport?.scenarios ?? [];
  const skippedReason = !realWorldReport
    ? "missing_real_world_report"
    : !config.enabled
      ? "ai_disabled"
      : !config.openAiApiKey
        ? "missing_openai_api_key"
        : null;
  const report = {
    generatedAt: new Date().toISOString(),
    mode: config.completionMode,
    model: config.model,
    scenarios: [] as Array<Record<string, unknown>>,
    skipped: Boolean(skippedReason),
    skippedReason,
    summary: {
      estimatedInputTokens: 0,
      scenarios: scenarios.length,
      suggestions: 0,
    },
  };

  for (const scenario of scenarios) {
    if (!scenario.projectId || skippedReason) {
      const deterministic = scenario.projectId
        ? await deterministicFields(scenario.projectId).catch(() => [])
        : [];
      report.scenarios.push({
        completionCurrent: scenario.report?.completion_rate ?? null,
        deterministicFilled: deterministic.filter((field) => field.status !== "missing").length,
        name: scenario.name,
        projectId: scenario.projectId,
        skippedReason,
      });
      continue;
    }

    const startedAt = performance.now();
    const beforeSuggestions = await listAiFieldSuggestions(scenario.projectId);
    const generated = await generateAiFieldSuggestions(scenario.projectId);
    const afterSuggestions = await listAiFieldSuggestions(scenario.projectId);
    const durationMs = Math.round(performance.now() - startedAt);
    const deterministic = await deterministicFields(scenario.projectId);
    const deterministicFilled = deterministic.filter(
      (field) => field.status !== "missing",
    ).length;
    const deterministicFieldIds = new Set(
      deterministic
        .filter((field) => field.status !== "missing")
        .map((field) => field.field_id),
    );
    const aiFieldIds = new Set(afterSuggestions.map((item) => item.field_id));
    const missingBefore = scenario.missingFields?.map((field) => field.field_id) ?? [];
    const completionEstimated =
      missingBefore.length === 0
        ? scenario.report?.completion_rate
        : Math.round(
            ((deterministicFilled + missingBefore.filter((field) => aiFieldIds.has(field)).length) /
              (deterministicFilled + missingBefore.length)) *
              100,
          );

    report.summary.suggestions += afterSuggestions.length;
    const inputTokensApprox = estimateTokensFromSuggestions(afterSuggestions);
    report.summary.estimatedInputTokens += inputTokensApprox;
    report.scenarios.push({
      aiSuggestionsAfter: afterSuggestions.length,
      aiSuggestionsBefore: beforeSuggestions.length,
      aiOnlyFields: [...aiFieldIds].filter((fieldId) => !deterministicFieldIds.has(fieldId)),
      completionCurrent: scenario.report?.completion_rate ?? null,
      completionEstimatedAfterSuggestions: completionEstimated,
      conflicts: afterSuggestions.filter((item) => item.status === "proposed_conflict")
        .length,
      deterministicFilled,
      durationMs,
      estimatedCost: estimatedCost(inputTokensApprox),
      estimatedInputTokens: inputTokensApprox,
      generatedSkipped: generated.skipped,
      ignoredConfirmedFields: [...aiFieldIds].filter((fieldId) =>
        deterministicFieldIds.has(fieldId),
      ),
      name: scenario.name,
      projectId: scenario.projectId,
      suggestionsByField: [...aiFieldIds],
      suggestionsRejected: afterSuggestions.filter((item) => item.status === "rejected")
        .length,
    });
  }

  writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  writeFileSync(
    markdownReportPath,
    [
      "# AI benchmark",
      "",
      `- Généré : ${report.generatedAt}`,
      `- Mode : ${report.mode}`,
      `- Modèle : ${report.model}`,
      `- Statut : ${report.skipped ? `skipped (${report.skippedReason})` : "executed"}`,
      `- Scénarios : ${report.summary.scenarios}`,
      `- Suggestions : ${report.summary.suggestions}`,
      `- Tokens approx : ${report.summary.estimatedInputTokens}`,
      "",
      ...report.scenarios.map(
        (scenario) =>
          `## ${scenario.name}\n\n` +
          `- Projet : ${scenario.projectId ?? "—"}\n` +
          `- Suggestions : ${scenario.aiSuggestionsAfter ?? 0}\n` +
          `- Completion déterministe : ${scenario.completionCurrent ?? "—"}\n` +
          `- Completion estimée après suggestions : ${scenario.completionEstimatedAfterSuggestions ?? "—"}\n` +
          `- Champs uniquement IA : ${(scenario.aiOnlyFields as string[] | undefined)?.join(", ") || "—"}\n` +
          `- Rejets : ${scenario.suggestionsRejected ?? 0}\n` +
          `- Conflits : ${scenario.conflicts ?? 0}\n` +
          `- Durée : ${scenario.durationMs ?? "—"} ms\n`,
      ),
    ].join("\n"),
  );

  console.log(`Rapports écrits :\n- ${jsonReportPath}\n- ${markdownReportPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
