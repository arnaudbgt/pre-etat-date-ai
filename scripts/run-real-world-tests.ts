import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";

import { classifyDocument } from "@/lib/classification/classifier";
import { getClassificationLimits } from "@/lib/classification/config";
import { CLASSIFICATION_VERSION } from "@/lib/classification/types";
import { evaluateAndPersistProjectConsistency } from "@/lib/consistency/persistence";
import { getEffectiveDocumentType } from "@/lib/documents/document-types";
import { extractComplexFields } from "@/lib/extraction/simple/complex-extractor";
import { extractSimpleFields } from "@/lib/extraction/simple/extractor";
import { extractFinancialFields } from "@/lib/extraction/simple/financial-extractor";
import { normalizeComparable } from "@/lib/extraction/simple/normalization";
import { persistDeterministicExtraction } from "@/lib/extraction/simple/persistence";
import { extractTextFromPdfBuffer } from "@/lib/pdf/extract-text-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PDF_MIME_TYPE, SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";
import { sanitizePdfFilename } from "@/lib/upload/validation";
import type { Database, Json } from "@/types/database.types";

type Scenario = {
  expected: {
    documents?: Record<string, Database["public"]["Enums"]["document_type"]>;
    fields?: Record<string, string>;
  };
  files: string[];
  name: string;
};

type DocumentCheck = {
  actual: string | null;
  confidence: number | null;
  expected: string;
  filename: string;
  ok: boolean;
  status: string | null;
};

type FieldCheck = {
  actual: string | null;
  confidence: number | null;
  expected: string;
  field_id: string;
  ok: boolean;
  status: string | null;
};

type ScenarioReport = {
  documents: DocumentCheck[];
  errors: string[];
  fields: FieldCheck[];
  missingFields: Array<{
    confidence: number | null;
    field_id: string;
    status: string;
  }>;
  name: string;
  ok: boolean;
  projectId: string | null;
  report: {
    completion_rate: number | null;
    confidence_score: number | null;
    status: string | null;
  } | null;
};

type RealWorldReport = {
  generatedAt: string;
  scenarios: ScenarioReport[];
  summary: {
    failed: number;
    passed: number;
    scenarios: number;
  };
};

const realWorldDir = join(process.cwd(), "test-data", "real-world");
const scenariosPath = join(realWorldDir, "scenarios.json");
const resultsDir = join(process.cwd(), "test-results");
const jsonReportPath = join(resultsDir, "real-world-report.json");
const markdownReportPath = join(resultsDir, "real-world-report.md");

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function assertConfiguration() {
  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Configuration Supabase locale incomplète : ${missing.join(", ")}`,
    );
  }
}

function loadScenarios(): Scenario[] {
  if (!existsSync(scenariosPath)) {
    throw new Error(
      [
        `Scénarios introuvables : ${scenariosPath}`,
        "Créer le fichier local avec :",
        "cp test-data/real-world/scenarios.example.json test-data/real-world/scenarios.json",
      ].join("\n"),
    );
  }

  const parsed = JSON.parse(readFileSync(scenariosPath, "utf8")) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Le fichier scenarios.json doit contenir un tableau.");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Scénario invalide à l’index ${index}.`);
    }

    const scenario = item as Partial<Scenario>;

    if (
      typeof scenario.name !== "string" ||
      !Array.isArray(scenario.files) ||
      !scenario.files.every((file) => typeof file === "string") ||
      !scenario.expected ||
      typeof scenario.expected !== "object"
    ) {
      throw new Error(`Scénario incomplet à l’index ${index}.`);
    }

    return {
      expected: {
        documents: scenario.expected.documents ?? {},
        fields: scenario.expected.fields ?? {},
      },
      files: scenario.files,
      name: scenario.name,
    };
  });
}

function assertPdfExists(filename: string) {
  const filePath = join(realWorldDir, filename);

  if (!existsSync(filePath)) {
    throw new Error(`PDF introuvable : ${filePath}`);
  }

  return filePath;
}

