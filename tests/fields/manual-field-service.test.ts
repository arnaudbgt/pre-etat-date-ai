import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildManualFieldUpdate,
  isKnownFieldId,
  normalizeManualFieldValue,
} from "../../src/lib/fields/manual-field-service";

describe("manual field validation service", () => {
  it("builds a manual update payload without touching sources", () => {
    const update = buildManualFieldUpdate({
      origin: "manual",
      value: "Foncia Nancy - Tour Thiers",
    });

    expect(update).toMatchObject({
      confidence: 100,
      field_origin: "manual",
      manually_edited: true,
      normalized_value: "foncia nancy tour thiers",
      status: "confirmed",
      value: "Foncia Nancy - Tour Thiers",
    });
    expect(update.edited_by_user_at).toEqual(expect.any(String));
  });

  it("builds a validation payload that keeps the current value unchanged", () => {
    const update = buildManualFieldUpdate({ origin: "validated" });

    expect(update).toMatchObject({
      confidence: 100,
      field_origin: "validated",
      manually_edited: true,
      status: "confirmed",
    });
    expect(update).not.toHaveProperty("value");
    expect(update).not.toHaveProperty("normalized_value");
  });

  it("recognizes catalog fields and normalizes manual values", () => {
    expect(isKnownFieldId("syndic_name")).toBe(true);
    expect(isKnownFieldId("not_a_field")).toBe(false);
    expect(normalizeManualFieldValue("  12 Rue des Lilas, Paris ")).toBe(
      "12 rue des lilas paris",
    );
  });

  it("keeps manual protection in extraction and consistency persistence", () => {
    const extractionPersistence = readFileSync(
      join(process.cwd(), "src/lib/extraction/simple/persistence.ts"),
      "utf8",
    );
    const consistencyPersistence = readFileSync(
      join(process.cwd(), "src/lib/consistency/persistence.ts"),
      "utf8",
    );

    expect(extractionPersistence).toContain('.eq("manually_edited", false)');
    expect(extractionPersistence).toContain("canUpdateCanonicalField");
    expect(consistencyPersistence).toContain("if (decision.manually_edited)");
    expect(consistencyPersistence).toContain('.eq("manually_edited", false)');
  });

  it("does not modify automatic sources and only relaunches project consistency", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/fields/manual-field-service.ts"),
      "utf8",
    );

    expect(source).toContain("evaluateAndPersistProjectConsistency");
    expect(source).toContain('.from("extracted_fields")');
    expect(source).not.toContain('.from("extracted_field_sources").delete');
    expect(source).not.toContain("extractTextFromPdfBuffer");
    expect(source).not.toContain("persistDeterministicExtraction");
  });

  it("declares the field origin migration", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260623110000_manual_field_validation.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("edited_by_user_at");
    expect(migration).toContain("field_origin");
    expect(migration).toContain("'automatic'");
    expect(migration).toContain("'manual'");
    expect(migration).toContain("'validated'");
  });
});
