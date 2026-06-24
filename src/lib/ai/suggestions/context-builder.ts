import "server-only";

import type { TextPage } from "@/lib/classification/types";
import { getProjectOwnerContext } from "@/lib/owner-context/project-owner-context";
import { extractTextFromPdfBuffer } from "@/lib/pdf/extract-text-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";

import { getAiSuggestionConfig } from "./config";
import { AI_SUGGESTION_FIELD_IDS } from "./field-allowlist";
import {
  buildOwnerReferenceFromTitle,
  type OwnerReference,
} from "./owner-reference";

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
  completion_mode: "targeted" | "broad";
  documents: Array<{
    classification_status: string;
    document_type: string;
    filename: string;
    headers: string[];
    id: string;
  }>;
  deterministic_fields: AiContextField[];
  eligible_fields: AiContextField[];
  field_eligibility: AiFieldEligibilityDiagnostic[];
  owner_reference: OwnerReference | null;
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
  seller_name: [/vendeur/i, /acqu[ée]reur/i, /propri[ée]taire/i],
  seller_address: [/adresse\s+(?:du\s+)?(?:vendeur|propri[ée]taire)/i],
  seller_account_number: [
    /num[ée]ro\s+(?:de\s+)?compte/i,
    /compte\s+copropri[ée]taire/i,
    /r[ée]f[ée]rence\s+client/i,
  ],
  property_address: [
    /adresse\s+(?:de\s+la\s+)?copropri[ée]t[ée]/i,
    /d[ée]signation\s+(?:du\s+)?bien/i,
    /immeuble\s+sis/i,
  ],
  property_reference: [/r[ée]f[ée]rence\s+immeuble/i, /cadastre/i],
  lot_number: [/lot/i, /tanti[èe]mes/i, /[ée]tat\s+descriptif\s+de\s+division/i],
  lot_description: [/description\s+(?:du\s+)?lot/i, /d[ée]signation\s+(?:du\s+)?lot/i],
  lot_tantiemes: [/lot/i, /tanti[èe]mes/i, /milli[èe]mes/i],
  syndic_name: [/syndic/i, /cabinet/i, /votre\s+agence/i],
  syndic_manager: [/gestionnaire/i, /principal(?:e)?\s+de\s+copropri[ée]t[ée]/i],
  syndic_address: [/adresse\s+(?:du\s+)?syndic/i, /coordonn[ée]es\s+(?:du\s+)?syndic/i],
  syndic_phone: [/t[ée]l[ée]phone/i, /\b0[1-9](?:[\s.()-]*\d{2}){4}\b/i],
  syndic_email: [/email/i, /courriel/i, /contact/i],
  account_statement_date: [/relev[ée]\s+de\s+compte/i, /arr[êe]t[ée]\s+au/i, /solde\s+au/i],
  current_balance_amount: [
    /solde\s+au/i,
    /solde\s+(?:de\s+votre\s+compte|du\s+compte|actuel)/i,
  ],
  current_balance_label: [/solde\s+au/i, /solde\s+(?:d[ée]biteur|cr[ée]diteur)/i],
  unpaid_charges_amount: [/charges\s+impay[ée]es/i, /arri[ée]r[ée]s/i],
  treasury_advance_amount: [/avance\s+de\s+tr[ée]sorerie/i, /avance\s+permanente/i],
  seller_financial_comment: [/observation/i, /commentaire\s+financier/i],
  current_quarter: [
    /\bT[1-4]\b/i,
    /trimestre/i,
    /p[ée]riode\s+du/i,
    /p[ée]riode\s+de/i,
    /\b0?1[/.]0?1\b/i,
    /\b31[/.]0?3\b/i,
  ],
  annual_budget_amount: [
    /budget\s+pr[ée]visionnel/i,
    /vote\s+du\s+budget/i,
    /exercice/i,
    /montant\s+(?:du\s+)?budget/i,
  ],
  budget_vote_date: [/vote\s+du\s+budget/i, /budget\s+pr[ée]visionnel/i, /assembl[ée]e\s+g[ée]n[ée]rale/i],
  works_fund_quarterly_contribution: [
    /fonds\s+(?:de\s+)?travaux/i,
    /cotisation/i,
    /appel\s+(?:de\s+)?fonds\s+travaux/i,
    /\bALUR\b/i,
  ],
  works_fund_annual_amount: [
    /montant\s+annuel\s+(?:du\s+)?fonds\s+(?:de\s+)?travaux/i,
    /montant\s+global\s+(?:du\s+)?fonds\s+(?:de\s+)?travaux/i,
    /cotisation\s+annuelle/i,
    /fonds\s+(?:de\s+)?travaux/i,
  ],
  works_fund_budget_percentage: [
    /pourcentage/i,
    /fonds\s+(?:de\s+)?travaux/i,
    /\b5\s*%/i,
    /\b100\s*%/i,
    /cotisation\s+obligatoire/i,
  ],
  works_fund_seller_share_amount: [
    /quote[\s-]*part\s+(?:vendeur\s+)?(?:du\s+)?fonds\s+(?:de\s+)?travaux/i,
    /quote[\s-]*part/i,
    /part\s+(?:du\s+)?fonds\s+(?:de\s+)?travaux\s+rattach[ée]e\s+aux\s+lots/i,
  ],
  works_fund_seller_share_date: [
    /fonds\s+(?:de\s+)?travaux/i,
    /quote[\s-]*part/i,
    /au\s+\d{1,2}[/.]\d{1,2}[/.]\d{4}/i,
  ],
  voted_paid_works: [/travaux/i, /appel[ée]s?\s+et\s+pay[ée]s?/i],
  future_works_calls: [/futurs?\s+appels?\s+de\s+fonds/i, /appels?\s+[àa]\s+venir/i],
  voted_not_called_works: [/travaux\s+vot[ée]s?\s+non\s+appel[ée]s?/i, /non\s+encore\s+appel[ée]s?/i],
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
  ppt_status: [/plan\s+pluriannuel\s+de\s+travaux/i, /\bPPT\b/i, /\bPPPT\b/i],
  dtg_status: [/\bDTG\b/i, /diagnostic\s+technique\s+global/i],
  collective_dpe_status: [
    /DPE\s+collectif/i,
    /diagnostic\s+de\s+performance\s+[ée]nerg[ée]tique\s+collectif/i,
  ],
};

