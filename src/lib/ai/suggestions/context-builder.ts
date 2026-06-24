import "server-only";

import type { TextPage } from "@/lib/classification/types";
import { getProjectOwnerContext } from "@/lib/owner-context/project-owner-context";
import { extractTextFromPdfBuffer } from "@/lib/pdf/extract-text-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";

import { getAiSuggestionConfig } from "./config";
import { AI_SUGGESTION_FIELD_IDS } from "./field-allowlist";

type AiContextField = {
  confidence: number | null;
  field_id: string;
  field_origin: string;
  manually_edited: boolean;
  status: string;
  value: unknown;
};

export type AiFieldEligibilityDiagnostic = {
  confidence: number | null;
  eligible: boolean;
  field_id: string;
  field_origin: string;
  manually_edited: boolean;
  reason: string;
  status: string;
};

export type AiSuggestionContext = {
  documents: Array<{
    classification_status: string;
    document_type: string;
    filename: string;
    id: string;
  }>;
  eligible_fields: AiContextField[];
  field_eligibility: AiFieldEligibilityDiagnostic[];
  owner_context: Awaited<ReturnType<typeof getProjectOwnerContext>>;
  project_id: string;
  source_excerpts: Array<{
    document_filename: string | null;
    field_id: string;
    matched_rule: string | null;
    source_excerpt: string | null;
    source_page: number | null;
  }>;
};

type AiContextDocument = {
  classification_status: string;
  document_type: string;
  filename: string;
  id: string;
  storage_path: string | null;
};

type TargetedExcerpt = AiSuggestionContext["source_excerpts"][number];

type TargetedExcerptDiagnostic = {
  charsIncluded: number;
  documentType: string;
  fieldsTargeted: string[];
  filename: string;
  matchedKeywords: string[];
  pagesIncluded: number[];
};

const FIELD_KEYWORDS: Record<string, RegExp[]> = {
  annual_budget_amount: [
    /budget\s+pr[ée]visionnel/i,
    /vote\s+du\s+budget/i,
    /exercice/i,
    /montant\s+(?:du\s+)?budget/i,
  ],
  works_fund_quarterly_contribution: [
    /fonds\s+(?:de\s+)?travaux/i,
    /cotisation/i,
    /appel\s+(?:de\s+)?fonds\s+travaux/i,
    /\bALUR\b/i,
  ],
  works_fund_budget_percentage: [
    /pourcentage/i,
    /fonds\s+(?:de\s+)?travaux/i,
    /\b5\s*%/i,
    /\b100\s*%/i,
    /cotisation\s+obligatoire/i,
  ],
  legal_proceedings_description: [
    /proc[ée]dure/i,
    /contentieux/i,
    /assignation/i,
    /recouvrement/i,
  ],
  collective_loan: [
    /emprunt\s+collectif/i,
    /pr[êe]t\s+collectif/i,
    /aucun\s+emprunt/i,
  ],
  dtg_status: [/\bDTG\b/i, /diagnostic\s+technique\s+global/i],
  collective_dpe_status: [
    /DPE\s+collectif/i,
    /diagnostic\s+de\s+performance\s+[ée]nerg[ée]tique\s+collectif/i,
  ],
  lot_number: [/lot/i, /tanti[èe]mes/i],
  lot_tantiemes: [/lot/i, /tanti[èe]mes/i],
};

function devLog(label: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.error(label, payload);
}

function fieldEligibility(field: AiContextField): AiFieldEligibilityDiagnostic {
  if (field.status === "confirmed") {
    return { ...field, eligible: false, reason: "confirmed" };
  }

  if (field.manually_edited) {
    return { ...field, eligible: false, reason: "manually_edited" };
  }

  if (field.field_origin === "manual") {
    return { ...field, eligible: false, reason: "field_origin_manual" };
  }

  if (field.field_origin === "validated") {
    return { ...field, eligible: false, reason: "field_origin_validated" };
  }

  if (["missing", "uncertain", "inconsistent"].includes(field.status)) {
    return { ...field, eligible: true, reason: "eligible" };
  }

  return { ...field, eligible: false, reason: "status_not_targeted" };
}

function compactExcerpt(text: string, start: number, end: number) {
  const radius = 450;
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  const compact = text.slice(from, to).replace(/\s+/g, " ").trim();

  return compact.length <= 900 ? compact : `${compact.slice(0, 899)}…`;
}

