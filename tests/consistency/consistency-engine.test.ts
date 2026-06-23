import { describe, expect, it } from "vitest";

import { evaluateProjectConsistency } from "../../src/lib/consistency/evaluator";
import {
  calculateCompletionRate,
  calculateConfidenceScore,
  getReportStatus,
} from "../../src/lib/consistency/scoring";
import type {
  ConsistencyDocument,
  ConsistencyFieldInput,
  ConsistencySource,
  FieldConsistencyDecision,
} from "../../src/lib/consistency/types";

function document(
  id: string,
  classificationStatus: ConsistencyDocument["classificationStatus"] = "classified",
  documentType = "pv_ag",
): ConsistencyDocument {
  return { classificationStatus, documentType, id };
}

function field(
  fieldId: string,
  overrides: Partial<ConsistencyFieldInput> = {},
): ConsistencyFieldInput {
  return {
    confidence: 0,
    fieldId,
    id: `field-${fieldId}`,
    manuallyEdited: false,
    normalizedValue: null,
    status: "missing",
    value: null,
    ...overrides,
  };
}

function source(
  fieldId: string,
  documentId: string,
  value: string | number,
  confidence = 95,
): ConsistencySource {
  return {
    confidence,
    documentId,
    extractedFieldId: `field-${fieldId}`,
    matchedRule: "test.rule",
    sourceValue: {
      normalizedValue: String(value).toLowerCase(),
      value,
    },
  };
}

function decision(
  fieldId: string,
  status: FieldConsistencyDecision["status"],
  confidence: number,
  weight: number,
): FieldConsistencyDecision {
  return {
    confidence,
    field_id: fieldId,
    manually_edited: false,
    previous_confidence: confidence,
    previous_status: status,
    reason: "test",
    sources_count: 1,
    sources_used: ["doc-a"],
    status,
    weight,
  };
}

function project(
  fields: ConsistencyFieldInput[],
  sources: ConsistencySource[],
) {
  return evaluateProjectConsistency({
    documents: [document("doc-a"), document("doc-b")],
    fields,
    projectId: "project-a",
    sources,
  });
}

describe("consistency engine", () => {
  it("confirms a field with two concordant strong sources", () => {
    const summary = project(
      [
        field("annual_budget_amount", {
          confidence: 95,
          normalizedValue: "120000.00",
          status: "confirmed",
          value: 120000,
        }),
      ],
      [
        source("annual_budget_amount", "doc-a", "120000.00", 95),
        source("annual_budget_amount", "doc-b", "120000.00", 92),
      ],
    );

    expect(
      summary.fields.find((item) => item.field_id === "annual_budget_amount"),
    ).toMatchObject({
      confidence: 95,
      sources_count: 2,
      status: "confirmed",
    });
  });

  it("marks a field uncertain with a single weak source", () => {
    const summary = evaluateProjectConsistency({
      documents: [document("doc-a", "uncertain")],
      fields: [
        field("syndic_email", {
          confidence: 72,
          normalizedValue: "contact@example.test",
          status: "uncertain",
          value: "contact@example.test",
        }),
      ],
      projectId: "project-a",
      sources: [source("syndic_email", "doc-a", "contact@example.test", 72)],
    });

    expect(
      summary.fields.find((item) => item.field_id === "syndic_email"),
    ).toMatchObject({
      confidence: 72,
      status: "uncertain",
    });
  });

  it("marks a field missing when no exploitable value exists", () => {
    const summary = project([], []);

    expect(
      summary.fields.find((item) => item.field_id === "seller_name"),
    ).toMatchObject({
      confidence: 0,
      sources_count: 0,
      status: "missing",
    });
  });

  it("marks a field inconsistent with two contradictory strong values", () => {
    const summary = project(
      [
        field("current_balance_amount", {
          confidence: 96,
          normalizedValue: "1234.56",
          status: "confirmed",
          value: 1234.56,
        }),
      ],
      [
        source("current_balance_amount", "doc-a", "1234.56", 96),
        source("current_balance_amount", "doc-b", "1300.00", 94),
      ],
    );

    expect(
      summary.fields.find((item) => item.field_id === "current_balance_amount"),
    ).toMatchObject({
      status: "inconsistent",
    });
  });

  it("keeps a manually edited field protected while including it in scores", () => {
    const summary = project(
      [
        field("property_address", {
          confidence: 99,
          manuallyEdited: true,
          normalizedValue: "12 rue exemple",
          status: "confirmed",
          value: "12 rue Exemple",
        }),
      ],
      [
        source("property_address", "doc-a", "12 rue exemple", 99),
        source("property_address", "doc-b", "14 rue exemple", 99),
      ],
    );
    const decision = summary.fields.find(
      (item) => item.field_id === "property_address",
    );

    expect(decision).toMatchObject({
      confidence: 99,
      manually_edited: true,
      status: "confirmed",
    });
    expect(decision?.reason).toContain("non recalculé");
  });

  it("calculates completion_rate with inconsistent fields counted as present", () => {
    expect(
      calculateCompletionRate([
        decision("seller_name", "confirmed", 90, 3),
        decision("collective_loan", "inconsistent", 70, 3),
        decision("syndic_phone", "missing", 0, 1),
      ]),
    ).toBe(86);
  });

  it("calculates confidence_score with weighted confidence and inconsistency penalty", () => {
    expect(
      calculateConfidenceScore([
        decision("seller_name", "confirmed", 90, 3),
        decision("syndic_name", "uncertain", 70, 2),
        decision("collective_loan", "inconsistent", 70, 3),
      ]),
    ).toBe(74);
  });

  it("applies stronger weighting to important fields", () => {
    expect(
      calculateCompletionRate([
        decision("property_address", "confirmed", 95, 3),
        decision("syndic_phone", "missing", 0, 1),
      ]),
    ).toBe(75);
  });

  it("counts non-classified documents without treating their sources as strong", () => {
    const summary = evaluateProjectConsistency({
      documents: [
        document("doc-a", "pending"),
        document("doc-b", "classified"),
      ],
      fields: [
        field("current_quarter", {
          confidence: 90,
          normalizedValue: "T2 2026",
          status: "confirmed",
          value: "T2 2026",
        }),
      ],
      projectId: "project-a",
      sources: [source("current_quarter", "doc-a", "T2 2026", 90)],
    });

    expect(summary.documents_count).toBe(2);
    expect(summary.classified_documents_count).toBe(1);
    expect(
      summary.fields.find((item) => item.field_id === "current_quarter"),
    ).toMatchObject({
      confidence: 84,
      status: "uncertain",
    });
  });

  it("keeps sources from insufficient_text PDFs uncertain", () => {
    const summary = evaluateProjectConsistency({
      documents: [document("doc-a", "insufficient_text")],
      fields: [
        field("ppt_status", {
          confidence: 88,
          normalizedValue: "adopted",
          status: "confirmed",
          value: "adopted",
        }),
      ],
      projectId: "project-a",
      sources: [source("ppt_status", "doc-a", "adopted", 88)],
    });

    expect(
      summary.fields.find((item) => item.field_id === "ppt_status"),
    ).toMatchObject({
      confidence: 84,
      status: "uncertain",
    });
  });

  it("uses report status rules for draft, preview and ready", () => {
    expect(
      getReportStatus([decision("property_address", "missing", 0, 3)], 92),
    ).toBe("draft");
    expect(
      getReportStatus([decision("property_address", "confirmed", 90, 3)], 82),
    ).toBe("preview");
    expect(
      getReportStatus([decision("property_address", "confirmed", 90, 3)], 88),
    ).toBe("ready");
  });
});
