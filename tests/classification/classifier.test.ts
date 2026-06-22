import { describe, expect, it } from "vitest";

import { classifyDocument } from "../../src/lib/classification/classifier";

const classify = (text: string) =>
  classifyDocument([{ pageNumber: 1, text }], { minCharacters: 40 });

describe("document rule classifier", () => {
  it.each([
    [
      "appel_de_fonds",
      `APPEL DE FONDS. Montant à régler 420 €. Cet appel est exigible le 1er juillet.
       Budget prévisionnel, tantièmes, votre quote-part, fonds travaux, prochain appel.
       Lot 12 copropriétaire. Paiement par virement IBAN.`,
    ],
    [
      "releve_coproprietaire",
      `RELEVÉ DE COMPTE COPROPRIÉTAIRE sur la période. Solde de votre compte à ce jour.
       Date, libellé de l'opération, débit, crédit, solde. Solde antérieur, règlement,
       compte 450, lot 12, total mouvements débit crédit.`,
    ],
    [
      "pv_ag",
      `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE. Président de séance et secrétaire de séance.
       Résolution 1 après en avoir délibéré. Résultat du vote : pour 8000, contre 1000,
       abstention 1000. Résolution adoptée à la majorité de l'article 24. La séance est levée.`,
    ],
    [
      "annexe_comptable",
      `ANNEXE 1 État financier après répartition. ANNEXE 2 comptes de gestion générale.
       ANNEXE 3. Exercice clos, réalisé, budget, charges et produits, créances, dettes,
       provisions et avances. Syndicat des copropriétaires, total de l'exercice.`,
    ],
    [
      "reglement_copropriete",
      `RÈGLEMENT DE COPROPRIÉTÉ ET ÉTAT DESCRIPTIF DE DIVISION. Destination de l'immeuble.
       Le lot numéro 12 comprend des parties privatives et une quote-part des parties communes.
       Tantièmes de copropriété, répartition des charges communes. Acte reçu par Maître Martin,
       notaire, publié au service de publicité foncière.`,
    ],
    [
      "fiche_synthetique",
      `FICHE SYNTHÉTIQUE DE LA COPROPRIÉTÉ. Numéro d'immatriculation au registre national.
       Identification du syndicat des copropriétaires, représentant légal de la copropriété,
       organisation juridique, données financières, nombre total de lots, exercice comptable,
       montant des impayés et présence d'un fonds de travaux.`,
    ],
    [
      "dtg",
      `DIAGNOSTIC TECHNIQUE GLOBAL DE LA COPROPRIÉTÉ. État apparent des parties communes.
       État technique de l'immeuble : façades, toiture, réseaux et équipements communs.
       Pathologies observées, visite sur site, photographies, désordres. Liste des travaux
       nécessaires, évaluation sommaire du coût, priorité urgente, court terme et moyen terme.`,
    ],
    [
      "ppt",
      `PROJET DE PLAN PLURIANNUEL DE TRAVAUX. Programme de travaux sur dix ans.
       Échéancier, priorité et estimation du coût des travaux. Année 1, année 5, scénario de
       travaux, sauvegarde de l'immeuble, santé et sécurité des occupants, économies d'énergie.`,
    ],
    [
      "dpe_collectif",
      `DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE DU BÂTIMENT COLLECTIF. DPE collectif.
       Consommation conventionnelle d'énergie primaire en kWhEP/m2/an et émissions de gaz à
       effet de serre en kg CO2/m2/an. Étiquette énergie, étiquette climat, numéro
       d'enregistrement ADEME, diagnostiqueur certifié, chauffage collectif de la copropriété.`,
    ],
  ])("classifies %s", (expectedType, text) => {
    const result = classify(text);

    expect(result.documentType).toBe(expectedType);
    expect(result.status).toBe("classified");
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it("rejects an AG invitation instead of treating it as minutes", () => {
    const result =
      classify(`CONVOCATION À L'ASSEMBÉE GÉNÉRALE. Vous êtes convoqué.
      Ordre du jour, pouvoir à retourner, formulaire de vote par correspondance.
      Projet de résolution soumis au vote.`);

    expect(result.documentType).toBe("other");
    expect(result.status).toBe("classified");
  });

  it("rejects an individual DPE", () => {
    const result = classify(`DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE APPARTEMENT.
      DPE individuel du logement n° 12. Surface habitable du logement, maison individuelle.`);

    expect(result.documentType).toBe("other");
  });

  it("uses insufficient_text for a PDF without an exploitable text layer", () => {
    const result = classifyDocument([{ pageNumber: 1, text: "   12   " }], {
      minCharacters: 40,
    });

    expect(result.documentType).toBe("other");
    expect(result.status).toBe("insufficient_text");
    expect(result.confidence).toBe(0);
  });

  it("keeps a plausible but weak result uncertain", () => {
    const result = classify(
      `APPEL DE FONDS. Montant à régler pour votre dossier de copropriété.`,
    );

    expect(result.documentType).toBe("appel_de_fonds");
    expect(result.status).toBe("uncertain");
  });

  it("does not include source text in persisted classification details", () => {
    const secretMarker = "DONNEE_PERSONNELLE_UNIQUE";
    const result =
      classify(`APPEL DE FONDS. Montant à régler. Exigible le 1er juillet.
      Budget, tantièmes, votre quote-part, total appel copropriétaire. ${secretMarker}`);

    expect(JSON.stringify(result.details)).not.toContain(secretMarker);
  });
});
