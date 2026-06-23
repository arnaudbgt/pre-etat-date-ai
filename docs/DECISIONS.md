# Journal des décisions d’architecture

Dernière mise à jour : 2026-06-23

## 2026-06-22

Décision :
Pas d’espace client dans le MVP.

Contexte :
Le MVP cible un tunnel simple : upload, analyse, vérification, paiement futur, téléchargement.

Alternatives :

- Créer un compte utilisateur complet.
- Créer un espace historique multi-dossiers.

Motif :
Réduire le temps de développement et éviter la complexité authentification/profil tant que le produit n’est pas validé.

## 2026-06-22

Décision :
Prévoir la suppression automatique des documents.

Contexte :
Les PDF contiennent potentiellement des données personnelles et financières.

Alternatives :

- Conservation longue durée.
- Suppression manuelle uniquement.

Motif :
Limiter le risque RGPD et renforcer le positionnement de confiance.

## 2026-06-22

Décision :
Stocker les PDF sources dans Supabase Storage privé, pas dans PostgreSQL.

Contexte :
Le Sprint 2 introduit l’upload temporaire de documents PDF.

Alternatives :

- Stockage binaire en base.
- Transit complet par les routes Next.js.
- Bucket public avec URLs non signées.

Motif :
Préserver les performances, garder un bucket privé et éviter de transformer PostgreSQL en stockage documentaire.

## 2026-06-22

Décision :
Activer RLS sans politique publique.

Contexte :
Les routes serveur utilisent la clé `service_role`. Le MVP ne prévoit pas encore d’espace utilisateur authentifié.

Alternatives :

- Politiques publiques anonymes.
- Accès direct client aux tables.

Motif :
Ne pas exposer les données des dossiers à l’API publique. Les accès navigateur passent par des routes serveur ou des URLs Storage signées.

## 2026-06-23

Décision :
Ne pas utiliser d’OCR dans les sprints actuels.

Contexte :
Les premiers sprints valident la chaîne upload, extraction texte, classification, extraction et cohérence.

Alternatives :

- Ajouter OCR navigateur.
- Ajouter OCR serveur.
- Ajouter un service externe.

Motif :
Limiter les dépendances, les coûts, les temps de traitement et les risques de confidentialité. Les PDF image sont signalés comme texte non exploitable.

## 2026-06-23

Décision :
Ne pas utiliser d’IA générative pour l’extraction actuelle.

Contexte :
Les Sprints 3 à 5 doivent produire un moteur explicable et auditable.

Alternatives :

- OpenAI pour classer.
- OpenAI pour extraire tous les champs.
- Hybridation immédiate règles + IA.

Motif :
Commencer par des règles déterministes permet de maîtriser les sources, les scores, les erreurs et la conformité. L’IA reste une option future, à décider explicitement.

## 2026-06-23

Décision :
Déplacer l’extraction PDF côté serveur Node.js.

Contexte :
PDF.js échouait côté navigateur Safari avec une erreur liée à `ReadableStream`, alors que l’extraction locale fonctionnait.

Alternatives :

- Corriger uniquement le worker navigateur.
- Utiliser un autre parseur côté navigateur.
- Ajouter OCR.

Motif :
L’extraction serveur Node.js est plus stable, évite d’exposer le PDF après upload et conserve le flux direct navigateur vers Supabase Storage.

## 2026-06-23

Décision :
Ne jamais stocker le texte complet extrait.

Contexte :
Le moteur a besoin de texte temporaire pour classifier et extraire, mais les documents peuvent contenir des données personnelles.

Alternatives :

- Stocker le texte complet pour debug.
- Stocker le texte complet pour retraitement.

Motif :
Réduire fortement le risque de fuite de données. Seuls les scores, métriques et extraits courts utiles à l’audit sont conservés.

## 2026-06-23

Décision :
Limiter `source_excerpt` à 200 caractères.

Contexte :
Les sources doivent permettre l’audit sans devenir un stockage OCR déguisé.

Alternatives :

- 2 000 caractères.
- Texte de page complet.
- Aucun extrait.

Motif :
200 caractères suffisent généralement à contextualiser une règle déclenchée tout en limitant l’exposition de données.

## 2026-06-23

Décision :
Protéger les champs `manually_edited=true`.

Contexte :
L’utilisateur doit pouvoir corriger ou valider une valeur sans que les extracteurs la remplacent ensuite.

Alternatives :

- Recalculer tous les champs à chaque extraction.
- Écraser les champs manuels si le score automatique est meilleur.

Motif :
La correction utilisateur est prioritaire. Les sources automatiques restent conservées pour audit, mais la valeur canonique manuelle est protégée.

## 2026-06-23

Décision :
Ne jamais écraser `documents.document_type` lors d’une correction manuelle.

Contexte :
Sprint 5.1 introduit l’override du type documentaire.

Alternatives :

- Remplacer directement `document_type`.
- Ajouter une table d’audit.

Motif :
Conserver le type automatique permet d’auditer le moteur. Le type utilisé par les extracteurs est calculé par `document_type_override ?? document_type`.

## 2026-06-23

Décision :
Relancer uniquement la cohérence après correction ou validation manuelle d’un champ.

Contexte :
Sprint 5.3 introduit la correction manuelle des champs.

Alternatives :

- Retraiter tous les PDF.
- Relancer classification et extraction.

Motif :
Une correction de champ ne modifie pas les documents ni les sources. La seule étape nécessaire est le recalcul des scores et du statut rapport.
