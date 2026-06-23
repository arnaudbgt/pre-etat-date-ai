import type { Json } from "@/types/database.types";

import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/document-types";
import type { ProjectDebugData } from "@/lib/debug/project-debug-data";

import { DocumentTypeOverride } from "./document-type-override";
import { FieldManualActions } from "./field-manual-actions";

const MAX_JSON_DEPTH = 4;
const MAX_JSON_ARRAY_ITEMS = 20;
const MAX_JSON_OBJECT_KEYS = 30;
const MAX_STRING_LENGTH = 500;
const MAX_JSON_OUTPUT_LENGTH = 8_000;

function truncateText(value: string, maxLength = MAX_STRING_LENGTH) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}… [tronqué ${value.length - maxLength} caractères]`
    : value;
}

function sanitizeJsonValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return truncateText(value);
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[référence circulaire]";
  }

  if (depth >= MAX_JSON_DEPTH) {
    return Array.isArray(value) ? "[tableau tronqué]" : "[objet tronqué]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_JSON_ARRAY_ITEMS)
      .map((item) => sanitizeJsonValue(item, depth + 1, seen));

    if (value.length > MAX_JSON_ARRAY_ITEMS) {
      items.push(`[${value.length - MAX_JSON_ARRAY_ITEMS} éléments tronqués]`);
    }

    return items;
  }

  const entries = Object.entries(value).slice(0, MAX_JSON_OBJECT_KEYS);
  const result: Record<string, unknown> = {};

  for (const [key, entryValue] of entries) {
    result[key] = sanitizeJsonValue(entryValue, depth + 1, seen);
  }

  const extraKeys = Object.keys(value).length - entries.length;

  if (extraKeys > 0) {
    result.__truncated_keys = `${extraKeys} clés tronquées`;
  }

  return result;
}

function safeJsonStringify(value: Json | null) {
  try {
    const json = JSON.stringify(sanitizeJsonValue(value), null, 2);
    return json.length > MAX_JSON_OUTPUT_LENGTH
      ? `${json.slice(0, MAX_JSON_OUTPUT_LENGTH)}\n… [JSON tronqué]`
      : json;
  } catch {
    return "[JSON non affichable]";
  }
}

function JsonBlock({ value }: { value: Json | null }) {
  if (value === null) {
    return <span className="text-neutral-400">—</span>;
  }

  return (
    <pre className="max-h-56 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-50">
      {safeJsonStringify(value)}
    </pre>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="max-w-sm border-t border-neutral-200 px-3 py-2 align-top text-sm whitespace-normal">
      {children}
    </td>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
      {children}
    </span>
  );
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value)} %` : "—";
}

function fieldOriginLabel(origin: "automatic" | "manual" | "validated") {
  if (origin === "manual") {
    return "Corrigé manuellement";
  }

  if (origin === "validated") {
    return "Validé";
  }

  return "Automatique";
}

