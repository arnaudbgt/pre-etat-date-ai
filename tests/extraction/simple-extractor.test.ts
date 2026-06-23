import { describe, expect, it } from "vitest";

import { extractSimpleFields } from "../../src/lib/extraction/simple/extractor";
import {
  canUpdateCanonicalField,
  mergeSimpleFieldSources,
} from "../../src/lib/extraction/simple/merge";
import type { StoredSourceCandidate } from "../../src/lib/extraction/simple/types";

function source(
  documentId: string,
  value: string,
  confidence: number,
): StoredSourceCandidate {
  return {
    confidence,
    documentId,
    excerpt: value,
    extractionVersion: "simple-rules-v1",
    matchedRule: "test.rule",
    normalizedValue: value.toLowerCase(),
    page: 1,
    value,
  };
}

describe("simple deterministic extraction", () => {
  it("extracts syndic identity and contact details from an explicit block", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "classified",
      documentType: "fiche_synthetique",
      pages: [
        {
          pageNumber: 1,
          text: `FICHE SYNTHÉTIQUE DE LA COPROPRIÉTÉ
Adresse de la copropriété : 12 rue des Lilas, 75010 Paris
Représentant légal : Cabinet Exemple Gestion
Adresse du syndic : 8 avenue Victor Hugo, 75016 Paris
Gestionnaire : Marie Dupont
Contact syndic : gestion@example.fr
Téléphone : 01 42 10 20 30`,
        },
      ],
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "syndic_name",
          value: "Cabinet Exemple Gestion",
        }),
        expect.objectContaining({
          fieldId: "syndic_manager",
          value: "Marie Dupont",
        }),
        expect.objectContaining({
          fieldId: "syndic_email",
          value: "gestion@example.fr",
        }),
        expect.objectContaining({
          fieldId: "syndic_phone",
          normalizedValue: "0142102030",
        }),
        expect.objectContaining({ fieldId: "property_address" }),
        expect.objectContaining({ fieldId: "syndic_address" }),
      ]),
    );
    expect(candidates.every((item) => item.excerpt.length <= 200)).toBe(true);
  });

  it("extracts AG dates, approval date and a complete syndic mandate", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "classified",
      documentType: "pv_ag",
      pages: [
        {
          pageNumber: 1,
          text: `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE ORDINAIRE DU 15 JUIN 2025
Résolution 2 — Approbation des comptes de l'exercice. La résolution est adoptée.
Mandat du syndic du 1 juillet 2025 au 30 juin 2028.`,
        },
      ],
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "last_ago_date",
          value: "2025-06-15",
        }),
        expect.objectContaining({
          fieldId: "approval_date",
          value: "2025-06-15",
        }),
        expect.objectContaining({
          fieldId: "syndic_mandate_start",
          value: "2025-07-01",
        }),
        expect.objectContaining({
          fieldId: "syndic_mandate_end",
          value: "2028-06-30",
        }),
      ]),
    );
  });

  it("prefers the AG title date over a letter date in Foncia minutes", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "classified",
      documentType: "pv_ag",
      pages: [
        {
          pageNumber: 1,
          text: `Le 09 mai 2023, M. Arnaud BEUGNETTE
Procès-verbal de l'assemblée générale spéciale du 14 avril 2023 à 14h00
Votre gestionnaire Gaelle ARNOULD`,
        },
      ],
    });

    expect(candidates).toContainEqual(
      expect.objectContaining({
        fieldId: "last_age_date",
        matchedRule: "ag.extraordinary_title_date",
        value: "2023-04-14",
      }),
    );
  });

  it("extracts Foncia agency, manager and residence address blocks", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "classified",
      documentType: "appel_de_fonds",
      pages: [
        {
          pageNumber: 1,
          text: `VOTRE AGENCE FONCIA Foncia Nancy - Tour Thiers 4 rue Piroux Tour Thiers 54000 Nancy 03 83 32 19 64
VOTRE GESTIONNAIRE Gaelle ARNOULD
VOTRE MODE DE PAIEMENT Paiement par prélèvement automatique
LA PLEIADE 6 AVENUE DU GENERAL LECLERC 54500 VANDOEUVRE LES NANCY
Montant à payer 29,95 €`,
        },
      ],
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "syndic_name",
          matchedRule: "syndic.foncia_agency_block",
          value: "Foncia Nancy - Tour Thiers",
        }),
        expect.objectContaining({
          fieldId: "syndic_manager",
          matchedRule: "syndic.foncia_manager_block",
          value: "Gaelle ARNOULD",
        }),
        expect.objectContaining({
          fieldId: "property_address",
          matchedRule: "property.foncia_residence_address_block",
          value: "LA PLEIADE 6 AVENUE DU GENERAL LECLERC 54500 VANDOEUVRE LES NANCY",
        }),
      ]),
    );
  });

  it("rejects a Foncia client email and keeps the agency manager email", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "classified",
      documentType: "appel_de_fonds",
      pages: [
        {
          pageNumber: 1,
          text: `VOS RÉFÉRENCES CLIENT
Numéro client : 001383863
Identifiant MyFoncia : c.beugnette@gmail.com
VOTRE ESPACE CLIENT Retrouvez l'ensemble des informations de votre compte.
VOTRE AGENCE FONCIA Foncia Nancy - Tour Thiers 4 rue Piroux 54000 Nancy
VOTRE GESTIONNAIRE Gaelle ARNOULD gaelle.arnould@foncia.com
Contactez-nous pour toute question.`,
        },
      ],
    });

    expect(candidates).toContainEqual(
      expect.objectContaining({
        fieldId: "syndic_email",
        matchedRule: "syndic.email_near_contact_block",
        value: "gaelle.arnould@foncia.com",
      }),
    );
    expect(candidates).not.toContainEqual(
      expect.objectContaining({
        fieldId: "syndic_email",
        value: "c.beugnette@gmail.com",
      }),
    );
  });

  it("keeps the missing side of a mandate absent when only one date is detected", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "classified",
      documentType: "pv_ag",
      pages: [
        {
          pageNumber: 1,
          text: `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE ORDINAIRE DU 15 JUIN 2025
Le mandat du syndic prend effet le 1 juillet 2025. La résolution est adoptée.`,
        },
      ],
    });

    expect(candidates).toContainEqual(
      expect.objectContaining({
        confidence: 76,
        fieldId: "syndic_mandate_start",
        value: "2025-07-01",
      }),
    );
    expect(
      candidates.some((item) => item.fieldId === "syndic_mandate_end"),
    ).toBe(false);
  });

  it("caps candidates from an uncertain document", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "uncertain",
      documentType: "fiche_synthetique",
      pages: [
        {
          pageNumber: 1,
          text: `FICHE SYNTHÉTIQUE
Représentant légal : Cabinet Exemple Gestion
Adresse de la copropriété : 12 rue des Lilas, 75010 Paris`,
        },
      ],
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((item) => item.confidence <= 84)).toBe(true);
    expect(
      mergeSimpleFieldSources([source("doc-a", "Cabinet Exemple Gestion", 79)])
        .status,
    ).toBe("uncertain");
  });

  it("does not extract any financial field", () => {
    const candidates = extractSimpleFields({
      classificationStatus: "classified",
      documentType: "appel_de_fonds",
      pages: [
        {
          pageNumber: 1,
          text: `APPEL DE FONDS
Syndic : Cabinet Exemple
Montant à régler : 4 500,00 €
Solde débiteur : 8 000,00 €`,
        },
      ],
    });

    expect(candidates.map((item) => item.fieldId)).toEqual(["syndic_name"]);
  });
});

