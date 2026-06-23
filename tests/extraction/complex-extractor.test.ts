import { describe, expect, it } from "vitest";

import { extractComplexFields } from "../../src/lib/extraction/simple/complex-extractor";
import {
  canUpdateCanonicalField,
  mergeSimpleFieldSources,
} from "../../src/lib/extraction/simple/merge";
import type {
  SimpleExtractionContext,
  StoredSourceCandidate,
} from "../../src/lib/extraction/simple/types";

function extract(
  documentType: SimpleExtractionContext["documentType"],
  text: string,
  classificationStatus: SimpleExtractionContext["classificationStatus"] = "classified",
) {
  return extractComplexFields({
    classificationStatus,
    documentType,
    pages: [{ pageNumber: 1, text }],
  });
}

function field(
  candidates: ReturnType<typeof extractComplexFields>,
  fieldId: string,
) {
  return candidates.find((candidate) => candidate.fieldId === fieldId);
}

function parsedValue<T>(
  candidates: ReturnType<typeof extractComplexFields>,
  fieldId: string,
) {
  const value = field(candidates, fieldId)?.value;
  return typeof value === "string" ? (JSON.parse(value) as T) : undefined;
}

function complexSource(
  documentId: string,
  value: string,
  confidence: number,
): StoredSourceCandidate {
  return {
    confidence,
    documentId,
    excerpt: value,
    extractionVersion: "complex-rules-v1",
    matchedRule: "complex.test",
    normalizedValue: value,
    page: 1,
    value,
  };
}