export function ProjectDebugView({
  data,
  projectId,
}: {
  data: ProjectDebugData;
  projectId: string;
}) {
  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Completion", formatPercent(data.report.completion_rate)],
          ["Confiance", formatPercent(data.report.confidence_score)],
          ["Statut rapport", data.report.status],
          ["Confirmed", data.report.confirmed],
          ["Uncertain", data.report.uncertain],
          ["Missing", data.report.missing],
          ["Inconsistent", data.report.inconsistent],
        ].map(([label, value]) => (
          <div className="rounded-xl border border-neutral-200 p-4" key={label}>
            <p className="text-xs tracking-wide text-neutral-500 uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Documents manquants ou recommandés
        </h2>
        <p className="text-sm text-neutral-600">
          Lecture indicative des champs manquants : si le document prioritaire
          est déjà présent, le problème vient probablement d’une règle
          d’extraction insuffisante plutôt que d’une pièce absente.
        </p>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-2">field_id</th>
                <th className="px-3 py-2">Document prioritaire attendu</th>
                <th className="px-3 py-2">Alternatives possibles</th>
                <th className="px-3 py-2">Diagnostic</th>
                <th className="px-3 py-2">Raison</th>
              </tr>
            </thead>
            <tbody>
              {data.coverage.length > 0 ? (
                data.coverage.map((item) => (
                  <tr key={item.field_id}>
                    <Cell>{item.field_id}</Cell>
                    <Cell>{DOCUMENT_TYPE_LABELS[item.primary_document]}</Cell>
                    <Cell>
                      {item.alternative_documents.length > 0
                        ? item.alternative_documents
                            .map((type) => DOCUMENT_TYPE_LABELS[type])
                            .join(", ")
                        : "—"}
                    </Cell>
                    <Cell>
                      <Badge>
                        {item.primary_document_present
                          ? "Document attendu présent mais champ non extrait"
                          : "Document probablement manquant"}
                      </Badge>
                    </Cell>
                    <Cell>{item.reason}</Cell>
                  </tr>
                ))
              ) : (
                <tr>
                  <Cell>Aucun champ missing</Cell>
                  <Cell>—</Cell>
                  <Cell>—</Cell>
                  <Cell>—</Cell>
                  <Cell>
                    Tous les champs suivis sont renseignés ou arbitrés.
                  </Cell>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Documents du projet</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-2">Fichier</th>
                <th className="px-3 py-2">Type détecté</th>
                <th className="px-3 py-2">Correction</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Métriques PDF</th>
                <th className="px-3 py-2">Top candidats</th>
                <th className="px-3 py-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.map((document) => (
                <tr key={document.id}>
                  <Cell>
                    <p className="font-medium">{document.filename}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {document.id}
                    </p>
                  </Cell>
                  <Cell>
                    <div className="space-y-2">
                      <p>
                        {DOCUMENT_TYPE_LABELS[document.effective_document_type]}{" "}
                        {typeof document.classification_confidence === "number"
                          ? `(${Math.round(document.classification_confidence)}%)`
                          : ""}
                      </p>
                      <Badge>
                        {document.is_document_type_manual
                          ? "Corrigé manuellement"
                          : "Automatique"}
                      </Badge>
                      <p className="text-xs text-neutral-500">
                        automatique : {document.document_type}
                      </p>
                    </div>
                  </Cell>
                  <Cell>
                    <DocumentTypeOverride
                      currentType={document.effective_document_type}
                      documentId={document.id}
                      projectId={projectId}
                    />
                  </Cell>
                  <Cell>
                    <p>{document.classification_status}</p>
                    <p className="text-xs text-neutral-500">
                      {document.classification_version ?? "—"}
                    </p>
                  </Cell>
                  <Cell>
                    <ul className="space-y-1 text-xs">
                      <li>
                        pdf_has_text_layer :{" "}
                        {String(
                          document.classification_metrics.pdf_has_text_layer ??
                            "—",
                        )}
                      </li>
                      <li>
                        totalPages :{" "}
                        {document.classification_metrics.totalPages ?? "—"}
                      </li>
                      <li>
                        extractedCharacters :{" "}
                        {document.classification_metrics.extractedCharacters ??
                          "—"}
                      </li>
                    </ul>
                  </Cell>
                  <Cell>
                    <ul className="space-y-1">
                      {document.top_candidates.length > 0 ? (
                        document.top_candidates.map((candidate) => (
                          <li key={`${document.id}-${candidate.type}`}>
                            {candidate.type} ({candidate.score ?? 0}%)
                          </li>
                        ))
                      ) : (
                        <li className="text-neutral-400">—</li>
                      )}
                    </ul>
                  </Cell>
                  <Cell>
                    <JsonBlock value={document.classification_details} />
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Champs extraits</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-2">field_id</th>
                <th className="px-3 py-2">value</th>
                <th className="px-3 py-2">normalized_value</th>
                <th className="px-3 py-2">confidence</th>
                <th className="px-3 py-2">status</th>
                <th className="px-3 py-2">origine</th>
                <th className="px-3 py-2">source_document_id</th>
                <th className="px-3 py-2">version</th>
                <th className="px-3 py-2">manuel</th>
                <th className="px-3 py-2">actions</th>
                <th className="px-3 py-2">candidate_count</th>
                <th className="px-3 py-2">best_candidate_confidence</th>
                <th className="px-3 py-2">best_candidate_rule</th>
                <th className="px-3 py-2">failure_stage</th>
                <th className="px-3 py-2">rejection_reason</th>
              </tr>
            </thead>
            <tbody>
              {data.fields.map((field) => (
                <tr key={field.id}>
                  <Cell>{field.field_id}</Cell>
                  <Cell>
                    <JsonBlock value={field.value} />
                  </Cell>
                  <Cell>{field.normalized_value ?? "—"}</Cell>
                  <Cell>{field.confidence ?? "—"}</Cell>
                  <Cell>{field.status}</Cell>
                  <Cell>
                    <Badge>{fieldOriginLabel(field.field_origin)}</Badge>
                    {field.edited_by_user_at ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        {field.edited_by_user_at}
                      </p>
                    ) : null}
                  </Cell>
                  <Cell>{field.source_document_id ?? "—"}</Cell>
                  <Cell>{field.extraction_version}</Cell>
                  <Cell>{field.manually_edited ? "oui" : "non"}</Cell>
                  <Cell>
                    <FieldManualActions
                      fieldId={field.field_id}
                      normalizedValue={field.normalized_value}
                      projectId={projectId}
                      value={field.value}
                    />
                  </Cell>
                  <Cell>{field.debug_diagnostic.candidate_count}</Cell>
                  <Cell>
                    {field.debug_diagnostic.best_candidate_confidence ?? "—"}
                  </Cell>
                  <Cell>
                    {field.debug_diagnostic.best_candidate_rule ?? "—"}
                  </Cell>
                  <Cell>{field.debug_diagnostic.failure_stage ?? "—"}</Cell>
                  <Cell>{field.debug_diagnostic.rejection_reason}</Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Sources</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Page</th>
                <th className="px-3 py-2">matched_rule</th>
                <th className="px-3 py-2">confidence</th>
                <th className="px-3 py-2">source_excerpt</th>
                <th className="px-3 py-2">source_locator</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((source) => (
                <tr key={`${source.extracted_field_id}-${source.document_id}`}>
                  <Cell>{source.document_filename}</Cell>
                  <Cell>{source.source_page ?? "—"}</Cell>
                  <Cell>{source.matched_rule ?? "—"}</Cell>
                  <Cell>{source.confidence ?? "—"}</Cell>
                  <Cell>{source.source_excerpt ?? "—"}</Cell>
                  <Cell>
                    <JsonBlock value={source.source_locator} />
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
