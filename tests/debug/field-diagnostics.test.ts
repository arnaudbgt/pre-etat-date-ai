import { describe, expect, it } from "vitest";

import { buildFieldDebugDiagnostic } from "../../src/lib/debug/field-diagnostics";

const pvDocument = {
  classification_status: "classified",
  document_type: "pv_ag",
};

describe("advanced field debug diagnostics", () => {
  it("marks manual fields as protected", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "syndic_name",
          manually_edited: true,
          status: "confirmed",
        },
        sources: [],
      }),
    ).toMatchObject({
      failure_stage: "manual_protected",
      rejection_reason: "champ protégé manuellement",
    });
  });

  it("marks catalog fields missing from extractors as not implemented", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "seller_name",
          manually_edited: false,
          status: "missing",
        },
        sources: [],
      }),
    ).toMatchObject({
      failure_stage: "not_implemented",
      rejection_reason: "champ non implémenté dans les extracteurs actuels",
    });
  });

  it("detects a document type gate before candidate generation", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [
          {
            classification_status: "classified",
            document_type: "appel_de_fonds",
          },
        ],
        field: {
          field_id: "annual_budget_amount",
          manually_edited: false,
          status: "missing",
        },
        sources: [],
      }),
    ).toMatchObject({
      failure_stage: "document_type_gate",
      rejection_reason: "aucun document prioritaire disponible",
    });
  });

  it("distinguishes missing labels, amounts and dates", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "syndic_name",
          manually_edited: false,
          status: "missing",
        },
        sources: [],
      }).failure_stage,
    ).toBe("label_not_found");

    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "annual_budget_amount",
          manually_edited: false,
          status: "missing",
        },
        sources: [],
      }).failure_stage,
    ).toBe("amount_not_found");

    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "approval_date",
          manually_edited: false,
          status: "missing",
        },
        sources: [],
      }).failure_stage,
    ).toBe("date_not_found");
  });

  it("detects normalization failures from source values", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "syndic_name",
          manually_edited: false,
          status: "missing",
        },
        sources: [
          {
            confidence: 90,
            matched_rule: "simple.syndic_name",
            source_value: { value: "Cabinet Test" },
          },
        ],
      }),
    ).toMatchObject({
      failure_stage: "normalization_failed",
      rejection_reason: "normalisation impossible",
    });
  });

  it("reports below-threshold candidates with the best rule", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "syndic_name",
          manually_edited: false,
          status: "missing",
        },
        sources: [
          {
            confidence: 49,
            matched_rule: "simple.weak_syndic_name",
            source_value: {
              normalizedValue: "cabinet test",
              value: "Cabinet Test",
            },
          },
        ],
      }),
    ).toMatchObject({
      best_candidate_confidence: 49,
      best_candidate_rule: "simple.weak_syndic_name",
      candidate_count: 1,
      failure_stage: "candidate_below_threshold",
      rejection_reason: "candidat rejeté par le seuil",
    });
  });

  it("reports merge rejection for uncertain or inconsistent fields with candidates", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "syndic_name",
          manually_edited: false,
          status: "uncertain",
        },
        sources: [
          {
            confidence: 88,
            matched_rule: "simple.syndic_name",
            source_value: {
              normalizedValue: "cabinet test",
              value: "Cabinet Test",
            },
          },
        ],
      }),
    ).toMatchObject({
      failure_stage: "merge_rejected",
      rejection_reason: "sources rejetées au merge",
    });
  });

  it("does not invent a failure stage for confirmed automatic fields", () => {
    expect(
      buildFieldDebugDiagnostic({
        documents: [pvDocument],
        field: {
          field_id: "syndic_name",
          manually_edited: false,
          status: "confirmed",
        },
        sources: [
          {
            confidence: 95,
            matched_rule: "simple.syndic_name",
            source_value: {
              normalizedValue: "cabinet test",
              value: "Cabinet Test",
            },
          },
        ],
      }),
    ).toMatchObject({
      best_candidate_confidence: 95,
      best_candidate_rule: "simple.syndic_name",
      failure_stage: null,
      rejection_reason: "champ confirmé",
    });
  });
});
