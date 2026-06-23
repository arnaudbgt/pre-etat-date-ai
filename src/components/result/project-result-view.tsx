import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/document-types";
import { fieldStatusLabel, fieldStatusTone } from "@/lib/result/field-status";
import type {
  ProjectResultData,
  ProjectResultField,
} from "@/lib/result/project-result-data";
import type { Json } from "@/types/database.types";

import { FieldManualActions } from "@/components/debug/field-manual-actions";
import { OwnerContextSection } from "@/components/result/owner-context-section";

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "red" | "neutral";
}) {
  const classes = {
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
    red: "bg-red-50 text-red-800 ring-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value)} %` : "—";
}

function displayValue(value: Json | null, normalizedValue: string | null) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : null;
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return normalizedValue;
}

function FieldCard({
  field,
  projectId,
}: {
  field: ProjectResultField;
  projectId: string;
}) {
  const value = displayValue(field.value, field.normalized_value);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">{field.label}</p>
          <p className="mt-1 text-xs text-neutral-500">{field.field_id}</p>
        </div>
        <Badge tone={fieldStatusTone(field.status)}>
          {fieldStatusLabel(field.status)}
        </Badge>
      </div>

      <p className="mt-4 text-sm whitespace-pre-wrap text-neutral-800">
        {value ?? <span className="text-neutral-400">Non renseigné</span>}
      </p>

      <div className="mt-4 grid gap-2 text-xs text-neutral-600">
        <p>Confiance : {field.confidence ?? 0} %</p>
        <p>
          Source :{" "}
          {field.source ? (
            <>
              {field.source.document_filename}
              {field.source.source_page
                ? ` — page ${field.source.source_page}`
                : ""}
            </>
          ) : (
            "—"
          )}
        </p>
        {field.source?.source_excerpt ? (
          <p className="rounded-lg bg-neutral-50 p-2 text-neutral-700">
            {field.source.source_excerpt}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        {field.existsInDatabase ? (
          <FieldManualActions
            fieldId={field.field_id}
            normalizedValue={field.normalized_value}
            projectId={projectId}
            value={field.value}
          />
        ) : (
          <p className="text-xs text-neutral-500">
            Champ non initialisé : modification indisponible pour l’instant.
          </p>
        )}
      </div>
    </div>
  );
}

export function ProjectResultView({
  data,
  projectId,
}: {
  data: ProjectResultData;
  projectId: string;
}) {
  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {[
          ["Complétude", formatPercent(data.report.completion_rate)],
          ["Confiance", formatPercent(data.report.confidence_score)],
          ["Statut", data.report.status],
          ["Confirmés", data.report.confirmed],
          ["À vérifier", data.report.uncertain],
          ["Manquants", data.report.missing],
          ["Incohérents", data.report.inconsistent],
        ].map(([label, value]) => (
          <div
            className="rounded-xl border border-neutral-200 bg-white p-4"
            key={label}
          >
            <p className="text-xs tracking-wide text-neutral-500 uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <OwnerContextSection
        ownerContext={data.ownerContext}
        projectId={projectId}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Documents manquants ou recommandés
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full border-collapse">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-2">Champ</th>
                <th className="px-3 py-2">Document prioritaire</th>
                <th className="px-3 py-2">Alternatives</th>
                <th className="px-3 py-2">Diagnostic</th>
              </tr>
            </thead>
            <tbody>
              {data.coverage.length > 0 ? (
                data.coverage.map((item) => (
                  <tr key={item.field_id}>
                    <td className="border-t border-neutral-200 px-3 py-2 text-sm">
                      {item.field_id}
                    </td>
                    <td className="border-t border-neutral-200 px-3 py-2 text-sm">
                      {DOCUMENT_TYPE_LABELS[item.primary_document]}
                    </td>
                    <td className="border-t border-neutral-200 px-3 py-2 text-sm">
                      {item.alternative_documents.length > 0
                        ? item.alternative_documents
                            .map((type) => DOCUMENT_TYPE_LABELS[type])
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="border-t border-neutral-200 px-3 py-2 text-sm">
                      {item.primary_document_present
                        ? "Document attendu présent mais champ non extrait"
                        : "Document probablement manquant"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="border-t border-neutral-200 px-3 py-3 text-sm text-neutral-500"
                    colSpan={4}
                  >
                    Aucun champ manquant identifié.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {data.sections.map((section) => (
        <section className="space-y-4" key={section.id}>
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {section.fields.map((definition) => (
              <FieldCard
                field={data.fieldsById[definition.fieldId]}
                key={definition.fieldId}
                projectId={projectId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