describe("simple field merge policy", () => {
  it("keeps the most probable syndic but marks contradictory documents uncertain", () => {
    const sources = [
      source("doc-a", "Cabinet Alpha", 94),
      source("doc-b", "Cabinet Beta", 88),
    ];
    const result = mergeSimpleFieldSources(sources);

    expect(result).toMatchObject({
      normalizedValue: "cabinet alpha",
      sourceDocumentId: "doc-a",
      status: "uncertain",
      value: "Cabinet Alpha",
    });
    expect(sources).toHaveLength(2);
  });

  it("keeps the most probable property address but marks two addresses uncertain", () => {
    const sources = [
      source("doc-a", "12 rue des Lilas, 75010 Paris", 95),
      source("doc-b", "14 rue des Lilas, 75010 Paris", 90),
    ];
    const result = mergeSimpleFieldSources(sources);

    expect(result.status).toBe("uncertain");
    expect(result.value).toBe("12 rue des Lilas, 75010 Paris");
    expect(result.sourceDocumentId).toBe("doc-a");
  });

  it("boosts concordant sources and confirms the canonical value", () => {
    const result = mergeSimpleFieldSources([
      source("doc-a", "Cabinet Alpha", 82),
      source("doc-b", "Cabinet Alpha", 80),
    ]);

    expect(result.status).toBe("confirmed");
    expect(result.confidence).toBe(87);
  });

  it("never authorizes an automatic update of a manually edited field", () => {
    expect(canUpdateCanonicalField(true)).toBe(false);
    expect(canUpdateCanonicalField(false)).toBe(true);
  });
});
