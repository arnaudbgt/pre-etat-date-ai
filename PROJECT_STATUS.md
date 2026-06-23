# Pré-État Daté AI

Dernière mise à jour : 2026-06-23

## Vision du projet

Pré-État Daté AI est un MVP destiné à aider un vendeur particulier à préparer un pré-état daté à partir de documents de copropriété déjà en sa possession.

Le produit n’est pas positionné comme un simple prompt IA. La valeur recherchée est un moteur spécialisé copropriété capable de reconnaître les documents, extraire des champs, conserver les sources, signaler les incertitudes et préparer une validation utilisateur avant toute génération finale.

## Architecture

- Frontend : Next.js 15, React 19, TypeScript, Tailwind CSS.
- Backend : Next.js App Router et API routes en runtime Node.js lorsque nécessaire.
- Base : Supabase PostgreSQL local/prod.
- Stockage : Supabase Storage privé pour les PDF sources temporaires.
- Extraction PDF : côté serveur Node.js avec `pdfjs-dist/legacy`, sans OCR.
- Classification : règles déterministes, mots-clés et heuristiques métier.
- Extraction : moteurs déterministes séparés pour champs simples, financiers et complexes.
- Cohérence : moteur de scoring projet basé sur `extracted_fields`, `extracted_field_sources` et `documents`.
- Debug : page `/analyse/debug/[projectId]` pour audit, override documentaire et correction manuelle de champs.

## Sprints réalisés

### Sprint 3

Classification documentaire déterministe des PDF uploadés.

- Types supportés : `appel_de_fonds`, `releve_coproprietaire`, `pv_ag`, `annexe_comptable`, `reglement_copropriete`, `fiche_synthetique`, `dtg`, `ppt`, `dpe_collectif`, `other`.
- Persistance dans `documents.document_type`, `classification_status`, `classification_confidence`, `classification_version`, `classification_details`.
- Aucun OpenAI, aucun OCR, aucun texte complet stocké.

### Sprint 3.5

Correctifs terrain sur l’extraction PDF et la classification.

- Extraction texte déplacée côté serveur Node.js.
- Téléchargement temporaire du PDF depuis Supabase Storage privé après upload direct.
- Métriques ajoutées : `totalPages`, `extractedCharacters`, `usefulCharacters`, `analyzedPages`, `classificationDurationMs`, `pdf_has_text_layer`.
- Distinction entre erreur technique d’extraction et PDF image/texte non exploitable.
- Renforcement des signaux `appel_de_fonds`.

### Sprint 4A

Extraction déterministe des champs simples peu ambigus.

- Champs syndic, adresse immeuble, dates d’AG et mandat syndic.
- Sources conservées dans `extracted_field_sources`.
- `source_excerpt` limité à 200 caractères.
- Protection des champs `manually_edited=true`.

### Sprint 4B

Extraction financière déterministe.

- Soldes, impayés, avances, budget, trimestre courant, fonds travaux.
- Support des formats français de montants, y compris espaces et slashs OCR.
- Interprétation prudente débiteur/créditeur.
- Aucun calcul extrapolé, aucune addition implicite.

### Sprint 4C

Extraction complexe déterministe.

- Travaux votés, futurs appels, travaux non appelés.
- Procédures factuelles.
- Emprunt collectif.
- Statuts PPT, DTG et DPE collectif.
- Aucune interprétation juridique.

### Sprint 5

Moteur de cohérence et confiance globale.

- Statuts recalculés : `confirmed`, `uncertain`, `missing`, `inconsistent`.
- Score global : complétude, confiance pondérée, compteurs par statut.
- Mise à jour de `reports.completion_rate`, `reports.confidence_score`, `reports.status`.
- Champs manuels inclus dans les scores mais jamais écrasés.

### Sprint 5.1

Page debug projet et override manuel du type documentaire.

- Page `/analyse/debug/[projectId]`.
- Affichage documents, champs, sources et rapport.
- Ajout de `documents.document_type_override` et `documents.is_document_type_manual`.
- Type effectif calculé : `document_type_override ?? document_type`.
- Retraitement limité au document corrigé, puis cohérence projet.

### Sprint 5.2

