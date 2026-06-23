# Changelog

Toutes les évolutions notables du projet sont documentées ici.

## Unreleased

- Documentation projet persistante : statut, architecture, modèle de données, catalogue d’extraction, décisions et workflow développeur.

## Sprint 6

Date : 2026-06-23

Fonctionnalités :

- Page `/analyse/resultat/[projectId]`.
- Synthèse du score dossier.
- Sections métier du pré-état daté.
- Affichage des champs avec valeur, statut, confiance et source.
- Actions Modifier/Valider via les routes Sprint 5.3.
- Champs virtuels affichés comme manquants sans action.
- Section Documents manquants ou recommandés via Sprint 5.6.

Tests :

- Sections métier.
- Libellés de statuts utilisateur.
- Présence et protection session de la route résultat.
- Loader lecture seule sans PDF, classification, extraction ou cohérence.
- Réutilisation des actions Sprint 5.3.

Migrations :

- Aucune.

## Sprint 5.6

Date : 2026-06-23

Fonctionnalités :

- Rapport de couverture documentaire dans `/analyse/debug/[projectId]`.
- Section `Documents manquants ou recommandés`.
- Recommandation par champ `missing` : document prioritaire, alternatives, raison.
- Distinction entre document prioritaire absent et document présent mais champ non extrait.
- Logique pure `src/lib/coverage/document-coverage.ts`.

Tests :

- Recommandations pour budget annuel, solde vendeur, fonds travaux, DPE collectif, DTG et PPT.
- Filtrage limité aux champs `missing`.
- Détection d’un document prioritaire déjà présent.
- Prise en compte de `document_type_override`.
- Fallback stable pour champ non mappé.

Migrations :

- Aucune.

## Sprint 5.5

Date : 2026-06-23

Fonctionnalités :

- Runner local `npm run test:real-world`.
- Scénarios de tests réels locaux dans `test-data/real-world/scenarios.json`.
- Exemple versionné `test-data/real-world/scenarios.example.json`.
- Upload des PDF dans Supabase Storage local.
- Exécution du pipeline classification, extraction et cohérence.
- Comparaison des classifications et champs attendus.
- Génération de rapports JSON et Markdown dans `test-results/`.

Tests :

- Vérification de la commande npm.
- Vérification des règles `.gitignore`.
- Vérification du format de scénario exemple.
- Vérification que le script ne loggue pas le texte PDF complet.

Migrations :

- Aucune.

## Sprint 5.4

Date : 2026-06-23

Fonctionnalités :

- Diagnostic avancé par champ dans la vue debug.
- Ajout de `candidate_count`, `best_candidate_confidence`, `best_candidate_rule`, `failure_stage`, `rejection_reason`.
- Raisons courtes et déterministes pour les champs `missing`, `uncertain` et `inconsistent`.
- Détection diagnostique des champs non implémentés, documents non pertinents, libellés/montants/dates absents, normalisation impossible, candidats sous seuil, merge rejeté et protection manuelle.

Tests :

- Diagnostic `manual_protected`.
- Diagnostic `not_implemented`.
- Diagnostic `document_type_gate`.
- Diagnostics `label_not_found`, `amount_not_found`, `date_not_found`.
- Diagnostic `normalization_failed`.
- Diagnostic `candidate_below_threshold`.
- Diagnostic `merge_rejected`.
- Affichage de `best_candidate_rule` dans la vue debug.

Migrations :

- Aucune.

## Sprint 5.3

Date : 2026-06-23

Fonctionnalités :

- Correction manuelle des champs extraits depuis `/analyse/debug/[projectId]`.
- Validation explicite d’un champ sans modification.
- Origine de champ : `automatic`, `manual`, `validated`.
- Recalcul de cohérence projet après correction ou validation.
- Conservation des sources automatiques existantes.

Tests :

- Service de correction/validation manuelle.
- Protection des champs `manually_edited=true`.
- Vérification que les sources ne sont pas supprimées.

Migrations :

- `20260623110000_manual_field_validation.sql`
- Ajout de `extracted_fields.edited_by_user_at`.
- Ajout de `extracted_fields.field_origin`.

## Sprint 5.2

Date : 2026-06-23

Fonctionnalités :

- Amélioration de la sélection des dates d’AG.
- Support de blocs Foncia pour syndic, gestionnaire et adresse immeuble.
- Règles négatives fortes pour éviter la sélection d’un email copropriétaire comme `syndic_email`.
- Ajout de diagnostics de candidats dans la page debug.

Tests :

- Cas Foncia `syndic_email` avec email client et email agence.
- Diagnostic de candidats.

Migrations :

- Aucune migration dédiée.

## Sprint 5.1

Date : 2026-06-23

Fonctionnalités :

