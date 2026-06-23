import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeOwnerContextPayload } from "../../src/lib/owner-context/project-owner-context";

describe("project owner context", () => {
  it("normalizes a physical owner payload", () => {
    expect(
      normalizeOwnerContextPayload({
        known_lot_number: "  A45 ",
        owner_name: "  Jean   DUPONT ",
      }),
    ).toEqual({
      known_lot_number: "A45",
      owner_name: "Jean DUPONT",
    });
  });

  it("normalizes a legal entity owner payload without requiring first name", () => {
    expect(
      normalizeOwnerContextPayload({
        known_lot_number: "",
        owner_name: " SCI   LES MIMOSAS ",
      }),
    ).toEqual({
      known_lot_number: null,
      owner_name: "SCI LES MIMOSAS",
    });
  });

  it("rejects a missing owner name", () => {
    expect(normalizeOwnerContextPayload({ owner_name: "   " })).toBeNull();
    expect(normalizeOwnerContextPayload({ known_lot_number: "12" })).toBeNull();
  });

  it("declares the minimal owner context migration", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260623130000_project_owner_context.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.project_owner_context");
    expect(migration).toContain("project_id uuid primary key");
    expect(migration).toContain("owner_name text not null");
    expect(migration).toContain("known_lot_number text");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("seller_email");
    expect(migration).not.toContain("seller_first_name");
    expect(migration).not.toContain("project_lots");
  });

  it("exposes a protected GET and PUT owner-context route only", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "src/app/api/projects/[projectId]/owner-context/route.ts",
      ),
      "utf8",
    );

    expect(route).toContain("export async function GET");
    expect(route).toContain("export async function PUT");
    expect(route).toContain("getUploadSessionProjectId");
    expect(route).toContain("normalizeOwnerContextPayload");
    expect(route).toContain("upsertProjectOwnerContext");
    expect(route).not.toContain("extractSimpleFields");
    expect(route).not.toContain("extractFinancialFields");
    expect(route).not.toContain("extractComplexFields");
    expect(route).not.toContain("OpenAI");
    expect(route).not.toContain("stripe");
  });

  it("keeps owner context outside automatic extraction persistence", () => {
    const extractionPersistence = readFileSync(
      join(process.cwd(), "src/lib/extraction/simple/persistence.ts"),
      "utf8",
    );
    const simpleExtractor = readFileSync(
      join(process.cwd(), "src/lib/extraction/simple/extractor.ts"),
      "utf8",
    );
    const financialExtractor = readFileSync(
      join(process.cwd(), "src/lib/extraction/simple/financial-extractor.ts"),
      "utf8",
    );
    const complexExtractor = readFileSync(
      join(process.cwd(), "src/lib/extraction/simple/complex-extractor.ts"),
      "utf8",
    );

    expect(extractionPersistence).not.toContain("project_owner_context");
    expect(simpleExtractor).not.toContain("project_owner_context");
    expect(financialExtractor).not.toContain("project_owner_context");
    expect(complexExtractor).not.toContain("project_owner_context");
  });
});
