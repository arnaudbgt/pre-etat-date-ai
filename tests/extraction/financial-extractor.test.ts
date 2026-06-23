import { describe, expect, it } from "vitest";

import { extractFinancialFields } from "../../src/lib/extraction/simple/financial-extractor";
import {
  canUpdateCanonicalField,
  mergeSimpleFieldSources,
} from "../../src/lib/extraction/simple/merge";
import { findMoneyAmounts } from "../../src/lib/extraction/simple/money";
import type {
  SimpleExtractionContext,
  StoredSourceCandidate,
} from "../../src/lib/extraction/simple/types";

function extract(
  documentType: SimpleExtractionContext["documentType"],
  text: string,
  classificationStatus: SimpleExtractionContext["classificationStatus"] = "classified",
) {
  return extractFinancialFields({
    classificationStatus,
    documentType,
    pages: [{ pageNumber: 1, text }],
  });
}

function field(
  candidates: ReturnType<typeof extractFinancialFields>,
  fieldId: string,
) {
  return candidates.find((candidate) => candidate.fieldId === fieldId);
}

function financialSource(
  documentId: string,
  value: number,
  confidence: number,
): StoredSourceCandidate {
  return {
    confidence,
    documentId,
    excerpt: `Montant : ${value}`,
    extractionVersion: "financial-rules-v1",
    matchedRule: "financial.test",
    normalizedValue: value.toFixed(2),
    page: 1,
    value,
  };
}

describe("French monetary parser", () => {
  it.each([
    ["1 234,56 €", 1234.56],
    ["1234,56 EUR", 1234.56],
    ["1.234,56 EUR", 1234.56],
    ["1/234,56 EUR", 1234.56],
  ])("normalizes %s", (text, expected) => {
    expect(findMoneyAmounts(text)[0]).toMatchObject({
      amount: expected,
      normalizedValue: "1234.56",
    });
  });

  it("does not parse a bare number without a currency", () => {
    expect(findMoneyAmounts("Solde : 1 234,56")).toEqual([]);
  });

  it("rejects a malformed slash grouping instead of parsing a partial amount", () => {
    expect(findMoneyAmounts("Solde : 1/23,45 EUR")).toEqual([]);
  });
});