describe("deterministic complex extraction", () => {
  it("extracts voted and paid works with an explicit amount", () => {
    const candidates = extract(
      "pv_ag",
      `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE DU 12/03/2026
Résolution n° 5 — Réfection de la toiture
Travaux votés, appelés et payés. Montant : 12 500,00 €`,
    );
    const works = parsedValue<
      Array<{
        amount_cents?: number;
        funding_status: string;
        title: string;
        vote_date?: string;
      }>
    >(candidates, "voted_paid_works");

    expect(works).toEqual([
      {
        amount_cents: 1250000,
        funding_status: "called_and_paid",
        title: "Réfection de la toiture",
        vote_date: "2026-03-12",
      },
    ]);
  });

  it("extracts works from long numbered PV resolutions and keeps the AG vote date", () => {
    const candidates = extract(
      "pv_ag",
      `Procès-verbal de l'assemblée générale spéciale du 14 avril 2023
5. REALISATION DES TRAVAUX DE RACCORDEMENT AU RESEAU DE CHAUFFAGE URBAIN
Après en avoir délibéré, l'assemblée adopte les travaux pour un montant de 32 400,00 €.
Les travaux sont appelés et payés.`,
    );
    const works = parsedValue<
      Array<{
        amount_cents?: number;
        funding_status: string;
        title: string;
        vote_date?: string;
      }>
    >(candidates, "voted_paid_works");

    expect(works).toEqual([
      {
        amount_cents: 3240000,
        funding_status: "called_and_paid",
        title:
          "REALISATION DES TRAVAUX DE RACCORDEMENT AU RESEAU DE CHAUFFAGE URBAIN",
        vote_date: "2023-04-14",
      },
    ]);
  });

  it("extracts voted works without inventing a missing amount", () => {
    const candidates = extract(
      "pv_ag",
      `Assemblée générale du 12/03/2026
Résolution n° 6 — Remplacement de la porte du hall
Travaux votés, appelés et réglés.`,
    );
    const works = parsedValue<Array<Record<string, unknown>>>(
      candidates,
      "voted_paid_works",
    );

    expect(works?.[0]).not.toHaveProperty("amount_cents");
    expect(works?.[0]).toMatchObject({
      title: "Remplacement de la porte du hall",
    });
  });

  it("extracts explicit future works calls and their dates", () => {
    const works = parsedValue<Array<Record<string, unknown>>>(
      extract(
        "pv_ag",
        `Assemblée générale du 12/03/2026
Résolution n° 7 — Ravalement de la façade
Travaux votés. Futurs appels de fonds les 01/09/2026 et 01/12/2026.`,
      ),
      "future_works_calls",
    );

    expect(works?.[0]).toMatchObject({
      call_dates: ["2026-09-01", "2026-12-01"],
      funding_status: "future_calls",
      title: "Ravalement de la façade",
    });
  });

  it("extracts future works calls from a sub-numbered PV resolution", () => {
    const works = parsedValue<Array<Record<string, unknown>>>(
      extract(
        "pv_ag",
        `Procès-verbal de l'assemblée générale ordinaire du 12 décembre 2024
14.2. TRAVAUX D'ASSAINISSEMENT - FINANCEMENT
L'assemblée générale adopte les travaux. Les appels de fonds à venir seront appelés les 01/03/2025 et 01/06/2025.`,
      ),
      "future_works_calls",
    );

    expect(works?.[0]).toMatchObject({
      call_dates: ["2025-03-01", "2025-06-01"],
      funding_status: "future_calls",
      title: "TRAVAUX D'ASSAINISSEMENT - FINANCEMENT",
      vote_date: "2024-12-12",
    });
  });

  it("extracts works explicitly voted but not yet called", () => {
    const works = parsedValue<Array<Record<string, unknown>>>(
      extract(
        "annexe_comptable",
        `Résolution n° 8 — Réfection de l'ascenseur
Travaux votés non encore appelés.`,
      ),
      "voted_not_called_works",
    );

    expect(works?.[0]).toMatchObject({
      funding_status: "not_called",
      title: "Réfection de l'ascenseur",
    });
  });

  it("keeps only the document's factual statement for legal proceedings", () => {
    const procedures = parsedValue<
      Array<{ factual_statement: string; target: string }>
    >(
      extract(
        "fiche_synthetique",
        "Une procédure judiciaire en recouvrement est engagée contre trois copropriétaires.",
      ),
      "legal_proceedings_description",
    );

    expect(procedures).toEqual([
      {
        factual_statement:
          "Une procédure judiciaire en recouvrement est engagée contre trois copropriétaires.",
        target: "coproprietaire",
      },
    ]);
  });

  it("records an explicit absence of legal proceedings", () => {
    const procedures = parsedValue<unknown[]>(
      extract("fiche_synthetique", "Aucune procédure judiciaire en cours."),
      "legal_proceedings_description",
    );

    expect(procedures).toEqual([]);
  });

  it.each([
    ["Un emprunt collectif a été souscrit et reste en cours.", "yes"],
    ["Aucun emprunt collectif en cours.", "no"],
  ])("extracts collective-loan status from %s", (text, expected) => {
    expect(field(extract("pv_ag", text), "collective_loan")?.value).toBe(
      expected,
    );
  });

  it("does not treat unrelated words like empruntaient as a collective loan", () => {
    expect(
      field(
        extract(
          "pv_ag",
          "Les copropriétaires empruntaient les WC communs pendant les travaux.",
        ),
        "collective_loan",
      ),
    ).toBeUndefined();
  });

  it("extracts an adopted PPT", () => {
    expect(
      field(
        extract(
          "pv_ag",
          "Le plan pluriannuel de travaux est adopté par l'assemblée générale.",
        ),
        "ppt_status",
      )?.value,
    ).toBe("adopted");
  });

  it("extracts PPT adoption from a long PV resolution title", () => {
    expect(
      field(
        extract(
          "pv_ag",
          `11. PRESENTATION DU PROJET DE PLAN PLURIANNUEL DE TRAVAUX
Le projet est présenté à l'assemblée.
12. ADOPTION D'UN PLAN PLURIANNUEL DE TRAVAUX
Après délibération, le plan pluriannuel de travaux est adopté.`,
        ),
        "ppt_status",
      )?.value,
    ).toBe("adopted");
  });

  it("extracts a completed DTG", () => {
    expect(
      field(
        extract("dtg", "Diagnostic technique global réalisé — rapport final."),
        "dtg_status",
      )?.value,
    ).toBe("completed");
  });

  it("extracts a completed collective DPE", () => {
    expect(
      field(
        extract(
          "dpe_collectif",
          "DPE collectif réalisé pour l'ensemble de l'immeuble.",
        ),
        "collective_dpe_status",
      )?.value,
    ).toBe("completed");
  });

  it.each([
    [
      "ppt",
      "Aucun plan pluriannuel de travaux n'est établi.",
      "ppt_status",
      "absent",
    ],
    ["dtg", "Le DTG est en cours de réalisation.", "dtg_status", "in_progress"],
    [
      "dpe_collectif",
      "Absence de DPE collectif.",
      "collective_dpe_status",
      "absent",
    ],
  ] as const)(
    "extracts an explicit controlled status from a %s document",
    (documentType, text, fieldId, expected) => {
      expect(field(extract(documentType, text), fieldId)?.value).toBe(expected);
    },
  );

  it("returns no status candidate when the document is silent", () => {
    expect(
      field(
        extract("fiche_synthetique", "Nombre total de lots : 28."),
        "dtg_status",
      ),
    ).toBeUndefined();
  });

  it("distinguishes an explicit unknown status from documentary silence", () => {
    expect(
      field(
        extract("fiche_synthetique", "Statut du DTG : non renseigné."),
        "dtg_status",
      )?.value,
    ).toBe("unknown");
  });

  it("caps candidates from an ambiguously classified document", () => {
    const candidates = extract(
      "ppt",
      "Le plan pluriannuel de travaux est en cours d'élaboration.",
      "uncertain",
    );

    expect(field(candidates, "ppt_status")?.confidence).toBeLessThanOrEqual(84);
  });

  it("does not associate an amount from a separate block with works", () => {
    const works = parsedValue<Array<Record<string, unknown>>>(
      extract(
        "pv_ag",
        `Assemblée générale du 12/03/2026
Résolution n° 9 — Isolation de la toiture
Travaux votés, appelés et payés.
Résolution n° 10 — Budget prévisionnel
Montant : 40 000,00 €`,
      ),
      "voted_paid_works",
    );

    expect(works?.[0]).not.toHaveProperty("amount_cents");
  });

  it("never exposes the complete source text in persistable candidates", () => {
    const marker = "COMPLETE_COMPLEX_TEXT_MUST_NOT_PERSIST";
    const text = `DPE collectif réalisé. ${"x".repeat(500)} ${marker}`;
    const candidates = extract("dpe_collectif", text);
    const serialized = JSON.stringify(candidates);

    expect(serialized).not.toContain(marker);
    expect(serialized).not.toContain(text);
    expect(candidates.every((item) => item.excerpt.length <= 200)).toBe(true);
  });
});

describe("complex merge and manual protection", () => {
  it("marks contradictory documents uncertain and keeps the best source", () => {
    const result = mergeSimpleFieldSources([
      complexSource("doc-a", "adopted", 95),
      complexSource("doc-b", "absent", 92),
    ]);

    expect(result).toMatchObject({
      sourceDocumentId: "doc-a",
      status: "uncertain",
      value: "adopted",
    });
  });

  it("protects manually edited fields", () => {
    expect(canUpdateCanonicalField(true)).toBe(false);
  });
});
