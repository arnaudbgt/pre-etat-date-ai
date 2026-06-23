import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import {
  buildManualDocumentTypeUpdate,
  getEffectiveDocumentType,
  isManualDocumentType,
} from "../../src/lib/documents/document-types";

describe("document type manual override", () => {
  it("keeps the automatic document_type and computes an effective type", () => {
    expect(
      getEffectiveDocumentType({
        document_type: "pv_ag",
        document_type_override: null,
      }),
    ).toBe("pv_ag");
    expect(
      getEffectiveDocumentType({
        document_type: "other",
        document_type_override: "appel_de_fonds",
      }),
    ).toBe("appel_de_fonds");
    expect(buildManualDocumentTypeUpdate("appel_de_fonds")).toEqual({
      document_type_override: "appel_de_fonds",
      is_document_type_manual: true,
    });
  });

  it("rejects unsupported manual document types", () => {
    expect(isManualDocumentType("unknown")).toBe(false);
    expect(isManualDocumentType("appel_de_fonds")).toBe(true);
  });

  it("exposes debug information for documents, fields, sources and report metrics", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/debug/project-debug-view.tsx"),
      "utf8",
    );

    expect(source).toContain("Documents du projet");
    expect(source).toContain("Champs extraits");
    expect(source).toContain("Sources");
    expect(source).toContain("Corrigé manuellement");
    expect(source).toContain("pdf_has_text_layer");
    expect(source).toContain("totalPages");
    expect(source).toContain("extractedCharacters");
    expect(source).toContain("best_candidate_rule");
    expect(source).toContain("Completion");
  });

  it("keeps the debug page read-only and avoids PDF re-extraction during render", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/debug/project-debug-data.ts"),
      "utf8",
    );

    expect(source).not.toContain("extractTextFromPdfBuffer");
    expect(source).not.toContain("extractTextFromPdfServer");
    expect(source).not.toContain("SOURCE_DOCUMENTS_BUCKET");
    expect(source).not.toContain(".storage");
    expect(source).not.toContain(".download(");
    expect(source).not.toContain("analyzeSyndicEmailCandidates");
  });

  it("reprocesses only the overridden document and then relaunches project consistency", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/documents/type-override-service.ts"),
      "utf8",
    );
    const persistenceSource = readFileSync(
      join(process.cwd(), "src/lib/extraction/simple/persistence.ts"),
      "utf8",
    );

    expect(source).toContain("extractSimpleFields(extractionContext)");
    expect(source).toContain("extractFinancialFields(extractionContext)");
    expect(source).toContain("extractComplexFields(extractionContext)");
    expect(source).toContain("evaluateAndPersistProjectConsistency");
    expect(source).toContain('.eq("document_id", input.documentId)');
    expect(persistenceSource).toContain('.eq("manually_edited", false)');
  });
});
