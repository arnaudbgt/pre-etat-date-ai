import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fieldStatusLabel } from "../../src/lib/result/field-status";
import { RESULT_SECTIONS } from "../../src/lib/result/sections";

describe("project result page", () => {
  it("declares the business result sections", () => {
    expect(RESULT_SECTIONS.map((section) => section.title)).toEqual([
      "Identification",
      "Situation financière",
      "Charges et budget",
      "Fonds travaux",
      "Travaux",
      "Juridique et diagnostics",
    ]);
    expect(
      RESULT_SECTIONS.find(
        (section) => section.title === "Identification",
      )?.fields.map((field) => field.fieldId),
    ).toContain("syndic_name");
    expect(
      RESULT_SECTIONS.find(
        (section) => section.title === "Fonds travaux",
      )?.fields.map((field) => field.fieldId),
    ).toContain("works_fund_seller_share_amount");
  });

  it("maps field statuses to user-facing labels", () => {
    expect(fieldStatusLabel("confirmed")).toBe("Confirmé");
    expect(fieldStatusLabel("uncertain")).toBe("À vérifier");
    expect(fieldStatusLabel("missing")).toBe("Manquant");
    expect(fieldStatusLabel("inconsistent")).toBe("Incohérent");
  });

  it("creates the result route and protects it with the upload session", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/analyse/resultat/[projectId]/page.tsx"),
      "utf8",
    );

    expect(source).toContain("getProjectResultData");
    expect(source).toContain("ProjectResultView");
    expect(source).toContain("getUploadSessionProjectIdFromValue");
    expect(source).toContain("UPLOAD_SESSION_COOKIE");
    expect(source).toContain("notFound()");
  });

  it("keeps result loading read-only without PDF or pipeline reprocessing", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/result/project-result-data.ts"),
      "utf8",
    );

    expect(source).toContain("buildDocumentCoverageReport");
    expect(source).toContain("getProjectOwnerContext");
    expect(source).toContain("listAiFieldSuggestions");
    expect(source).not.toContain("extractTextFromPdf");
    expect(source).not.toContain("classifyDocument");
    expect(source).not.toContain("extractSimpleFields");
    expect(source).not.toContain("extractFinancialFields");
    expect(source).not.toContain("extractComplexFields");
    expect(source).not.toContain("evaluateAndPersistProjectConsistency");
    expect(source).not.toContain(".storage");
    expect(source).not.toContain(".insert(");
    expect(source).not.toContain(".update(");
    expect(source).not.toContain(".delete(");
  });

  it("renders coverage and reuses Sprint 5.3 field actions only for persisted fields", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/result/project-result-view.tsx"),
      "utf8",
    );

    expect(source).toContain("Documents manquants ou recommandés");
    expect(source).toContain("OwnerContextSection");
    expect(source).toContain("AiSuggestionsSection");
    expect(source).toContain("FieldManualActions");
    expect(source).toContain("field.existsInDatabase");
    expect(source).toContain("Champ non initialisé");
    expect(source).not.toContain("pdf");
    expect(source).not.toContain("stripe");
  });

  it("renders a minimal owner context section in the result page", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/result/owner-context-section.tsx"),
      "utf8",
    );

    expect(source).toContain("Propriétaire vendeur");
    expect(source).toContain("Nom du propriétaire");
    expect(source).toContain("Numéro de lot connu");
    expect(source).toContain("/owner-context");
    expect(source).toContain('method: "PUT"');
    expect(source).not.toContain("seller_email");
    expect(source).not.toContain("seller_first_name");
    expect(source).not.toContain("tantiemes");
  });

  it("renders AI suggestions as read-only proposals", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/result/ai-suggestions-section.tsx"),
      "utf8",
    );

    expect(source).toContain("Suggestions IA");
    expect(source).toContain("Suggestion uniquement");
    expect(source).toContain("ne remplacent jamais");
    expect(source).not.toContain("/apply");
    expect(source).not.toContain("extracted_fields");
  });
});