- Page debug projet `/analyse/debug/[projectId]`.
- Vue documents, champs, sources et rapport.
- Correction manuelle du type documentaire.
- Type effectif calculé par `document_type_override ?? document_type`.
- Retraitement du document corrigé puis recalcul de cohérence projet.

Tests :

- Override manuel du type documentaire.
- Persistance du type forcé.
- Relance extraction/cohérence.
- Protection des champs manuels.

Migrations :

- `20260623100000_document_type_manual_override.sql`
- Ajout de `documents.document_type_override`.
- Ajout de `documents.is_document_type_manual`.

## Sprint 5

Date : 2026-06-23

Fonctionnalités :

- Moteur de cohérence global.
- Statuts `confirmed`, `uncertain`, `missing`, `inconsistent`.
- Score de complétude et score de confiance pondéré.
- Mise à jour de `reports.completion_rate`, `reports.confidence_score`, `reports.status`.

Tests :

- Sources concordantes.
- Sources contradictoires.
- Champs manquants.
- Champs manuels protégés.
- Pondération des champs importants.
- Documents non classifiés ou `insufficient_text`.

Migrations :

- Aucune migration dédiée dans le sprint, les colonnes `reports` existaient déjà.

## Sprint 4C

Date : 2026-06-23

Fonctionnalités :

- Extraction déterministe des travaux votés.
- Extraction factuelle des procédures.
- Détection de l’emprunt collectif.
- Détection des statuts PPT, DTG et DPE collectif.

Tests :

- Travaux avec/sans montant.
- Travaux futurs et non appelés.
- Procédures.
- Emprunt collectif oui/non.
- Statuts PPT, DTG, DPE.
- Contradictions et protection manuelle.

Migrations :

- Aucune migration dédiée.

## Sprint 4B

Date : 2026-06-23

Fonctionnalités :

- Extraction financière déterministe.
- Soldes, impayés, avances, budget, fonds travaux.
- Support des formats monétaires français.
- Gestion prudente débiteur/créditeur.

Tests :

- Solde débiteur/créditeur.
- Impayés à zéro.
- Fonds travaux.
- Budget annuel voté.
- Montants français et slashs OCR.
- Contradictions et champs manuels protégés.

Migrations :

- Aucune migration dédiée.

## Sprint 4A

Date : 2026-06-23

Fonctionnalités :

- Extraction déterministe des informations simples.
- Ajout de `extraction_version`.
- Ajout de `matched_rule`.
- Limitation de `source_excerpt` à 200 caractères.

Tests :

- Syndic contradictoire.
- Adresses différentes.
- Mandat avec une seule date.
- Document incertain.
- Protection des champs manuels.

Migrations :

- `20260622180000_simple_field_extraction.sql`
- Ajout de `extracted_fields.extraction_version`.
- Ajout de `extracted_field_sources.matched_rule`.
- Contrainte `source_excerpt <= 200`.

## Sprint 3.5

Date : 2026-06-23

Fonctionnalités :

- Extraction PDF côté serveur Node.js.
- Diagnostic technique d’extraction PDF.
- Métriques de classification.
- Renforcement des signaux `appel_de_fonds`.
- Correction de l’incompatibilité PDF.js côté navigateur.

Tests :

- Flow Storage vers extraction serveur puis classification.
- Vérification du build legacy PDF.js côté serveur.
- Cas PDF texte, PDF image et erreur d’extraction.

Migrations :

- Aucune migration dédiée.

## Sprint 3

Date : 2026-06-22

Fonctionnalités :

- Classification documentaire déterministe.
- Persistance du statut et des détails de classification.
- Gestion `insufficient_text`.
- Limites de pages et caractères analysés.

Tests :

- Classification par règles.
- Documents ambigus.
- Cas sans texte exploitable.

Migrations :

- `20260622170000_document_classification.sql`
- Ajout de `classification_status`, `classification_version`, `classification_details`, `classified_at`.
- Extension de l’enum `document_type`.

## Sprint 2

Date : 2026-06-22

Fonctionnalités :

- Upload PDF direct vers Supabase Storage privé.
- Upload multiple.
- Validation MIME et signature `%PDF-`.
- Association à un projet.
- Purge automatique idempotente.

Tests :

- Upload direct.
- Limites taille/nombre.
- Bucket privé.
- Route de purge.

Migrations :

- `20260622160000_source_documents_bucket.sql`

## Sprint 1

Date : 2026-06-22

Fonctionnalités :

- Modèle de données initial Supabase PostgreSQL.
- RLS activée sans politique publique.
- Tables `projects`, `documents`, `extracted_fields`, `extracted_field_sources`, `reports`, `payments`.

Tests :

- Vérifications SQL et types TypeScript.

Migrations :

- `20260622150000_initial_schema.sql`
- `20260623090000_service_role_public_table_grants.sql`
