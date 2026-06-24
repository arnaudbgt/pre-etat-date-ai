import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AI_SUGGESTION_FIELD_IDS } from "../../src/lib/ai/suggestions/field-allowlist";
import { getAiSuggestionConfig } from "../../src/lib/ai/suggestions/config";
import { applyFieldAiGuardrails } from "../../src/lib/ai/suggestions/field-ai-guardrails";
import { mergeAiFieldSuggestions } from "../../src/lib/ai/suggestions/merge-suggestions";
import { buildOwnerReferenceFromTitle } from "../../src/lib/ai/suggestions/owner-reference";
import { selectAiPromptGroups } from "../../src/lib/ai/suggestions/prompt-groups";
import { selectTargetedAiExcerpts } from "../../src/lib/ai/suggestions/context-builder";
import {
  AI_SUGGESTIONS_JSON_SCHEMA,
  type AiFieldSuggestion,
  normalizeAiSuggestionsResponse,
} from "../../src/lib/ai/suggestions/schema";
import { AI_SUGGESTIONS_SYSTEM_PROMPT } from "../../src/lib/ai/suggestions/service";

function walkSchemaObjects(schema: unknown): unknown[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const record = schema as Record<string, unknown>;
  const children = [
    ...Object.values(
      record.properties && typeof record.properties === "object"
        ? (record.properties as Record<string, unknown>)
        : {},
    ).flatMap(walkSchemaObjects),
    ...walkSchemaObjects(record.items),
  ];

  return [schema, ...children];
}

function suggestion(
  partial: Partial<AiFieldSuggestion> & Pick<AiFieldSuggestion, "field_id" | "value">,
): AiFieldSuggestion {
  return {
    confidence: 92,
    normalized_value: typeof partial.value === "string" ? partial.value : null,
    reasoning: "Valeur explicitement présente.",
    should_apply: true,
    source_document: "Appel.pdf",
    source_excerpt: "Solde au 01/03/2025 : 120,00 € débiteur",
    source_page: 1,
    status: "proposed",
    ...partial,
  };
}

