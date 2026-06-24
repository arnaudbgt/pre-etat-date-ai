import type { ProjectResultAiSuggestion } from "@/lib/result/project-result-data";
import type { Json } from "@/types/database.types";

function displayValue(value: Json | null, normalizedValue: string | null) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object") return JSON.stringify(value);
  return normalizedValue ?? "—";
}

export function AiSuggestionsSection({
  suggestions,
}: {
  suggestions: ProjectResultAiSuggestion[];
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Suggestions IA</h2>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Ces propositions sont stockées séparément et ne remplacent jamais
            automatiquement les champs confirmés, validés ou corrigés.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-200">
          Suggestion uniquement
        </span>
      </div>

      {suggestions.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {suggestions.map((suggestion) => (
            <article
              className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
              key={suggestion.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-950">
                    {suggestion.field_id}
                  </p>
                  <p className="mt-1 text-sm text-neutral-800">
                    {displayValue(
                      suggestion.value,
                      suggestion.normalized_value,
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-200">
                  {Math.round(suggestion.confidence)} %
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs text-neutral-600">
                <p>
                  Source : {suggestion.source_document_filename ?? "—"}
                  {suggestion.source_page
                    ? ` — page ${suggestion.source_page}`
                    : ""}
                </p>
                {suggestion.source_excerpt ? (
                  <p className="rounded-lg bg-neutral-50 p-2 text-neutral-700">
                    {suggestion.source_excerpt}
                  </p>
                ) : null}
                {suggestion.reasoning ? (
                  <p>Raison : {suggestion.reasoning}</p>
                ) : null}
                <p>
                  Modèle : {suggestion.model} · prompt{" "}
                  {suggestion.prompt_version}
                </p>
                <p>
                  Application proposée :{" "}
                  {suggestion.should_apply ? "oui" : "non"}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-violet-100 bg-white p-4 text-sm text-neutral-600">
          Aucune suggestion IA enregistrée pour ce dossier.
        </p>
      )}
    </section>
  );
}