function assertPdfSignature(buffer: Buffer, filename: string) {
  if (buffer.subarray(0, 5).toString("utf8") !== "%PDF-") {
    throw new Error(`Signature PDF invalide : ${filename}`);
  }
}

function displayValue(value: Json | null, normalizedValue: string | null) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return normalizedValue;
}

async function ensureStorageBucket() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.getBucket(
    SOURCE_DOCUMENTS_BUCKET,
  );

  if (error || !data) {
    throw new Error(
      `Bucket Storage local indisponible : ${SOURCE_DOCUMENTS_BUCKET}`,
    );
  }
}

async function createProject(scenarioName: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      email: `real-world-test+${Date.now()}-${scenarioName}@example.local`,
      property_address: `Dossier test réel ${scenarioName}`,
      status: "processing",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Création projet impossible : ${error.code}`);
  }

  return data.id;
}

async function processPdf(input: {
  filename: string;
  filePath: string;
  projectId: string;
}) {
  const supabase = getSupabaseAdmin();
  const buffer = readFileSync(input.filePath);
  assertPdfSignature(buffer, input.filename);

  const documentId = randomUUID();
  const storagePath = `${input.projectId}/${documentId}/${sanitizePdfFilename(
    basename(input.filename),
  )}`;
  const now = new Date();
  const autoDeleteAfter = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: insertError } = await supabase.from("documents").insert({
    auto_delete_after: autoDeleteAfter,
    filename: input.filename,
    id: documentId,
    mime_type: PDF_MIME_TYPE,
    processing_status: "processing",
    project_id: input.projectId,
    size_bytes: buffer.byteLength,
    storage_path: storagePath,
  });

  if (insertError) {
    throw new Error(`Insertion document impossible : ${insertError.code}`);
  }

  const { error: uploadError } = await supabase.storage
    .from(SOURCE_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: PDF_MIME_TYPE,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload Storage impossible : ${uploadError.message}`);
  }

  const limits = getClassificationLimits();
  const extractedText = await extractTextFromPdfBuffer(
    buffer,
    {
      maxCharacters: limits.maxCharacters,
      maxPages: limits.maxPages,
    },
    {
      documentId,
      storagePath,
    },
  );
  const classificationStartedAt = performance.now();
  const classification = classifyDocument(extractedText.pages, {
    extractedCharacters: extractedText.extractedCharacters,
    minCharacters: limits.minCharacters,
    totalPages: extractedText.totalPages,
    truncated: extractedText.truncated,
  });
  const classificationDetails = {
    ...classification.details,
    classificationDurationMs: Math.max(
      0,
      Math.round(performance.now() - classificationStartedAt),
    ),
  };

  const { error: classificationError } = await supabase
    .from("documents")
    .update({
      classification_confidence: classification.confidence,
      classification_details: classificationDetails,
      classification_status: classification.status,
      classification_version: CLASSIFICATION_VERSION,
      classified_at: new Date().toISOString(),
      document_type: classification.documentType,
      error_message: null,
      processing_status: "processed",
    })
    .eq("id", documentId)
    .eq("project_id", input.projectId);

  if (classificationError) {
    throw new Error(
      `Persistance classification impossible : ${classificationError.code}`,
    );
  }

  const extractionContext = {
    classificationStatus: classification.status,
    documentType: classification.documentType,
    pages: extractedText.pages,
  };
  const candidates = [
    ...extractSimpleFields(extractionContext),
    ...extractFinancialFields(extractionContext),
    ...extractComplexFields(extractionContext),
  ];

  await persistDeterministicExtraction({
    candidates,
    classificationStatus: classification.status,
    documentId,
    documentType: classification.documentType,
    projectId: input.projectId,
  });

  return {
    classification,
    documentId,
    extractedFieldCount: candidates.length,
    storagePath,
  };
}

