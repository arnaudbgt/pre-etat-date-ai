import type { ClassificationRule, Signal } from "./types";

const signal = (id: string, any: string[]): Signal => ({ any, id });
const all = (id: string, terms: string[]): Signal => ({ all: terms, id });

export const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    type: "appel_de_fonds",
    titleSignals: [
      signal("title_appel_fonds", [
        "appel de fonds",
        "avis d'appel de fonds",
        "appel de provisions",
        "appel de charges",
        "avis d'echeance copropriete",
      ]),
    ],
    strongExpressions: [
      signal("amount_due", [
        "montant a regler",
        "montant exigible",
        "total appel coproprietaire",
      ]),
      signal("due_date", [
        "date d'exigibilite",
        "exigible le",
        "a regler avant le",
      ]),
      signal("quarter_provision", [
        "provision du trimestre",
        "provisions pour charges courantes",
      ]),
    ],
    positiveKeywords: [
      signal("quote_part", ["votre quote part", "quote-part"]),
      signal("tantiemes", ["tantiemes", "milliemes"]),
      signal("works_fund", ["fonds travaux", "fonds de travaux"]),
      signal("budget", ["budget previsionnel"]),
      signal("next_call", ["prochain appel"]),
    ],
    majorStructures: [
      all("structure_due_amount", ["exigible", "montant", "€"]),
      all("structure_budget_share", ["budget", "tantiemes", "quote part"]),
    ],
    secondaryStructures: [
      signal("payment_instructions", [
        "iban",
        "virement",
        "coupon de paiement",
        "mandat sepa",
      ]),
      all("identified_lots", ["lot", "coproprietaire"]),
    ],
    negativeStrong: [
      signal("negative_minutes", ["proces verbal", "proces-verbal"]),
      signal("negative_convocation", ["convocation a l'assemblee generale"]),
      signal("negative_regulation", ["reglement de copropriete"]),
    ],
    negativeWeak: [
      signal("negative_account_title", ["releve de compte coproprietaire"]),
    ],
    incompatible: [
      all("incompatible_no_due", ["solde de tout compte", "aucune echeance"]),
    ],
  },
  {
    type: "releve_coproprietaire",
    titleSignals: [
      signal("title_account_statement", [
        "releve de compte coproprietaire",
        "releve de compte",
        "compte individuel",
        "situation de compte",
        "extrait de compte",
        "historique de compte",
      ]),
    ],
    strongExpressions: [
      signal("balance_today", [
        "solde de votre compte",
        "solde a ce jour",
        "nouveau solde",
      ]),
      signal("account_period", [
        "releve de compte sur la periode",
        "detail de vos operations",
      ]),
      signal("opening_balance", [
        "solde anterieur",
        "reprise de solde",
        "a nouveau",
      ]),
    ],
    positiveKeywords: [
      signal("debit", ["debit"]),
      signal("credit", ["credit"]),
      signal("operation_label", ["libelle de l'operation", "operations"]),
      signal("payment", ["reglement", "prelevement", "virement"]),
      signal("account_450", ["compte 450", "450-1"]),
    ],
    majorStructures: [
      all("ledger_columns", ["date", "libelle", "debit", "credit", "solde"]),
      all("ledger_balances", ["solde anterieur", "total", "solde"]),
    ],
    secondaryStructures: [
      all("owner_account", ["coproprietaire", "compte", "lot"]),
      all("dated_operations", ["operations", "periode", "solde"]),
    ],
    negativeStrong: [
      signal("negative_minutes", ["proces verbal", "proces-verbal"]),
      signal("negative_regulation", ["reglement de copropriete"]),
    ],
    negativeWeak: [
      signal("negative_due_call", [
        "prochain appel de fonds",
        "montant a regler avant le",
      ]),
    ],
    incompatible: [
      all("incompatible_single_due", [
        "total appel coproprietaire",
        "exigible le",
      ]),
    ],
  },
  {
    type: "pv_ag",
    titleSignals: [
      all("title_minutes_ag", ["proces verbal", "assemblee generale"]),
      all("title_minutes_ag_hyphen", ["proces-verbal", "assemblee generale"]),
      signal("title_ag_report", ["compte rendu de l'assemblee generale"]),
    ],
    strongExpressions: [
      signal("resolution_result", [
        "resolution adoptee",
        "resolution rejetee",
        "resultat du vote",
      ]),
      signal("session_closed", ["la seance est levee", "heure de cloture"]),
      signal("deliberation", [
        "apres en avoir delibere",
        "peut valablement deliberer",
      ]),
    ],
    positiveKeywords: [
      signal("chair", ["president de seance"]),
      signal("secretary", ["secretaire de seance"]),
      signal("scrutineer", ["scrutateur"]),
      signal("votes", ["pour", "contre", "abstention"]),
      signal("represented", [
        "presents ou representes",
        "tantiemes representes",
      ]),
    ],
    majorStructures: [
      all("resolution_votes", ["resolution", "pour", "contre", "abstention"]),
      all("session_office", ["president de seance", "secretaire de seance"]),
    ],
    secondaryStructures: [
      signal("majority_article", [
        "majorite de l'article",
        "article 24",
        "article 25",
        "article 26",
      ]),
      signal("opponents", ["opposants", "absents non representes"]),
    ],
    negativeStrong: [
      signal("negative_convocation", [
        "convocation a l'assemblee generale",
        "vous etes convoque",
      ]),
      signal("negative_blank_vote", ["formulaire de vote par correspondance"]),
    ],
    negativeWeak: [
      signal("negative_draft_resolution", [
        "projet de resolution",
        "resolution proposee",
      ]),
    ],
    incompatible: [
      all("incompatible_ag_invitation", [
        "ordre du jour",
        "pouvoir a retourner",
      ]),
    ],
  },
  {
    type: "annexe_comptable",
    titleSignals: [
      signal("title_accounting_annex", [
        "annexe comptable",
        "annexe 1",
        "annexe 2",
        "annexe 3",
        "annexe 4",
        "annexe 5",
      ]),
      signal("title_annual_accounts", [
        "comptes annuels de la copropriete",
        "etats comptables",
      ]),
    ],
    strongExpressions: [
      signal("financial_statement", ["etat financier apres repartition"]),
      signal("general_management", [
        "comptes de gestion generale",
        "compte de gestion generale",
      ]),
      signal("unclosed_works", [
        "travaux et operations exceptionnelles non clotures",
        "travaux non clotures",
      ]),
    ],
    positiveKeywords: [
      signal("closed_period", ["exercice clos"]),
      signal("expenses_income", ["charges et produits"]),
      signal("receivables_debts", ["creances", "dettes"]),
      signal("provisions_advances", ["provisions et avances"]),
      signal("allocation_keys", ["cles de repartition"]),
    ],
    majorStructures: [
      all("annex_sequence", ["annexe 1", "annexe 2", "annexe 3"]),
      all("accounting_columns", ["exercice", "realise", "budget", "charges"]),
    ],
    secondaryStructures: [
      all("syndicate_totals", [
        "syndicat des coproprietaires",
        "total",
        "exercice",
      ]),
      signal("account_numbers", [
        "compte 102",
        "compte 105",
        "compte 450",
        "compte 512",
      ]),
    ],
    negativeStrong: [
      signal("negative_owner_statement", [
        "releve de compte coproprietaire",
        "votre compte individuel",
      ]),
      signal("negative_invoice", ["facture n", "devis n"]),
    ],
    negativeWeak: [
      signal("negative_due", ["montant a regler", "appel exigible"]),
    ],
    incompatible: [
      all("incompatible_bank_statement", ["releve bancaire", "iban", "bic"]),
    ],
  },
  {
    type: "reglement_copropriete",
    titleSignals: [
      signal("title_regulation", ["reglement de copropriete"]),
      signal("title_division", ["etat descriptif de division"]),
      signal("title_amendment", [
        "modificatif au reglement de copropriete",
        "acte modificatif",
      ]),
    ],
    strongExpressions: [
      signal("private_common_parts", [
        "parties privatives",
        "parties communes generales",
      ]),
      signal("building_destination", ["destination de l'immeuble"]),
      signal("lot_description", ["le lot numero", "lots de copropriete"]),
    ],
    positiveKeywords: [
      signal("shares", [
        "tantiemes de copropriete",
        "quote-part des parties communes",
        "10 000emes",
      ]),
      signal("servitudes", ["servitudes"]),
      signal("notary", ["notaire", "maitre"]),
      signal("land_registry", [
        "publicite fonciere",
        "conservation des hypotheques",
      ]),
      signal("charge_distribution", ["repartition des charges communes"]),
    ],
    majorStructures: [
      all("legal_lots", ["lot numero", "parties communes", "tantiemes"]),
      all("legal_sections", ["titre", "chapitre", "article", "immeuble"]),
    ],
    secondaryStructures: [
      all("cadastral", ["cadastre", "section", "parcelle"]),
      all("published_deed", ["acte", "notaire", "publie"]),
    ],
    negativeStrong: [
      signal("negative_internal_rules", [
        "reglement interieur",
        "charte de l'immeuble",
      ]),
      signal("negative_minutes", ["proces verbal d'assemblee generale"]),
    ],
    negativeWeak: [signal("negative_contract", ["contrat de syndic"])],
    incompatible: [
      all("incompatible_welcome", ["livret d'accueil", "regles de vie"]),
    ],
  },
  {
    type: "fiche_synthetique",
    titleSignals: [
      signal("title_summary_sheet", ["fiche synthetique de la copropriete"]),
    ],
    strongExpressions: [
      signal("registration_number", [
        "numero d'immatriculation au registre national",
        "numero d'immatriculation",
      ]),
      signal("syndicate_identification", [
        "identification du syndicat des coproprietaires",
      ]),
      signal("legal_representative", ["representant legal de la copropriete"]),
    ],
    positiveKeywords: [
      signal("national_register", ["registre national des coproprietes"]),
      signal("lot_count", [
        "nombre total de lots",
        "lots a usage d'habitation",
      ]),
      signal("financial_data", ["donnees financieres", "montant des impayes"]),
      signal("update_date", ["date de derniere mise a jour"]),
      signal("works_fund", ["presence d'un fonds de travaux"]),
    ],
    majorStructures: [
      all("summary_sections", [
        "identification",
        "organisation juridique",
        "donnees financieres",
      ]),
      all("registered_copro", [
        "immatriculation",
        "nombre de lots",
        "exercice comptable",
      ]),
    ],
    secondaryStructures: [
      all("building_data", ["nombre de batiments", "lots d'habitation"]),
      all("procedure_data", ["impayes", "procedure", "fonds de travaux"]),
    ],
    negativeStrong: [
      signal("negative_certificate_only", ["certificat d'immatriculation"]),
      signal("negative_commercial_sheet", ["fiche immeuble commerciale"]),
    ],
    negativeWeak: [signal("negative_maintenance", ["carnet d'entretien"])],
    incompatible: [
      all("incompatible_registration_form", [
        "formulaire",
        "demande d'immatriculation",
      ]),
    ],
  },
  {
    type: "dtg",
    titleSignals: [
      signal("title_dtg", [
        "diagnostic technique global",
        "dtg de la copropriete",
      ]),
    ],
    strongExpressions: [
      signal("common_parts_condition", [
        "etat apparent des parties communes",
        "etat technique de l'immeuble",
      ]),
      signal("necessary_works", [
        "liste des travaux necessaires",
        "evaluation sommaire du cout",
      ]),
      signal("building_pathology", [
        "pathologies observees",
        "pathologie du batiment",
      ]),
    ],
    positiveKeywords: [
      signal("conservation", ["conservation de l'immeuble"]),
      signal("technical_management", ["gestion technique et patrimoniale"]),
      signal("study_office", ["bureau d'etudes", "thermicien"]),
      signal("work_priority", [
        "priorite urgente",
        "court terme",
        "moyen terme",
      ]),
      signal("energy_performance", ["performance energetique"]),
    ],
    majorStructures: [
      all("multi_component_inspection", [
        "facades",
        "toiture",
        "reseaux",
        "equipements communs",
      ]),
      all("pathology_recommendation", [
        "etat apparent",
        "travaux necessaires",
        "cout",
      ]),
    ],
    secondaryStructures: [
      all("site_visit", ["visite sur site", "photographies", "desordres"]),
      all("work_horizons", ["urgent", "court terme", "moyen terme"]),
    ],
    negativeStrong: [
      signal("negative_diagnostic_bundle", [
        "dossier de diagnostic technique",
        "dossier technique amiante",
      ]),
      signal("negative_quote", [
        "devis pour la realisation d'un dtg",
        "proposition commerciale dtg",
      ]),
    ],
    negativeWeak: [
      signal("negative_vote_only", [
        "decision d'engager un diagnostic technique global",
      ]),
    ],
    incompatible: [
      all("incompatible_individual_diagnostics", [
        "diagnostic plomb",
        "diagnostic termites",
      ]),
    ],
  },
  {
    type: "ppt",
    titleSignals: [
      signal("title_ppt", [
        "projet de plan pluriannuel de travaux",
        "plan pluriannuel de travaux",
        "pppt de la copropriete",
      ]),
    ],
    strongExpressions: [
      signal("ten_year_schedule", [
        "echeancier sur les dix prochaines annees",
        "programme de travaux sur dix ans",
      ]),
      signal("work_cost_estimate", [
        "estimation du cout des travaux",
        "estimation sommaire du cout",
      ]),
      signal("work_scenarios", ["scenario de travaux", "bouquet de travaux"]),
    ],
    positiveKeywords: [
      signal("prioritization", [
        "hierarchisation des travaux",
        "priorite 1",
        "priorite 2",
      ]),
      signal("building_safeguard", ["sauvegarde de l'immeuble"]),
      signal("occupant_safety", ["sante et securite des occupants"]),
      signal("energy_savings", [
        "economies d'energie",
        "emissions de gaz a effet de serre",
      ]),
      signal("adopted_plan", [
        "plan adopte",
        "adopte par l'assemblee generale",
      ]),
    ],
    majorStructures: [
      all("multi_year_costs", ["annee 1", "annee 5", "cout", "travaux"]),
      all("schedule_priorities", ["echeancier", "priorite", "estimation"]),
    ],
    secondaryStructures: [
      all("work_fund_plan", ["fonds travaux", "programme", "annee"]),
      all("energy_conservation", [
        "conservation",
        "performance energetique",
        "travaux",
      ]),
    ],
    negativeStrong: [
      signal("negative_site_schedule", [
        "planning de chantier",
        "plan d'installation de chantier",
      ]),
      signal("negative_single_quote", ["devis estimatif", "bon pour accord"]),
    ],
    negativeWeak: [
      signal("negative_resolution_only", ["resolution d'adoption du ppt"]),
    ],
    incompatible: [
      all("incompatible_single_project", [
        "date de debut du chantier",
        "date de reception des travaux",
      ]),
    ],
  },
  {
    type: "dpe_collectif",
    titleSignals: [
      signal("title_collective_dpe", [
        "diagnostic de performance energetique collectif",
        "dpe collectif",
        "dpe immeuble collectif",
        "diagnostic de performance energetique du batiment collectif",
      ]),
    ],
    strongExpressions: [
      signal("primary_energy", [
        "consommation conventionnelle d'energie primaire",
        "kwh ep/m2/an",
        "kwhep/m2/an",
      ]),
      signal("greenhouse_gas", [
        "emissions de gaz a effet de serre",
        "kg co2/m2/an",
      ]),
      signal("ademe_number", ["numero d'enregistrement ademe"]),
    ],
    positiveKeywords: [
      signal("energy_label", ["etiquette energie", "classe energetique"]),
      signal("climate_label", ["etiquette climat"]),
      signal("certified_assessor", ["diagnostiqueur certifie"]),
      signal("collective_systems", [
        "systemes collectifs de chauffage",
        "chauffage collectif",
      ]),
      signal("recommendations", ["recommandations d'amelioration energetique"]),
    ],
    majorStructures: [
      all("energy_climate_metrics", ["energie", "climat", "kwh", "co2"]),
      all("collective_scope", [
        "batiment collectif",
        "surface",
        "chauffage",
        "copropriete",
      ]),
    ],
    secondaryStructures: [
      all("valid_diagnosis", ["ademe", "date de validite", "diagnostiqueur"]),
      all("building_envelope", [
        "enveloppe",
        "isolation",
        "systemes collectifs",
      ]),
    ],
    negativeStrong: [
      signal("negative_individual", [
        "dpe individuel",
        "maison individuelle",
        "appartement individuel",
      ]),
      signal("negative_audit", ["audit energetique reglementaire"]),
    ],
    negativeWeak: [signal("negative_single_lot", ["logement n", "lot unique"])],
    incompatible: [
      all("incompatible_house", ["maison", "surface habitable du logement"]),
    ],
  },
];

export const OTHER_TITLE_SIGNALS: Signal[] = [
  signal("other_convocation", ["convocation a l'assemblee generale"]),
  signal("other_vote_form", ["formulaire de vote par correspondance"]),
  signal("other_invoice", ["facture n", "devis n"]),
  signal("other_contract", ["contrat de syndic"]),
  signal("other_individual_dpe", [
    "dpe individuel",
    "diagnostic de performance energetique appartement",
  ]),
  signal("other_internal_rules", ["reglement interieur de l'immeuble"]),
  signal("other_dated_statement", ["etat date mutation"]),
];
