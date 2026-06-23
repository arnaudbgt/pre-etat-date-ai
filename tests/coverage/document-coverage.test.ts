import { describe, expect, it } from "vitest";

import { buildDocumentCoverageReport } from "../../src/lib/coverage/document-coverage";
import type { Database } from "../../src/types/database.types";

function missing(fieldId: string) {
  return { field_id: fieldId, status: "missing" as const };
}

function confirmed(fieldId: string) {
  return { field_id: fieldId, status: "confirmed" as const };
}

function document(type: Database["public"]["Enums"]["document_type"]) {
  return {
    classification_status: "classified",
    document_type: type,
  };
}

describe("document coverage report", () => {
  it("lists only missing fields", () => {
    const report = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("annual_budget_amount"), confirmed("syndic_name")],
    });

    expect(report.map((item) => item.field_id)).toEqual([
      "annual_budget_amount",
    ]);
  });

  it("recommends PV AG or accounting annex for annual budget", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("annual_budget_amount")],
    });

    expect(item).toMatchObject({
      alternative_documents: ["annexe_comptable", "fiche_synthetique"],
      field_id: "annual_budget_amount",
      primary_document: "pv_ag",
      primary_document_present: false,
      status: "document_probably_missing",
    });
    expect(item.reason).toContain("Document probablement manquant");
  });

  it("recommends owner statement for current balance", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("current_balance_amount")],
    });

    expect(item.primary_document).toBe("releve_coproprietaire");
    expect(item.alternative_documents).toContain("appel_de_fonds");
  });

  it("recommends call for funds for quarterly works fund contribution", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("works_fund_quarterly_contribution")],
    });

    expect(item.primary_document).toBe("appel_de_fonds");
  });

  it("recommends summary sheet or collective DPE for collective DPE status", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("collective_dpe_status")],
    });

    expect(item.primary_document).toBe("fiche_synthetique");
    expect(item.alternative_documents).toContain("dpe_collectif");
  });

  it("recommends summary sheet or DTG for DTG status", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("dtg_status")],
    });

    expect(item.primary_document).toBe("fiche_synthetique");
    expect(item.alternative_documents).toContain("dtg");
  });

  it("recommends summary sheet or PPT for PPT status", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("ppt_status")],
    });

    expect(item.primary_document).toBe("fiche_synthetique");
    expect(item.alternative_documents).toContain("ppt");
  });

  it("marks present priority documents as probable rule gaps", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [document("pv_ag")],
      fields: [missing("annual_budget_amount")],
    });

    expect(item).toMatchObject({
      primary_document_present: true,
      status: "document_present_rule_missing",
    });
    expect(item.reason).toContain(
      "Document attendu présent mais champ non extrait",
    );
  });

  it("uses document type overrides when detecting present documents", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [
        {
          classification_status: "classified",
          document_type: "other",
          document_type_override: "appel_de_fonds",
        },
      ],
      fields: [missing("works_fund_quarterly_contribution")],
    });

    expect(item.primary_document_present).toBe(true);
    expect(item.status).toBe("document_present_rule_missing");
  });

  it("uses a stable fallback for unmapped missing fields", () => {
    const [item] = buildDocumentCoverageReport({
      documents: [],
      fields: [missing("unknown_future_field")],
    });

    expect(item).toMatchObject({
      field_id: "unknown_future_field",
      primary_document: "fiche_synthetique",
      status: "document_probably_missing",
    });
  });
});
