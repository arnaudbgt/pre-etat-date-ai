"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GenerateState = "idle" | "loading" | "success" | "error";

function errorMessageFromReason(reason: unknown) {
  if (reason === "disabled") {
    return "Suggestions IA désactivées en environnement local.";
  }

  if (reason === "missing_api_key") {
    return "Clé OpenAI manquante : impossible de générer les suggestions IA.";
  }

  if (reason === "no_eligible_fields") {
    return "Aucun champ éligible aux suggestions IA.";
  }

  return "Impossible de générer les suggestions IA.";
}

export function AiSuggestionsGenerateButton({
  enabled,
  projectId,
}: {
  enabled: boolean;
  projectId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<GenerateState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function generateSuggestions() {
    setState("loading");
    setMessage("Analyse IA en cours...");

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/suggestions`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: unknown;
        reason?: unknown;
        skipped?: unknown;
      } | null;

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Impossible de générer les suggestions IA.",
        );
      }

      if (payload?.skipped) {
        setState("error");
        setMessage(errorMessageFromReason(payload.reason));
        return;
      }

      setState("success");
      setMessage("Suggestions IA générées");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible de générer les suggestions IA.",
      );
    }
  }

  if (!enabled) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        Suggestions IA désactivées en environnement local
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-900">
          Génération des propositions IA
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Les suggestions sont stockées séparément et ne modifient jamais les
          champs extraits.
        </p>
        {message ? (
          <p
            className={`mt-2 text-sm ${
              state === "error" ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
      <button
        className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={state === "loading"}
        onClick={() => void generateSuggestions()}
        type="button"
      >
        {state === "loading"
          ? "Analyse IA en cours..."
          : "Générer les suggestions IA"}
      </button>
    </div>
  );
}
