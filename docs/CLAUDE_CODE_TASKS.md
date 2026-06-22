CLAUDE_CODE_TASKS

Version : MVP V1

Objectif : construire Pre Etat Date de manière incrémentale en validant les risques techniques le plus tôt possible.

⸻

Sprint 0 - Initialisation

Objectif

Créer le socle technique du projet.

Livrables

* Next.js 15
* TypeScript
* TailwindCSS
* shadcn/ui
* ESLint
* Prettier
* Supabase
* Stripe
* Variables d’environnement

Critères d’acceptation

* application démarre localement
* build production OK
* déploiement Vercel OK

⸻

Sprint 1 - Modèle de données

Objectif

Créer la structure de données du projet.

Tables

projects

* id
* email
* property_address
* status
* created_at

documents

* id
* project_id
* filename
* document_type
* processing_status
* created_at

extracted_fields

* id
* project_id
* field_id
* value
* confidence
* status
* source_document

reports

* id
* project_id
* completion_rate
* confidence_score
* pdf_url
* created_at

payments

* id
* project_id
* stripe_session_id
* amount
* status

Critères

Migration SQL complète.

⸻

Sprint 2 - Upload documentaire

Objectif

Permettre le dépôt de PDF.

Fonctionnalités

* drag and drop
* upload multiple
* validation taille
* validation format

Types acceptés

* PDF

Critères

* upload fonctionnel
* stockage temporaire

⸻

Sprint 3 - Classification documentaire

Objectif

Identifier automatiquement les documents.

Types

* appel de fonds
* relevé copropriétaire
* PV AG
* annexe comptable
* règlement copropriété
* autre

Résultat attendu

{
document_type,
confidence,
detected_syndic
}

Critères

Précision > 90 %

⸻

Sprint 4 - Extraction documentaire

Objectif

Extraire les informations utiles.

Champs prioritaires

Identification

* copropriété
* syndic
* adresse
* lots

Financier

* fonds travaux
* impayés
* solde vendeur
* provisions

Informations diverses

* DTG
* PPT
* DPE collectif
* procédures

Critères

Extraction JSON normalisée.

⸻

Sprint 5 - Moteur de confiance

Objectif

Qualifier chaque donnée.

Statuts

* confirmed
* uncertain
* missing
* inconsistent

Calcul

Confiance selon :

* nombre de sources
* cohérence
* qualité extraction

Affichage

Complétude :
XX %

Confiance :
XX %

⸻

Sprint 6 - Détection des pièces manquantes

Objectif

Assister l’utilisateur.

Exemple

Documents reçus :

* appel de fonds

Documents recommandés :

* relevé copropriétaire
* PV AG
* annexe comptable

⸻

Sprint 7 - Prévisualisation

Objectif

Afficher le résultat avant paiement.

Affichage

* score
* champs extraits
* champs douteux
* sources

PDF

Version filigranée :

PREVISUALISATION

NON VALIDEE

⸻

Sprint 8 - Validation utilisateur

Objectif

Réduire le risque juridique.

Fonctionnalités

Case obligatoire :

“Je confirme avoir vérifié les informations”

Journaliser :

* date
* heure
* adresse IP

⸻

Sprint 9 - Paiement Stripe

Objectif

Monétisation.

Prix MVP

19,90 €

Fonctionnalités

* Stripe Checkout
* webhook
* validation paiement

⸻

Sprint 10 - PDF final

Objectif

Produire le document final.

Contenu

* identification
* situation financière
* charges
* fonds travaux
* travaux votés
* procédures
* annexes

Contraintes

* sans filigrane
* génération immédiate

⸻

Sprint 11 - Email

Objectif

Livraison.

Email

Objet :

Votre pré-état daté est disponible

Contenu

Lien sécurisé

Valable 7 jours

⸻

Sprint 12 - Suppression automatique

Objectif

Respect du positionnement produit.

Règles

Documents sources :

suppression automatique après traitement

PDF :

conservation 7 jours

Données extraites :

conservation minimale nécessaire

⸻

Sprint 13 - Landing Page

Sections

Hero

Comment ça marche

Comparatif syndic

Pourquoi pas ChatGPT ?

FAQ

Guides

CTA

⸻

Sprint 14 - SEO

Guides

* Qu’est-ce qu’un pré-état daté ?
* Pré-état daté vs état daté
* Documents à fournir
* Coût du syndic
* Comment le faire soi-même

⸻

Sprint 15 - Mise en production

Vérifications

* Stripe
* Email
* PDF
* Upload
* Suppression automatique
* Logs
* Monitoring

Objectif

Premiers clients réels.