const BROAD_KEYWORD_BLOCKS: Array<{
  fields: string[];
  label: string;
  pattern: RegExp;
}> = [
  {
    fields: ["seller_account_number"],
    label: "Numéro client",
    pattern: /num[ée]ro\s+client/i,
  },
  {
    fields: [
      "current_balance_amount",
      "current_balance_label",
      "account_statement_date",
    ],
    label: "Solde au",
    pattern: /solde\s+au/i,
  },
  {
    fields: ["treasury_advance_amount"],
    label: "Avance de trésorerie",
    pattern: /avance\s+de\s+tr[ée]sorerie/i,
  },
  {
    fields: ["current_balance_amount", "current_balance_label"],
    label: "situation de compte",
    pattern: /situation\s+de\s+compte|compte\s+copropri[ée]taire/i,
  },
  {
    fields: ["current_quarter", "account_statement_date"],
    label: "période du",
    pattern: /p[ée]riode\s+du/i,
  },
  {
    fields: ["current_quarter", "account_statement_date"],
    label: "période de",
    pattern: /p[ée]riode\s+de/i,
  },
  {
    fields: ["current_quarter", "account_statement_date"],
    label: "01/01",
    pattern: /\b0?1[/.]0?1\b/i,
  },
  {
    fields: ["current_quarter", "account_statement_date"],
    label: "31/03",
    pattern: /\b31[/.]0?3\b/i,
  },
  {
    fields: ["current_balance_amount", "current_balance_label"],
    label: "provisions appelées",
    pattern: /provisions?\s+appel[ée]es?/i,
  },
  {
    fields: [
      "works_fund_quarterly_contribution",
      "works_fund_annual_amount",
      "works_fund_seller_share_amount",
      "works_fund_seller_share_date",
    ],
    label: "cotisation fonds travaux",
    pattern: /cotisation\s+(?:au\s+)?fonds\s+(?:de\s+)?travaux/i,
  },
  {
    fields: [
      "works_fund_quarterly_contribution",
      "works_fund_annual_amount",
      "works_fund_budget_percentage",
      "works_fund_seller_share_amount",
      "works_fund_seller_share_date",
    ],
    label: "fonds travaux ALUR",
    pattern: /fonds\s+(?:de\s+)?travaux\s+ALUR|ALUR/i,
  },
  {
    fields: [
      "current_balance_amount",
      "works_fund_quarterly_contribution",
      "works_fund_seller_share_amount",
    ],
    label: "total",
    pattern: /\btotal\b/i,
  },
  {
    fields: ["lot_number", "lot_description", "lot_tantiemes"],
    label: "lot n°",
    pattern: /lot\s*n[°o]/i,
  },
  {
    fields: ["seller_name", "seller_address", "property_address"],
    label: "propriétaire vendeur",
    pattern: /propri[ée]taire|vendeur|copropri[ée]taire/i,
  },
  {
    fields: ["lot_tantiemes"],
    label: "tantièmes",
    pattern: /tanti[èe]mes/i,
  },
  {
    fields: ["legal_proceedings_description"],
    label: "compte rendu du syndic",
    pattern: /compte\s+rendu\s+du\s+syndic/i,
  },
  {
    fields: ["legal_proceedings_description"],
    label: "procédure",
    pattern: /proc[ée]dure/i,
  },
  {
    fields: ["legal_proceedings_description"],
    label: "contentieux",
    pattern: /contentieux/i,
  },
  {
    fields: ["legal_proceedings_description"],
    label: "à l’encontre de",
    pattern: /[àa]\s+l['’]encontre\s+de/i,
  },
  {
    fields: ["annual_budget_amount", "budget_vote_date"],
    label: "budget prévisionnel",
    pattern: /budget\s+pr[ée]visionnel|vote\s+du\s+budget/i,
  },
  {
    fields: ["voted_paid_works", "future_works_calls", "voted_not_called_works"],
    label: "travaux",
    pattern: /travaux|appel[s]?\s+de\s+fonds\s+travaux/i,
  },
  {
    fields: ["collective_loan"],
    label: "emprunt collectif",
    pattern: /emprunt\s+collectif|pr[êe]t\s+collectif/i,
  },
  {
    fields: ["ppt_status"],
    label: "PPT",
    pattern: /plan\s+pluriannuel\s+de\s+travaux|\bPPT\b|\bPPPT\b/i,
  },
  {
    fields: ["dtg_status"],
    label: "DTG",
    pattern: /diagnostic\s+technique\s+global|\bDTG\b/i,
  },
  {
    fields: ["collective_dpe_status"],
    label: "DPE collectif",
    pattern: /DPE\s+collectif|performance\s+[ée]nerg[ée]tique\s+collectif/i,
  },
];

const TITLE_PROPERTY_PATTERNS = [
  /propri[ée]taire|acqu[ée]reur|vendeur/i,
  /lot|tanti[èe]mes|milli[èe]mes/i,
  /immeuble\s+sis|bien\s+sis|d[ée]signation\s+(?:du\s+)?bien/i,
];

const PV_BUSINESS_PAGE_PATTERNS = [
  /compte\s+rendu\s+du\s+syndic/i,
  /proc[ée]dure/i,
  /contentieux/i,
  /[àa]\s+l['’]encontre\s+de/i,
  /budget\s+pr[ée]visionnel|vote\s+du\s+budget/i,
  /travaux/i,
  /emprunt\s+collectif|pr[êe]t\s+collectif/i,
  /plan\s+pluriannuel\s+de\s+travaux|\bPPT\b|\bPPPT\b/i,
  /diagnostic\s+technique\s+global|\bDTG\b/i,
  /DPE\s+collectif|performance\s+[ée]nerg[ée]tique\s+collectif/i,
];

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

function headerExcerpt(page: TextPage | undefined, limit = 1600) {
  if (!page) return null;
  const compact = page.text.replace(/\s+/g, " ").trim();
  return compact ? compact.slice(0, limit) : null;
}

function broadPageExcerpts(input: {
  document: Pick<AiContextDocument, "document_type" | "filename">;
  eligibleFields: AiContextField[];
  maxChars: number;
  pages: TextPage[];
}) {
  const excerpts: TargetedExcerpt[] = [];
  let usedChars = 0;
  const eligibleFieldIds = new Set(input.eligibleFields.map((field) => field.field_id));

  function pushExcerpt(inputExcerpt: TargetedExcerpt) {
    if (usedChars >= input.maxChars) return false;
    const compact = inputExcerpt.source_excerpt?.replace(/\s+/g, " ").trim();
    if (!compact) return true;
    const remaining = input.maxChars - usedChars;
    const limited = compact.slice(0, Math.min(compact.length, remaining));
    if (!limited) return false;

    excerpts.push({
      ...inputExcerpt,
      source_excerpt: limited,
    });
    usedChars += limited.length;
    return usedChars < input.maxChars;
  }

  if (input.document.document_type === "appel_de_fonds") {
    for (const page of input.pages.slice(0, 3)) {
      const compact = page.text.replace(/\s+/g, " ").trim();
      if (!compact) continue;
      if (
        !pushExcerpt({
          document_filename: input.document.filename,
          field_id: "__broad_context",
          matched_rule: "ai.context.broad_appel_de_fonds_pages_1_3",
          source_excerpt: compact,
          source_page: page.pageNumber,
        })
      ) {
        return excerpts;
      }
    }
  }

  if (input.document.document_type === "titre_propriete") {
    for (const page of input.pages) {
      const compact = page.text.replace(/\s+/g, " ").trim();
      if (!compact) continue;
      if (!TITLE_PROPERTY_PATTERNS.some((pattern) => pattern.test(page.text))) {
        continue;
      }

      if (
        !pushExcerpt({
          document_filename: input.document.filename,
          field_id: "__owner_reference",
          matched_rule: "ai.context.broad_titre_propriete_owner_reference",
          source_excerpt: compact,
          source_page: page.pageNumber,
        })
      ) {
        return excerpts;
      }
    }
  }

  if (input.document.document_type === "pv_ag") {
    for (const page of input.pages) {
      const compact = page.text.replace(/\s+/g, " ").trim();
      if (!compact) continue;
      if (!PV_BUSINESS_PAGE_PATTERNS.some((pattern) => pattern.test(page.text))) {
        continue;
      }

      if (
        !pushExcerpt({
          document_filename: input.document.filename,
          field_id: "__pv_business_context",
          matched_rule: "ai.context.broad_pv_business_page",
          source_excerpt: compact,
          source_page: page.pageNumber,
        })
      ) {
        return excerpts;
      }
    }
  }

  for (const page of input.pages) {
    if (usedChars >= input.maxChars) break;
    const compact = page.text.replace(/\s+/g, " ").trim();
    if (!compact) continue;

    for (const block of BROAD_KEYWORD_BLOCKS) {
      if (usedChars >= input.maxChars) break;
      if (!block.fields.some((fieldId) => eligibleFieldIds.has(fieldId))) {
        continue;
      }

      const match = block.pattern.exec(page.text);
      block.pattern.lastIndex = 0;
      if (match?.index === undefined) continue;

      const excerpt = compactExcerpt(
        page.text,
        match.index,
        match.index + match[0].length,
      );
      const fieldId =
        block.fields.find((field) => eligibleFieldIds.has(field)) ??
        "__broad_context";

      if (
        !pushExcerpt({
          document_filename: input.document.filename,
          field_id: fieldId,
          matched_rule: `ai.context.broad_keyword.${block.label}`,
          source_excerpt: excerpt,
          source_page: page.pageNumber,
        })
      ) {
        return excerpts;
      }
    }
  }

  return excerpts;
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
  const documentHeaders = new Map<string, string[]>();
  let ownerReference: OwnerReference | null = null;
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
      const headers =
        config.completionMode === "broad"
          ? extracted.pages
              .slice(0, document.document_type === "appel_de_fonds" ? 3 : 2)
              .map((page) => headerExcerpt(page, 2200))
              .filter((header): header is string => Boolean(header))
          : [headerExcerpt(extracted.pages[0])].filter(
              (header): header is string => Boolean(header),
            );
      if (headers.length > 0) {
        documentHeaders.set(document.id, headers);
      }

      if (document.document_type === "titre_propriete" && !ownerReference) {
        ownerReference = buildOwnerReferenceFromTitle({
          document,
          pages: extracted.pages,
        });
      }

      const selected = selectTargetedAiExcerpts({
        document,
        eligibleFields,
        maxChars: Math.min(config.maxCharsPerDocument, remainingTargetedChars),
        ownerContext,
        pages: extracted.pages,
      });

      targetedExcerpts.push(...selected.excerpts);
      if (config.completionMode === "broad") {
        const broadExcerpts = broadPageExcerpts({
          document,
          eligibleFields,
          maxChars: Math.min(config.maxCharsPerDocument, remainingTargetedChars),
          pages: extracted.pages,
        });
        targetedExcerpts.push(...broadExcerpts);
        remainingTargetedChars -= broadExcerpts.reduce(
          (sum, excerpt) => sum + (excerpt.source_excerpt?.length ?? 0),
          0,
        );
      }
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
    completionMode: config.completionMode,
    documents: targetedDiagnostics,
    promptVersion: "ai-suggestions-v2",
    totalCharsIncluded: targetedDiagnostics.reduce(
      (sum, item) => sum + item.charsIncluded,
      0,
    ),
  });

  return {
    completion_mode: config.completionMode,
    documents: documents.map((document) => ({
      classification_status: document.classification_status,
      document_type: document.document_type,
      filename: document.filename,
      headers: documentHeaders.get(document.id) ?? [],
      id: document.id,
    })),
    deterministic_fields: candidateFields,
    eligible_fields: eligibleFields,
    field_eligibility: fieldEligibilityDiagnostics,
    owner_reference: ownerReference,
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
