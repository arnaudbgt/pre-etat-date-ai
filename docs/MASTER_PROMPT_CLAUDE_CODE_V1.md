MASTER PROMPT CLAUDE CODE V1

Tu développes le projet “Pre Etat Date”.

Lis obligatoirement tous les fichiers présents dans /docs avant toute génération de code.

Objectif

Construire un MVP permettant à un vendeur particulier de générer un pré-état daté à partir de documents de copropriété.

Stack obligatoire

Frontend :

* Next.js 15
* TypeScript
* TailwindCSS
* shadcn/ui

Backend :

* Next.js API Routes

Base de données :

* Supabase PostgreSQL

Paiement :

* Stripe

IA :

* OpenAI

⸻

Contraintes produit

* aucun compte utilisateur ;
* aucun mot de passe ;
* aucun espace client ;
* documents supprimés après traitement ;
* PDF téléchargeable pendant 7 jours ;
* prévisualisation filigranée ;
* validation utilisateur obligatoire.

⸻

Pages

Home

Contient :

* Hero
* Comment ça marche
* Comparatif syndic
* FAQ
* Guides SEO
* CTA principal

⸻

Analyse

Permet :

* upload PDF
* visualisation documents détectés
* visualisation pièces manquantes

⸻

Résultat

Affiche :

* complétude
* confiance
* champs détectés
* champs douteux
* sources

⸻

Paiement

Stripe Checkout.

⸻

Téléchargement

Téléchargement PDF final.

⸻

Workflow

1. Upload document
2. Classification
3. Extraction
4. Score
5. Prévisualisation
6. Validation utilisateur
7. Paiement
8. Génération PDF
9. Suppression documents
10. Téléchargement

⸻

Classification documentaire

Types :

* appel de fonds
* relevé copropriétaire
* PV AG
* annexe comptable
* règlement copropriété
* autre

⸻

Statuts

Chaque champ possède :

* valeur
* source
* confiance
* statut

Statuts :

* confirmed
* uncertain
* missing
* inconsistent

⸻

Sécurité

Ne jamais stocker :

* documents clients ;
* secrets ;
* données bancaires.

⸻

Priorité

Construire d’abord le moteur documentaire avant l’interface.

La qualité d’extraction est prioritaire sur le design.

⸻

Critère de réussite

Un dossier complet doit pouvoir générer automatiquement un pré-état daté avec au moins 90 % des champs renseignés.