describe("deterministic financial extraction", () => {
  it("extracts an explicit debtor balance", () => {
    const candidates = extract(
      "releve_coproprietaire",
      `RELEVÉ DE COMPTE COPROPRIÉTAIRE
Relevé de compte arrêté au 31/05/2026
Solde de votre compte débiteur : 1 234,56 €`,
    );

    expect(field(candidates, "account_statement_date")).toMatchObject({
      value: "2026-05-31",
    });
    expect(field(candidates, "current_balance_amount")).toMatchObject({
      confidence: 95,
      normalizedValue: "1234.56",
      value: 1234.56,
    });
    expect(field(candidates, "current_balance_label")).toMatchObject({
      confidence: 96,
      value: "debiteur",
    });
  });

  it("extracts an explicit creditor balance", () => {
    const candidates = extract(
      "releve_coproprietaire",
      "Solde de votre compte créditeur : 845,20 EUR",
    );

    expect(field(candidates, "current_balance_amount")?.value).toBe(845.2);
    expect(field(candidates, "current_balance_label")?.value).toBe("crediteur");
  });

  it("never interprets a minus sign alone as debtor or creditor", () => {
    const candidates = extract(
      "releve_coproprietaire",
      "Solde de votre compte : - 1 234,56 €",
    );

    expect(field(candidates, "current_balance_amount")).toMatchObject({
      confidence: 72,
      value: 1234.56,
    });
    expect(field(candidates, "current_balance_label")).toMatchObject({
      confidence: 60,
      value: "uncertain",
    });
  });

  it("accepts explicitly stated zero unpaid charges", () => {
    const candidates = extract(
      "releve_coproprietaire",
      "Charges impayées : 0,00 €",
    );

    expect(field(candidates, "unpaid_charges_amount")).toMatchObject({
      confidence: 94,
      normalizedValue: "0.00",
      value: 0,
    });
  });

  it("extracts treasury advance and a literal financial comment", () => {
    const candidates = extract(
      "appel_de_fonds",
      `Avance de trésorerie : 350,00 €
Observation : règlement reçu après édition du relevé`,
    );

    expect(field(candidates, "treasury_advance_amount")?.value).toBe(350);
    expect(field(candidates, "seller_financial_comment")?.value).toBe(
      "règlement reçu après édition du relevé",
    );
  });

  it("extracts the current quarter and its works-fund contribution without extrapolating", () => {
    const candidates = extract(
      "appel_de_fonds",
      `APPEL DE FONDS T2 2026
Cotisation trimestrielle au fonds travaux : 125,50 €`,
    );

    expect(field(candidates, "current_quarter")?.value).toBe("T2 2026");
    expect(field(candidates, "works_fund_quarterly_contribution")?.value).toBe(
      125.5,
    );
    expect(field(candidates, "works_fund_annual_amount")).toBeUndefined();
  });

  it("extracts an explicit annual works-fund amount and percentage", () => {
    const candidates = extract(
      "annexe_comptable",
      `Montant annuel global du fonds travaux : 6 000,00 EUR
Fonds travaux — pourcentage du budget prévisionnel : 5,00 %`,
    );

    expect(field(candidates, "works_fund_annual_amount")?.value).toBe(6000);
    expect(field(candidates, "works_fund_budget_percentage")).toMatchObject({
      normalizedValue: "5",
      value: 5,
    });
  });

  it("extracts the seller works-fund share and its date", () => {
    const candidates = extract(
      "releve_coproprietaire",
      "Part du fonds travaux rattachée aux lots au 31/12/2025 : 1 500,00 €",
    );

    expect(field(candidates, "works_fund_seller_share_amount")?.value).toBe(
      1500,
    );
    expect(field(candidates, "works_fund_seller_share_date")?.value).toBe(
      "2025-12-31",
    );
  });

  it("extracts an annual budget and its AG vote date", () => {
    const candidates = extract(
      "pv_ag",
      `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE DU 15/06/2026
Résolution 4 — Budget prévisionnel annuel : 120 000,00 €.
La résolution est adoptée à la majorité.`,
    );

    expect(field(candidates, "annual_budget_amount")?.value).toBe(120000);
    expect(field(candidates, "budget_vote_date")?.value).toBe("2026-06-15");
  });

  it("extracts a budget amount from a long numbered PV resolution block", () => {
    const candidates = extract(
      "pv_ag",
      `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE ORDINAIRE DU 12 décembre 2024
7. APPROBATION DES COMPTES DE L'EXERCICE DU 01/07/2023 AU 30/06/2024
Après délibération, cette résolution est adoptée.

10. VOTE DU BUDGET PREVISIONNEL POUR L'EXERCICE DU 01/07/2025 AU 30/06/2026
L'assemblée générale approuve le budget prévisionnel soumis au vote pour un montant de 145 000,00 €.
La résolution est adoptée à la majorité.`,
    );

    expect(field(candidates, "annual_budget_amount")).toMatchObject({
      matchedRule: "financial.pv_budget_resolution_amount",
      value: 145000,
    });
    expect(field(candidates, "budget_vote_date")?.value).toBe("2024-12-12");
  });

  it("keeps a PV budget amount uncertain when several amounts are in the same resolution", () => {
    const candidates = extract(
      "pv_ag",
      `Assemblée générale du 12/12/2024
10. VOTE DU BUDGET PREVISIONNEL
Le budget prévisionnel est adopté pour 145 000,00 €. Un sous-budget ascenseur de 8 000,00 € est mentionné.`,
    );

    expect(field(candidates, "annual_budget_amount")).toMatchObject({
      confidence: 84,
      matchedRule: "financial.pv_budget_resolution_ambiguous_amount",
      value: 145000,
    });
  });

  it("extracts the works-fund percentage from a PV resolution block", () => {
    const candidates = extract(
      "pv_ag",
      `Assemblée générale du 12/12/2024
13. DÉTERMINATION DU MONTANT DE LA COTISATION OBLIGATOIRE DU FONDS DE TRAVAUX
L'assemblée fixe la cotisation obligatoire du fonds travaux à 5,00 % du budget prévisionnel.
La résolution est adoptée.`,
    );

    const percentage = field(candidates, "works_fund_budget_percentage");
    expect(percentage).toMatchObject({ value: 5 });
    expect(percentage?.matchedRule).toMatch(
      /^financial\.(works_fund_budget_percentage|pv_works_fund_percentage)$/,
    );
  });

  it("caps a monetary candidate shared by several fields as uncertain", () => {
    const candidates = extract(
      "appel_de_fonds",
      "Cotisation trimestrielle et montant annuel global du fonds travaux : 100,00 €",
    );
    const quarterly = field(candidates, "works_fund_quarterly_contribution");
    const annual = field(candidates, "works_fund_annual_amount");

    expect(quarterly?.confidence).toBeLessThanOrEqual(84);
    expect(annual?.confidence).toBeLessThanOrEqual(84);
  });

  it("caps every candidate from a document classified uncertain", () => {
    const candidates = extract(
      "releve_coproprietaire",
      "Charges impayées : 200,00 €",
      "uncertain",
    );

    expect(candidates.every((candidate) => candidate.confidence <= 84)).toBe(
      true,
    );
  });

  it("does not include the complete source text in persistable candidates", () => {
    const marker = "FULL_TEXT_SENTINEL_MUST_NOT_PERSIST";
    const text = `Charges impayées : 200,00 € ${"x".repeat(500)} ${marker}`;
    const candidates = extract("releve_coproprietaire", text);
    const serialized = JSON.stringify(candidates);

    expect(serialized).not.toContain(marker);
    expect(serialized).not.toContain(text);
    expect(
      candidates.every((candidate) => candidate.excerpt.length <= 200),
    ).toBe(true);
  });
});

describe("financial merge and protection", () => {
  it("keeps the most probable contradictory amount and marks it uncertain", () => {
    const sources = [
      financialSource("doc-a", 1200, 95),
      financialSource("doc-b", 1300, 90),
    ];
    const result = mergeSimpleFieldSources(sources);

    expect(result).toMatchObject({
      sourceDocumentId: "doc-a",
      status: "uncertain",
      value: 1200,
    });
    expect(sources).toHaveLength(2);
  });

  it("returns missing when no reliable amount exists", () => {
    expect(mergeSimpleFieldSources([])).toMatchObject({
      confidence: 0,
      status: "missing",
      value: null,
    });
  });

  it("keeps manually edited fields protected", () => {
    expect(canUpdateCanonicalField(true)).toBe(false);
  });
});