async function readScenarioState(projectId: string) {
  const supabase = getSupabaseAdmin();
  const [documentsResult, fieldsResult, reportResult] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "filename, document_type, document_type_override, classification_status, classification_confidence",
      )
      .eq("project_id", projectId)
      .order("filename", { ascending: true }),
    supabase
      .from("extracted_fields")
      .select("field_id, value, normalized_value, confidence, status")
      .eq("project_id", projectId)
      .order("field_id", { ascending: true }),
    supabase
      .from("reports")
      .select("completion_rate, confidence_score, status")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (documentsResult.error) {
    throw new Error(
      `Lecture documents impossible : ${documentsResult.error.code}`,
    );
  }

  if (fieldsResult.error) {
    throw new Error(`Lecture champs impossible : ${fieldsResult.error.code}`);
  }

  if (reportResult.error) {
    throw new Error(`Lecture rapport impossible : ${reportResult.error.code}`);
  }

  return {
    documents: documentsResult.data,
    fields: fieldsResult.data,
    report: reportResult.data,
  };
}

function compareScenario(input: {
  projectId: string;
  scenario: Scenario;
  state: Awaited<ReturnType<typeof readScenarioState>>;
}): Omit<ScenarioReport, "errors" | "name" | "ok" | "projectId"> {
  const documents = Object.entries(input.scenario.expected.documents ?? {}).map(
    ([filename, expected]) => {
      const document = input.state.documents.find(
        (item) => item.filename === filename,
      );
      const actual = document ? getEffectiveDocumentType(document) : null;

      return {
        actual,
        confidence: document?.classification_confidence ?? null,
        expected,
        filename,
        ok: actual === expected,
        status: document?.classification_status ?? null,
      };
    },
  );
  const fields = Object.entries(input.scenario.expected.fields ?? {}).map(
    ([fieldId, expected]) => {
      const field = input.state.fields.find(
        (item) => item.field_id === fieldId,
      );
      const actual = field
        ? displayValue(field.value, field.normalized_value)
        : null;
      const normalizedActual = actual ? normalizeComparable(actual) : "";
      const normalizedExpected = normalizeComparable(expected);

      return {
        actual,
        confidence: field?.confidence ?? null,
        expected,
        field_id: fieldId,
        ok:
          normalizedActual === normalizedExpected ||
          normalizedActual.includes(normalizedExpected) ||
          normalizedExpected.includes(normalizedActual),
        status: field?.status ?? null,
      };
    },
  );

  return {
    documents,
    fields,
    missingFields: input.state.fields
      .filter((field) => field.status === "missing")
      .map((field) => ({
        confidence: field.confidence,
        field_id: field.field_id,
        status: field.status,
      })),
    report: input.state.report
      ? {
          completion_rate: input.state.report.completion_rate,
          confidence_score: input.state.report.confidence_score,
          status: input.state.report.status,
        }
      : null,
  };
}

async function runScenario(scenario: Scenario): Promise<ScenarioReport> {
  const errors: string[] = [];
  let projectId: string | null = null;

  try {
    projectId = await createProject(scenario.name);

    for (const filename of scenario.files) {
      await processPdf({
        filename,
        filePath: assertPdfExists(filename),
        projectId,
      });
    }

    await evaluateAndPersistProjectConsistency(projectId);
    const state = await readScenarioState(projectId);
    const comparisons = compareScenario({ projectId, scenario, state });
    const ok =
      comparisons.documents.every((document) => document.ok) &&
      comparisons.fields.every((field) => field.ok) &&
      errors.length === 0;

    return {
      ...comparisons,
      errors,
      name: scenario.name,
      ok,
      projectId,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));

    return {
      documents: [],
      errors,
      fields: [],
      missingFields: [],
      name: scenario.name,
      ok: false,
      projectId,
      report: null,
    };
  }
}

function renderStatus(ok: boolean) {
  return ok ? "OK" : "KO";
}

