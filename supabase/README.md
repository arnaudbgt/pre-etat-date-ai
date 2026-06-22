# Base de données locale

Le Sprint 1 fournit uniquement le modèle PostgreSQL. Aucun client Supabase, bucket de stockage ou traitement métier n'est encore intégré.

## Prérequis

- Node.js 20 ou supérieur ;
- npm ;
- Docker Desktop démarré.

## Installation

```bash
npm install
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run db:types
```

`npm run db:start` affiche les clés locales à reporter dans `.env.local`. Ne jamais renseigner de vraie clé dans `.env.example` ni versionner `.env.local`.

Supabase Studio est accessible par défaut sur `http://127.0.0.1:54323`.

## Commandes

```bash
npm run db:status
npm run db:reset
npm run db:types
npm run db:stop
```

La migration est la source de vérité. Après chaque modification du schéma, réinitialiser la base locale puis régénérer `src/types/database.types.ts`.

## Sécurité

La RLS est activée sans politique pour `anon` ou `authenticated`. Les tables sont donc fermées aux accès publics. Une future API serveur utilisera la clé `service_role`, qui ne devra jamais être exposée au navigateur.

Les PDF sources ne sont pas enregistrés dans PostgreSQL. `documents.storage_path` est réservé à un futur chemin de stockage objet temporaire. Le texte OCR complet n'est pas conservé ; seul un extrait justificatif limité à 2 000 caractères peut accompagner une source.