Amélioration terrain Foncia et diagnostic de candidats.

- Sélection de date AG améliorée : priorité aux titres de PV plutôt qu’aux dates de courrier.
- Blocs Foncia : `VOTRE AGENCE FONCIA`, `VOTRE GESTIONNAIRE`, résidence/adresse.
- Règles négatives fortes pour `syndic_email` afin d’éviter les emails copropriétaire/espace client.
- Debug enrichi : `candidate_count`, `best_candidate_confidence`, `failure_stage`, `rejection_reason`, `selected_candidate`, `rejected_candidates`.

### Sprint 5.3

Validation et correction manuelle des champs extraits.

- Actions `Modifier` et `Valider` dans la page debug.
- Routes :
  - `POST /api/projects/[projectId]/fields/[fieldId]/update`
  - `POST /api/projects/[projectId]/fields/[fieldId]/validate`
- Ajout de `extracted_fields.field_origin` : `automatic`, `manual`, `validated`.
- Ajout de `extracted_fields.edited_by_user_at`.
- Les sources automatiques restent conservées.
- Après correction/validation, seule la cohérence Sprint 5 est relancée.

## Fonctionnalités disponibles

- Création de projet anonyme.
- Upload multiple PDF par drag & drop.
- Upload direct vers Supabase Storage privé, sans transit du PDF par Vercel pendant l’upload.
- Confirmation serveur des documents.
- Purge automatique prévue via `/api/cron/purge-documents`.
- Extraction texte PDF côté serveur.
- Classification documentaire déterministe.
- Extraction déterministe simple, financière et complexe.
- Consolidation des champs et conservation des sources.
- Moteur de cohérence et score global.
- Page debug projet.
- Override manuel du type documentaire.
- Correction ou validation manuelle des champs.

## Fonctionnalités prévues

- Interface métier utilisateur hors debug.
- Prévisualisation du pré-état daté.
- Génération PDF finale.
- Paiement Stripe.
- Livraison par lien temporaire.
- Validation utilisateur finale avant PDF.
- Éventuel OCR ou IA générative seulement après décision explicite.

## Contraintes

- Ne jamais stocker les PDF sources en base.
- Ne jamais stocker le texte PDF complet en base ou dans les logs.
- `SUPABASE_SERVICE_ROLE_KEY` strictement côté serveur.
- Bucket Supabase Storage privé.
- Pas d’OCR dans l’état actuel.
- Pas d’OpenAI dans l’état actuel.
- Pas de Stripe intégré dans l’état actuel.
- `source_excerpt` limité à 200 caractères depuis Sprint 4A.
- Les champs `manually_edited=true` ne doivent jamais être écrasés par les extracteurs ou la cohérence.
- Les décisions juridiques restent à la charge de l’utilisateur ; le moteur conserve des formulations factuelles.

## Commandes utiles

Installation :

```bash
npm install
cp .env.example .env.local
```

Démarrage :

```bash
npm run db:start
npm run db:reset
npm run dev
```

Tests et qualité :

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run format:check
```

Supabase :

```bash
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run db:stop
```

## Structure du projet

```text
src/app/analyse/                         Pages upload et debug
src/app/api/projects/                    Routes projet, documents, cohérence, champs
src/app/api/cron/                        Purge documents temporaires
src/components/debug/                    UI de diagnostic
src/lib/classification/                  Classification documentaire
src/lib/consistency/                     Moteur de cohérence et scoring
src/lib/debug/                           Agrégation des données debug
src/lib/documents/                       Types documentaires et overrides
src/lib/extraction/simple/               Extracteurs déterministes 4A/4B/4C
src/lib/fields/                          Correction et validation manuelle
src/lib/pdf/                             Extraction texte PDF
src/lib/supabase/                        Clients Supabase
src/lib/upload/                          Validation upload et sessions
supabase/migrations/                     Schéma PostgreSQL et Storage
tests/                                   Tests unitaires et intégration légère
docs/                                    Documentation produit et technique
```

## Prochain sprint recommandé

Construire l’interface métier de revue des champs, en réutilisant la logique Sprint 5.3 déjà présente dans la page debug, sans encore générer le PDF final.
