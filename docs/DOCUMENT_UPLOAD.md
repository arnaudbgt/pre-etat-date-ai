# Upload temporaire des documents

## Architecture

Les PDF sont envoyés directement par le navigateur vers le bucket privé Supabase Storage `source-documents`. Les routes Next.js ne reçoivent que du JSON et des métadonnées : aucun contenu PDF ne transite par Vercel.

Le chemin d'un objet suit le format :

```text
{project_id}/{document_id}/{nom-nettoye}.pdf
```

Le parcours est le suivant :

1. `POST /api/projects` crée un dossier et une session anonyme signée dans un cookie `HttpOnly` ;
2. la route `documents/sign` valide les métadonnées, crée la ligne `documents` et délivre un jeton d'upload signé ;
3. le navigateur vérifie la signature `%PDF-` puis transfère le fichier directement à Supabase Storage ;
4. la route `documents/confirm` vérifie la taille et le MIME exposés par Storage, sans télécharger le fichier ;
5. la ligne `documents` conserve uniquement les métadonnées et l'échéance de suppression.

Le bucket est privé, limité aux fichiers `application/pdf` et plafonné à 50 Mio. La limite applicative `MAX_PDF_SIZE_MB`, fixée à 10 Mio par défaut, ne peut pas dépasser ce plafond.

## Installation

```bash
npm install
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run dev
```

Reporter les clés fournies par `npm run db:status` dans `.env.local`. La page de dépôt est disponible sur `http://localhost:3000/analyse`.

## Variables d'environnement

| Variable | Visibilité | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Navigateur et serveur | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navigateur | Clé publique utilisée avec le jeton d'upload signé |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement | Accès aux tables, signatures et suppressions |
| `UPLOAD_SESSION_SECRET` | Serveur uniquement | Signature des sessions anonymes, 32 caractères minimum |
| `MAX_PDF_SIZE_MB` | Serveur | Taille maximale par PDF, 10 par défaut, 50 maximum |
| `MAX_PDF_FILES` | Serveur | Nombre maximal de documents actifs par dossier |
| `TEMP_UPLOAD_RETENTION_HOURS` | Serveur | Durée de conservation, 24 heures par défaut |
| `PURGE_BATCH_SIZE` | Serveur | Nombre maximal de lignes traitées par purge |
| `CRON_SECRET` | Serveur uniquement | Protection de la route de purge |

La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais utiliser le préfixe `NEXT_PUBLIC_`.

## Suppression automatique

Vercel appelle toutes les heures :

```text
GET /api/cron/purge-documents
Authorization: Bearer {CRON_SECRET}
```

La purge sélectionne les documents dont `auto_delete_after` est dépassé, supprime l'objet avec l'API Storage, puis marque la ligne comme supprimée. Elle accepte les objets déjà absents et ne met à jour que les lignes encore actives : une nouvelle exécution produit donc le même état final.

Pour tester manuellement la purge :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/purge-documents
```

## Tests manuels

1. Créer un dossier puis déposer un PDF valide par sélection de fichier.
2. Déposer plusieurs PDF simultanément par glisser-déposer.
3. Vérifier que le navigateur envoie le corps du PDF vers `/storage/v1/object/upload/sign/` sur le domaine Supabase, jamais vers `/api/`.
4. Refuser un fichier non PDF renommé en `.pdf` grâce à la vérification `%PDF-` côté navigateur.
5. Refuser un PDF qui dépasse `MAX_PDF_SIZE_MB`.
6. Refuser un lot qui dépasse `MAX_PDF_FILES`.
7. Vérifier que le bucket `source-documents` est privé dans Supabase Studio.
8. Vérifier que `documents` contient uniquement les métadonnées, le chemin privé et `auto_delete_after`.
9. Avancer `auto_delete_after`, appeler la purge et vérifier la disparition de l'objet ainsi que `processing_status = deleted`.
10. Appeler une seconde fois la purge et vérifier qu'elle réussit sans nouvelle modification.
11. Appeler les routes d'un autre projet sans son cookie et vérifier la réponse `401`.
12. Appeler la purge sans `CRON_SECRET` valide et vérifier la réponse `401`.

## Limites du Sprint 2

- La signature `%PDF-` est contrôlée dans le navigateur ; un client malveillant pourrait contourner ce contrôle. Le MIME et la taille restent imposés par le bucket et confirmés côté serveur.
- Aucune analyse antivirus n'est encore réalisée.
- L'upload standard Supabase n'affiche pas de progression détaillée et ne reprend pas un transfert interrompu. Supabase recommande un upload résumable au-delà de 6 Mio ; le plafond par défaut de 10 Mio pourra donc nécessiter cette évolution si les connexions lentes posent problème.
- La limite du nombre de fichiers est vérifiée applicativement ; des requêtes parfaitement concurrentes pourraient momentanément dépasser cette limite.
- La tâche Vercel traite un lot par exécution. Un retard important nécessitera plusieurs passages.
- La création des dossiers et la signature des uploads ne disposent pas encore de limitation de débit distribuée.
