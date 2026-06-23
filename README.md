# Pre Etat Date AI

MVP de préparation de pré-état daté à partir de documents de copropriété.

Le dépôt est la source de vérité du projet. Pour reprendre le développement, lire d’abord [PROJECT_STATUS.md](./PROJECT_STATUS.md), puis [CHANGELOG.md](./CHANGELOG.md).

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Storage privé
- Vitest
- ESLint
- Prettier

## Prérequis

- Node.js 20 ou supérieur
- npm 10 ou supérieur
- Docker Desktop
- Supabase CLI, déjà déclaré dans les dépendances dev du projet

## Installation locale

```bash
npm install
cp .env.example .env.local
```

Remplir `.env.local` avec les valeurs Supabase locales, puis lancer la base.

## Supabase local

Démarrer Supabase :

```bash
npm run db:start
```

Afficher les URLs et clés locales :

```bash
npm run db:status
```

Appliquer les migrations :

```bash
npm run db:reset
```

Regénérer les types TypeScript après une migration :

```bash
npm run db:types
```

Arrêter Supabase :

```bash
npm run db:stop
```

## Variables d’environnement

Voir `.env.example`.

Variables principales :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPLOAD_SESSION_SECRET`
- `MAX_PDF_SIZE_MB`
- `MAX_PDF_FILES`
- `TEMP_UPLOAD_RETENTION_HOURS`
- `CLASSIFICATION_MAX_PAGES`
- `CLASSIFICATION_MAX_CHARACTERS`
- `CLASSIFICATION_MIN_CHARACTERS`
- `CRON_SECRET`

La clé `SUPABASE_SERVICE_ROLE_KEY` doit rester strictement côté serveur.

## Lancement

```bash
npm run dev
```

Application :

- Upload : `http://localhost:3000/analyse`
- Debug projet : `http://localhost:3000/analyse/debug/{projectId}`

## Tests

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Format :

```bash
npm run format:check
npm run format
```

## Workflow développeur

Avant chaque sprint :

1. Lire [PROJECT_STATUS.md](./PROJECT_STATUS.md).
2. Lire [CHANGELOG.md](./CHANGELOG.md).
3. Lire les documents utiles dans `docs/`.
4. Vérifier l’état Git.
5. Lancer les tests si le sprint touche au code.

Après chaque sprint validé :

1. Mettre à jour `PROJECT_STATUS.md`.
2. Mettre à jour `CHANGELOG.md`.
3. Mettre à jour `docs/ARCHITECTURE.md` si nécessaire.
4. Mettre à jour `docs/DATA_MODEL.md` si nécessaire.
5. Mettre à jour `docs/EXTRACTION_CATALOG.md` si nécessaire.
6. Mettre à jour `docs/DECISIONS.md` si une décision a été prise.

Voir [docs/DEVELOPER_WORKFLOW.md](./docs/DEVELOPER_WORKFLOW.md).

## Documentation principale

- [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md)
- [docs/EXTRACTION_CATALOG.md](./docs/EXTRACTION_CATALOG.md)
- [docs/DECISIONS.md](./docs/DECISIONS.md)
- [docs/FIELD_CATALOG.md](./docs/FIELD_CATALOG.md)
- [docs/DOCUMENT_CLASSIFICATION_RULES.md](./docs/DOCUMENT_CLASSIFICATION_RULES.md)

## Contraintes importantes

- Aucun PDF source en base.
- Aucun texte complet extrait en base ou dans les logs.
- Bucket Storage privé.
- Service role uniquement côté serveur.
- Pas d’OCR dans l’état actuel.
- Pas d’OpenAI dans l’état actuel.
- Pas de Stripe intégré dans l’état actuel.
- Les champs `manually_edited=true` ne doivent jamais être écrasés.