function keywordLabel(pattern: RegExp) {
  return pattern.source
    .replace(/\\s\+/g, " ")
    .replace(/\\b/g, "")
    .replace(/\(\?:/g, "(")
    .slice(0, 80);
}

function ownerKeywords(ownerContext: Awaited<ReturnType<typeof getProjectOwnerContext>>) {
  const keywords: RegExp[] = [];

  if (ownerContext?.known_lot_number) {
    keywords.push(
      new RegExp(`(?:lot|n[°o])\\s*${ownerContext.known_lot_number}`, "i"),
    );
  }

  if (ownerContext?.owner_name) {
    for (const token of ownerContext.owner_name
      .split(/\s+/)
      .map((token) => token.replace(/[^A-Za-zÀ-ÿ0-9]/g, ""))
      .filter((token) => token.length >= 3)
      .slice(0, 4)) {
      keywords.push(new RegExp(token, "i"));
    }
  }

  return keywords;
}

export function selectTargetedAiExcerpts(input: {
  document: Pick<AiContextDocument, "document_type" | "filename" | "id">;
  eligibleFields: AiContextField[];
  maxChars: number;
  ownerContext: Awaited<ReturnType<typeof getProjectOwnerContext>>;
  pages: TextPage[];
}) {
  const excerpts: TargetedExcerpt[] = [];
  const matchedKeywords = new Set<string>();
  const pagesIncluded = new Set<number>();
  const fieldsTargeted = new Set<string>();
  let usedChars = 0;

  for (const field of input.eligibleFields) {
    const baseKeywords = FIELD_KEYWORDS[field.field_id] ?? [];
    const keywords =
      field.field_id === "lot_number" || field.field_id === "lot_tantiemes"
        ? [...ownerKeywords(input.ownerContext), ...baseKeywords]
        : baseKeywords;

    if (keywords.length === 0) continue;

    for (const page of input.pages) {
      if (usedChars >= input.maxChars) break;

      const matches = keywords
        .map((pattern) => {
          const match = pattern.exec(page.text);
          pattern.lastIndex = 0;
          return match?.index === undefined ? null : { match, pattern };
        })
        .filter((match): match is NonNullable<typeof match> => Boolean(match));

      if (matches.length === 0) continue;

      const first = matches[0];
      const excerpt = compactExcerpt(
        page.text,
        first.match.index,
        first.match.index + first.match[0].length,
      );
      const remaining = input.maxChars - usedChars;
      const limitedExcerpt = excerpt.slice(0, Math.max(0, remaining));

      if (!limitedExcerpt) break;

      excerpts.push({
        document_filename: input.document.filename,
        field_id: field.field_id,
        matched_rule: "ai.context.keyword_excerpt",
        source_excerpt: limitedExcerpt,
        source_page: page.pageNumber,
      });
      usedChars += limitedExcerpt.length;
      pagesIncluded.add(page.pageNumber);
      fieldsTargeted.add(field.field_id);
      for (const match of matches) {
        matchedKeywords.add(keywordLabel(match.pattern));
      }
      break;
    }
  }

  return {
    diagnostic: {
      charsIncluded: usedChars,
      documentType: input.document.document_type,
      fieldsTargeted: [...fieldsTargeted],
      filename: input.document.filename,
      matchedKeywords: [...matchedKeywords],
      pagesIncluded: [...pagesIncluded],
    } satisfies TargetedExcerptDiagnostic,
    excerpts,
  };
}

export async function buildAiSuggestionContext(projectId: string) {
  const supabase = getSupabaseAdmin();
  const config = getAiSuggestionConfig();
  const [ownerContext, documentsResult, fieldsResult] = await Promise.all([
    getProjectOwnerContext(projectId),
    supabase
      .from("documents")
      .select(
        "id, filename, document_type, document_type_override, classification_status, storage_path",
      )
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .limit(config.maxDocuments),
    supabase
      .from("extracted_fields")
      .select(
        "id, field_id, value, confidence, status, manually_edited, field_origin",
      )
      .eq("project_id", projectId)
      .in("field_id", [...AI_SUGGESTION_FIELD_IDS]),
  ]);

  if (documentsResult.error) {
    throw new Error(`ai_context_documents:${documentsResult.error.code}`);
  }

  if (fieldsResult.error) {
    throw new Error(`ai_context_fields:${fieldsResult.error.code}`);
  }

  const documentsById = new Map(
    documentsResult.data.map((document) => [document.id, document]),
  );
  const fieldsByInternalId = new Map(
    fieldsResult.data.map((field) => [field.id, field]),
  );
  const fieldInternalIds = fieldsResult.data.map((field) => field.id);
  const sourcesResult =
    fieldInternalIds.length > 0
      ? await supabase
          .from("extracted_field_sources")
          .select(
            "extracted_field_id, document_id, matched_rule, source_excerpt, source_page",
          )
          .in("extracted_field_id", fieldInternalIds)
          .limit(120)
      : { data: [], error: null };

  if (sourcesResult.error) {
    throw new Error(`ai_context_sources:${sourcesResult.error.code}`);
  }

  const existingFieldsById = new Map(
    fieldsResult.data.map((field) => [field.field_id, field]),
  );
  const candidateFields = AI_SUGGESTION_FIELD_IDS.map((fieldId) => {
    const field = existingFieldsById.get(fieldId);

    return {
      confidence: field?.confidence ?? 0,
      field_id: fieldId,
      field_origin: field?.field_origin ?? "automatic",
      manually_edited: field?.manually_edited ?? false,
      status: field?.status ?? "missing",
      value: field?.value ?? null,
    };
  });
  const fieldEligibilityDiagnostics = candidateFields.map(fieldEligibility);
  const eligibleFields = candidateFields.filter(
    (field) =>
      fieldEligibilityDiagnostics.find(
        (diagnostic) => diagnostic.field_id === field.field_id,
      )?.eligible,
  );
  const documents = documentsResult.data.map((document) => ({
    classification_status: document.classification_status,
    document_type: document.document_type_override ?? document.document_type,
    filename: document.filename,
    id: document.id,
    storage_path: document.storage_path,
  }));
  const targetedExcerpts: TargetedExcerpt[] = [];
  const targetedDiagnostics: TargetedExcerptDiagnostic[] = [];
  let remainingTargetedChars = config.maxTotalChars;

  for (const document of documents) {
    if (!document.storage_path || remainingTargetedChars <= 0) {
      targetedDiagnostics.push({
        charsIncluded: 0,
        documentType: document.document_type,
        fieldsTargeted: [],
        filename: document.filename,
        matchedKeywords: [],
        pagesIncluded: [],
      });
      continue;
    }

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from(SOURCE_DOCUMENTS_BUCKET)
      .download(document.storage_path);

    if (downloadError || !pdfBlob) {
      targetedDiagnostics.push({
        charsIncluded: 0,
        documentType: document.document_type,
        fieldsTargeted: [],
        filename: document.filename,
        matchedKeywords: ["storage_download_failed"],
        pagesIncluded: [],
      });
      continue;
    }

    try {
      const extracted = await extractTextFromPdfBuffer(
        Buffer.from(await pdfBlob.arrayBuffer()),
        {
          maxCharacters: Math.min(
            config.maxCharsPerDocument,
            remainingTargetedChars,
          ),
          maxPages: config.maxPagesPerDocument,
        },
        {
          documentId: document.id,
          storagePath: document.storage_path,
        },
      );
      const selected = selectTargetedAiExcerpts({
        document,
        eligibleFields,
        maxChars: Math.min(config.maxCharsPerDocument, remainingTargetedChars),
        ownerContext,
        pages: extracted.pages,
      });

      targetedExcerpts.push(...selected.excerpts);
      targetedDiagnostics.push(selected.diagnostic);
      remainingTargetedChars -= selected.diagnostic.charsIncluded;
    } catch {
      targetedDiagnostics.push({
        charsIncluded: 0,
        documentType: document.document_type,
        fieldsTargeted: [],
        filename: document.filename,
        matchedKeywords: ["pdf_text_extraction_failed"],
        pagesIncluded: [],
      });
    }
  }

  devLog("ai_context_targeted_excerpts", {
    documents: targetedDiagnostics,
    totalCharsIncluded: targetedDiagnostics.reduce(
      (sum, item) => sum + item.charsIncluded,
      0,
    ),
  });

  return {
    documents: documents.map((document) => ({
      classification_status: document.classification_status,
      document_type: document.document_type,
      filename: document.filename,
      id: document.id,
    })),
    eligible_fields: eligibleFields,
    field_eligibility: fieldEligibilityDiagnostics,
    owner_context: ownerContext,
    project_id: projectId,
    source_excerpts: [
      ...sourcesResult.data
        .map((source) => {
          const field = fieldsByInternalId.get(source.extracted_field_id);
          const document = documentsById.get(source.document_id);

          if (!field || !source.source_excerpt) {
            return null;
          }

          return {
            document_filename: document?.filename ?? null,
            field_id: field.field_id,
            matched_rule: source.matched_rule,
            source_excerpt: source.source_excerpt.slice(0, 200),
            source_page: source.source_page,
          };
        })
        .filter((source): source is NonNullable<typeof source> =>
          Boolean(source),
        ),
      ...targetedExcerpts,
    ],
  } satisfies AiSuggestionContext;
}