describe("AI field suggestions", () => {
  it("is disabled by default and tolerates a missing OpenAI key", () => {
    const previousEnabled = process.env.AI_COMPLETION_ENABLED;
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.AI_COMPLETION_ENABLED;
    delete process.env.OPENAI_API_KEY;

    expect(getAiSuggestionConfig()).toMatchObject({
      enabled: false,
      model: "gpt-4.1-mini",
      openAiApiKey: "",
    });

    process.env.AI_COMPLETION_ENABLED = previousEnabled;
    process.env.OPENAI_API_KEY = previousKey;
  });

  it("reads targeted or broad completion mode from the environment", () => {
    const previousMode = process.env.AI_COMPLETION_MODE;

    process.env.AI_COMPLETION_MODE = "broad";
    expect(getAiSuggestionConfig().completionMode).toBe("broad");

    process.env.AI_COMPLETION_MODE = "targeted";
    expect(getAiSuggestionConfig().completionMode).toBe("targeted");

    process.env.AI_COMPLETION_MODE = "unexpected";
    expect(getAiSuggestionConfig().completionMode).toBe("targeted");

    process.env.AI_COMPLETION_MODE = previousMode;
  });

  it("restricts Sprint 8 to the validated allowlist", () => {
    expect(AI_SUGGESTION_FIELD_IDS).toEqual([
      "seller_name",
      "seller_address",
      "seller_account_number",
      "property_address",
      "property_reference",
      "lot_number",
      "lot_description",
      "lot_tantiemes",
      "syndic_name",
      "syndic_manager",
      "syndic_address",
      "syndic_phone",
      "syndic_email",
      "account_statement_date",
      "current_balance_amount",
      "current_balance_label",
      "unpaid_charges_amount",
      "treasury_advance_amount",
      "seller_financial_comment",
      "current_quarter",
      "annual_budget_amount",
      "budget_vote_date",
      "works_fund_quarterly_contribution",
      "works_fund_annual_amount",
      "works_fund_budget_percentage",
      "works_fund_seller_share_amount",
      "works_fund_seller_share_date",
      "voted_paid_works",
      "future_works_calls",
      "voted_not_called_works",
      "legal_proceedings_description",
      "collective_loan",
      "ppt_status",
      "dtg_status",
      "collective_dpe_status",
    ]);
  });

  it("normalizes valid suggestions and refuses low-confidence auto-apply", () => {
    const suggestions = normalizeAiSuggestionsResponse(
      {
        suggestions: [
          {
            confidence: 84,
            field_id: "annual_budget_amount",
            normalized_value: "145000.00",
            reasoning: "Montant explicitement associé au budget.",
            should_apply: true,
            source_document: "PV.pdf",
            source_excerpt: "Budget prévisionnel 145 000,00 €",
            source_page: 12,
            value: 145000,
          },
          {
            confidence: 92,
            field_id: "not_allowed",
            normalized_value: null,
            reasoning: "hors périmètre",
            should_apply: true,
            source_document: "PV.pdf",
            source_excerpt: "x",
            source_page: 1,
            value: "x",
          },
        ],
      },
      85,
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      confidence: 84,
      field_id: "annual_budget_amount",
      should_apply: false,
    });
  });

  it("downgrades inferred or calculated suggestions for explicit-value fields", () => {
    const suggestions = normalizeAiSuggestionsResponse(
      {
        suggestions: [
          {
            confidence: 90,
            field_id: "works_fund_budget_percentage",
            normalized_value: "0.0051",
            reasoning: "Pourcentage implicite calculé à partir du montant.",
            should_apply: true,
            source_document: "PV.pdf",
            source_excerpt: "Montant fonds travaux et budget prévisionnel",
            source_page: 13,
            value: 0.0051,
          },
        ],
      },
      85,
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      field_id: "works_fund_budget_percentage",
      should_apply: false,
      value: 0.0051,
    });
    expect(suggestions[0].confidence).toBeLessThanOrEqual(60);
  });

  it("downgrades the exact real calculated works fund percentage case before display or persistence", () => {
    const suggestions = normalizeAiSuggestionsResponse(
      {
        suggestions: [
          {
            confidence: 90,
            field_id: "works_fund_budget_percentage",
            normalized_value: "0.0051",
            reasoning: "Pourcentage implicite calculé",
            should_apply: true,
            source_document: "Appel de fonds.pdf",
            source_excerpt: "Pourcentage implicite calculé depuis les montants du tableau",
            source_page: 1,
            status: "proposed",
            value: 0.0051,
          },
        ],
      },
      85,
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      confidence: 60,
      field_id: "works_fund_budget_percentage",
      should_apply: false,
      value: 0.0051,
    });
  });

  it("keeps the OpenAI JSON schema strict without open object values", () => {
    const schemas = walkSchemaObjects(AI_SUGGESTIONS_JSON_SCHEMA);

    for (const schema of schemas) {
      const record = schema as Record<string, unknown>;
      const type = record.type;
      const includesObject = Array.isArray(type)
        ? type.includes("object")
        : type === "object";

      if (includesObject) {
        expect(record.additionalProperties).toBe(false);
      }
    }

    const valueSchema = (
      AI_SUGGESTIONS_JSON_SCHEMA.properties.suggestions.items.properties
        .value as { type: unknown }
    ).type;
    expect(valueSchema).not.toContain("object");
  });

  it("declares a separated suggestions table and never extracted_fields writes", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260623140000_ai_field_suggestions.sql",
      ),
      "utf8",
    );
    const persistence = readFileSync(
      join(process.cwd(), "src/lib/ai/suggestions/persistence.ts"),
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.ai_field_suggestions");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("source_excerpt) <= 200");
    expect(persistence).toContain('.from("ai_field_suggestions")');
    expect(persistence).not.toContain('.from("extracted_fields")');
    expect(persistence).not.toContain('.from("project_owner_context")');
  });

  it("protects confirmed, manual and validated fields in the AI context", () => {
    const contextBuilder = readFileSync(
      join(process.cwd(), "src/lib/ai/suggestions/context-builder.ts"),
      "utf8",
    );

    expect(contextBuilder).toContain('field.status === "confirmed"');
    expect(contextBuilder).toContain("field.manually_edited");
    expect(contextBuilder).toContain('field.field_origin === "manual"');
    expect(contextBuilder).toContain('field.field_origin === "validated"');
    expect(contextBuilder).toContain('"missing", "uncertain", "inconsistent"');
    expect(contextBuilder).toContain("field_eligibility");
    expect(contextBuilder).toContain('reason: "eligible"');
    expect(contextBuilder).toContain("owner_context");
    expect(contextBuilder).toContain("selectTargetedAiExcerpts");
    expect(contextBuilder).not.toContain('.from("ai_field_suggestions").insert');
  });

  it("logs per-field eligibility and reuses the same reasons after OpenAI", () => {
    const service = readFileSync(
      join(process.cwd(), "src/lib/ai/suggestions/service.ts"),
      "utf8",
    );

    expect(service).toContain("fieldEligibility");
    expect(service).toContain("completionMode");
    expect(service).toContain("promptVersion");
    expect(service).toContain("allowlistSize");
    expect(service).toContain("estimatedInputTokens");
    expect(service).toContain("estimatedCost");
    expect(service).toContain("groupsRun");
    expect(service).toContain("requestedFields");
    expect(service).toContain("eligibilityReasonByFieldId");
    expect(service).not.toContain("protected_or_not_eligible");
  });

  it("keeps the v2 prompt explicit about broad benchmark fields", () => {
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("Numéro client");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("Solde au");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("account_statement_date");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("current_balance_amount");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("période d’appel");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("works_fund_annual_amount");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("works_fund_seller_share_amount");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("compte rendu du syndic");
    expect(AI_SUGGESTIONS_SYSTEM_PROMPT).toContain("à l’encontre de");
  });

  it("declares broad mode blocks for appels de fonds and legal procedure sections", () => {
    const contextBuilder = readFileSync(
      join(process.cwd(), "src/lib/ai/suggestions/context-builder.ts"),
      "utf8",
    );

    expect(contextBuilder).toContain("BROAD_KEYWORD_BLOCKS");
    expect(contextBuilder).toContain("broad_appel_de_fonds_pages_1_3");
    expect(contextBuilder).toContain("broad_titre_propriete_owner_reference");
    expect(contextBuilder).toContain("source_excerpt: compact");
    expect(contextBuilder).toContain("broad_pv_business_page");
    expect(contextBuilder).toContain("Numéro client");
    expect(contextBuilder).toContain("Solde au");
    expect(contextBuilder).toContain("01/01");
    expect(contextBuilder).toContain("31/03");
    expect(contextBuilder).toContain("cotisation fonds travaux");
    expect(contextBuilder).toContain("fonds travaux ALUR");
    expect(contextBuilder).toContain("compte rendu du syndic");
    expect(contextBuilder).toContain("à l’encontre de");
  });

  it("builds an owner_reference from a titre_propriete text layer", () => {
    const ownerReference = buildOwnerReferenceFromTitle({
      document: { filename: "Titre de propriété.pdf", id: "doc-title" },
      pages: [
        {
          pageNumber: 3,
          text: `ACQUÉREUR : SCI LES MIMOSAS
Bien sis 10 rue des Lilas 54000 NANCY
Lot n°417 : appartement
Lot n°17 : garage
42100/10250000 tantièmes
4900/10250000 tantièmes`,
        },
      ],
    });

    expect(ownerReference).toMatchObject({
      confidence: 97,
      owner_name: "SCI LES MIMOSAS",
      owner_type: "personne_morale",
      property_address: "10 rue des Lilas 54000 NANCY",
      source_document_filename: "Titre de propriété.pdf",
    });
    expect(ownerReference?.lot_numbers).toEqual(["417", "17"]);
    expect(ownerReference?.lot_tantiemes).toEqual([
      "42100/10250000",
      "4900/10250000",
    ]);
  });

  it("selects specialized prompt groups for eligible fields", () => {
    expect(
      selectAiPromptGroups([
        "seller_name",
        "current_balance_amount",
        "legal_proceedings_description",
      ]).map((group) => group.id),
    ).toEqual([
      "identity_owner_lots",
      "financial_position",
      "works_legal_diagnostics",
    ]);
  });

  it("rejects financial and period false positives with field guardrails", () => {
    expect(
      applyFieldAiGuardrails(
        suggestion({
          field_id: "current_balance_amount",
          source_excerpt: "Provisions appelées pour travaux 10,32 €",
          value: 10.32,
        }),
      ),
    ).toMatchObject({
      reason: "current_balance_without_balance_context",
      suggestion: { confidence: 60, should_apply: false, status: "rejected" },
    });

    expect(
      applyFieldAiGuardrails(
        suggestion({
          field_id: "current_quarter",
          source_excerpt: "Date du document : 01/03/2025",
          value: "01/03/2025",
        }),
      ),
    ).toMatchObject({
      reason: "current_quarter_requires_full_period",
      suggestion: { confidence: 60, should_apply: false, status: "rejected" },
    });
  });

  it("deduplicates AI suggestions and keeps complementary lot values", () => {
    const merged = mergeAiFieldSuggestions({
      documents: [
        { document_type: "titre_propriete", filename: "Titre.pdf" },
        { document_type: "appel_de_fonds", filename: "Appel.pdf" },
      ],
      suggestions: [
        suggestion({
          field_id: "lot_number",
          source_document: "Titre.pdf",
          value: "417",
        }),
        suggestion({
          confidence: 90,
          field_id: "lot_number",
          source_document: "Titre.pdf",
          value: "17",
        }),
        suggestion({
          confidence: 70,
          field_id: "lot_number",
          source_document: "Appel.pdf",
          value: "417",
        }),
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      field_id: "lot_number",
      value: ["417", "17"],
    });
  });

  it("applies AI safety guards before persistence and when listing stored suggestions", () => {
    const persistence = readFileSync(
      join(process.cwd(), "src/lib/ai/suggestions/persistence.ts"),
      "utf8",
    );

    expect(persistence).toContain("applyAiSuggestionSafetyGuards(suggestion)");
    expect(persistence).toContain("const safeSuggestion");
    expect(persistence).toContain("confidence: safeSuggestion.confidence");
    expect(persistence).toContain("should_apply: safeSuggestion.should_apply");
  });

  it("selects targeted excerpts for missing financial, legal and lot fields", () => {
    const selected = selectTargetedAiExcerpts({
      document: {
        document_type: "pv_ag",
        filename: "PV.pdf",
        id: "doc-1",
      },
      eligibleFields: [
        {
          confidence: 0,
          field_id: "annual_budget_amount",
          field_origin: "automatic",
          manually_edited: false,
          status: "missing",
          value: null,
        },
        {
          confidence: 0,
          field_id: "legal_proceedings_description",
          field_origin: "automatic",
          manually_edited: false,
          status: "missing",
          value: null,
        },
        {
          confidence: 0,
          field_id: "lot_number",
          field_origin: "automatic",
          manually_edited: false,
          status: "missing",
          value: null,
        },
      ],
      maxChars: 2500,
      ownerContext: {
        known_lot_number: "A45",
        owner_name: "SCI LES MIMOSAS",
        project_id: "project-1",
      },
      pages: [
        {
          pageNumber: 3,
          text: `10. VOTE DU BUDGET PREVISIONNEL
L'assemblée vote le budget prévisionnel de l'exercice pour un montant de 145 000,00 €.

Procédure judiciaire : aucun contentieux en cours.

Référence SCI LES MIMOSAS - lot A45 - tantièmes 421/10000.`,
        },
      ],
    });

    expect(selected.excerpts.map((excerpt) => excerpt.field_id)).toEqual(
      expect.arrayContaining([
        "annual_budget_amount",
        "legal_proceedings_description",
        "lot_number",
      ]),
    );
    expect(selected.diagnostic).toMatchObject({
      documentType: "pv_ag",
      filename: "PV.pdf",
    });
    expect(selected.diagnostic.matchedKeywords.length).toBeGreaterThan(0);
    expect(selected.diagnostic.pagesIncluded).toEqual([3]);
  });

  it("exposes GET and POST suggestions routes without apply route behavior", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "src/app/api/projects/[projectId]/ai/suggestions/route.ts",
      ),
      "utf8",
    );

    expect(route).toContain("export async function GET");
    expect(route).toContain("export async function POST");
    expect(route).toContain("generateAiFieldSuggestions");
    expect(route).not.toContain("extracted_fields");
    expect(route).not.toContain("apply");
  });
});