function renderMarkdown(report: RealWorldReport) {
  const lines = [
    "# Rapport tests dossiers réels",
    "",
    `Généré le : ${report.generatedAt}`,
    "",
    "## Résumé",
    "",
    `- Scénarios : ${report.summary.scenarios}`,
    `- Réussis : ${report.summary.passed}`,
    `- Échoués : ${report.summary.failed}`,
    "",
  ];

  for (const scenario of report.scenarios) {
    lines.push(
      `## ${scenario.name} — ${renderStatus(scenario.ok)}`,
      "",
      `Projet : ${scenario.projectId ?? "—"}`,
      "",
      "### Classifications",
      "",
      "| Fichier | Attendu | Obtenu | Statut | Confiance | Résultat |",
      "| --- | --- | --- | --- | ---: | --- |",
    );

    for (const document of scenario.documents) {
      lines.push(
        `| ${document.filename} | ${document.expected} | ${document.actual ?? "—"} | ${document.status ?? "—"} | ${document.confidence ?? "—"} | ${renderStatus(document.ok)} |`,
      );
    }

    lines.push(
      "",
      "### Champs attendus",
      "",
      "| Champ | Attendu | Obtenu | Statut | Confiance | Résultat |",
      "| --- | --- | --- | --- | ---: | --- |",
    );

    for (const field of scenario.fields) {
      lines.push(
        `| ${field.field_id} | ${field.expected} | ${field.actual ?? "—"} | ${field.status ?? "—"} | ${field.confidence ?? "—"} | ${renderStatus(field.ok)} |`,
      );
    }

    lines.push(
      "",
      "### Rapport",
      "",
      `- completion_rate : ${scenario.report?.completion_rate ?? "—"}`,
      `- confidence_score : ${scenario.report?.confidence_score ?? "—"}`,
      `- status : ${scenario.report?.status ?? "—"}`,
      "",
      "### Champs missing",
      "",
    );

    if (scenario.missingFields.length === 0) {
      lines.push("Aucun champ missing.");
    } else {
      for (const field of scenario.missingFields) {
        lines.push(
          `- ${field.field_id} (${field.status}, confiance ${field.confidence ?? "—"})`,
        );
      }
    }

    if (scenario.errors.length > 0) {
      lines.push("", "### Erreurs", "");

      for (const error of scenario.errors) {
        lines.push(`- ${error}`);
      }
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function writeReports(report: RealWorldReport) {
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownReportPath, renderMarkdown(report));
}

function printReport(report: RealWorldReport) {
  console.log(
    `Tests dossiers réels : ${report.summary.passed}/${report.summary.scenarios} OK`,
  );

  for (const scenario of report.scenarios) {
    console.log(`\n${renderStatus(scenario.ok)} ${scenario.name}`);

    for (const document of scenario.documents) {
      console.log(
        `  classification ${renderStatus(document.ok)} ${document.filename}: attendu=${document.expected} obtenu=${document.actual ?? "—"}`,
      );
    }

    for (const field of scenario.fields) {
      console.log(
        `  champ ${renderStatus(field.ok)} ${field.field_id}: attendu="${field.expected}" obtenu="${field.actual ?? "—"}"`,
      );
    }

    console.log(
      `  score: completion=${scenario.report?.completion_rate ?? "—"} confiance=${scenario.report?.confidence_score ?? "—"} statut=${scenario.report?.status ?? "—"}`,
    );

    if (scenario.missingFields.length > 0) {
      console.log(
        `  missing: ${scenario.missingFields
          .map((field) => field.field_id)
          .join(", ")}`,
      );
    }

    for (const error of scenario.errors) {
      console.log(`  erreur: ${error}`);
    }
  }

  console.log(`\nRapports écrits :`);
  console.log(`- ${jsonReportPath}`);
  console.log(`- ${markdownReportPath}`);
}

async function main() {
  loadLocalEnv();
  assertConfiguration();
  await ensureStorageBucket();

  const scenarios = loadScenarios();
  const scenarioReports: ScenarioReport[] = [];

  for (const scenario of scenarios) {
    scenarioReports.push(await runScenario(scenario));
  }

  const report: RealWorldReport = {
    generatedAt: new Date().toISOString(),
    scenarios: scenarioReports,
    summary: {
      failed: scenarioReports.filter((scenario) => !scenario.ok).length,
      passed: scenarioReports.filter((scenario) => scenario.ok).length,
      scenarios: scenarioReports.length,
    },
  };

  writeReports(report);
  printReport(report);

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
