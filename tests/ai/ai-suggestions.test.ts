import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AI_SUGGESTION_FIELD_IDS } from "../../src/lib/ai/suggestions/field-allowlist";
import { getAiSuggestionConfig } from "../../src/lib/ai/suggestions/config";
import { selectTargetedAiExcerpts } from "../../src/lib/ai/suggestions/context-builder";
import {
  AI_SUGGESTIONS_JSON_SCHEMA,
  normalizeAiSuggestionsResponse,
} from "../../src/lib/ai/suggestions/schema";

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

  it("restricts Sprint 8 to the validated allowlist", () => {
    expect(AI_SUGGESTION_FIELD_IDS).toEqual([
      "annual_budget_amount",
      "approval_date",
      "budget_vote_date",
      "works_fund_quarterly_contribution",
      "works_fund_budget_percentage",
      "lot_number",
      "lot_tantiemes",
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
    expect(service).toContain("requestedFields");
    expect(service).toContain("eligibilityReasonByFieldId");
    expect(service).not.toContain("protected_or_not_eligible");
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
