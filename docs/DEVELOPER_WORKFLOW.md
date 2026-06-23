# Workflow développeur

Dernière mise à jour : 2026-06-23

## Principe

Le dépôt GitHub doit rester la source de vérité. Un nouveau développeur ou un nouveau thread ChatGPT doit pouvoir reprendre le projet sans relire l’historique conversationnel.

## Avant chaque sprint

1. Lire `PROJECT_STATUS.md`.
2. Lire `CHANGELOG.md`.
3. Lire les documents de référence utiles :
   - `docs/ARCHITECTURE.md`
   - `docs/DATA_MODEL.md`
   - `docs/EXTRACTION_CATALOG.md`
   - `docs/FIELD_CATALOG.md`
   - `docs/DOCUMENT_CLASSIFICATION_RULES.md`
   - `docs/DECISIONS.md`
4. Vérifier l’état du dépôt :

```bash
git status --short
```

5. Lancer les tests avant modification si le sprint touche au code :

```bash
npm run test
npm run typecheck
npm run lint
```

## Pendant un sprint

- Limiter les modifications au périmètre validé.
- Ne pas introduire OCR, IA, Stripe ou génération PDF sans décision explicite.
- Ne jamais stocker les PDF en base.
- Ne jamais stocker le texte complet extrait.
- Protéger les champs `manually_edited=true`.
- Ajouter ou mettre à jour les tests lorsque le comportement change.
- Ajouter une migration Supabase minimale si le schéma change.

## Après chaque sprint validé

Mettre à jour :

1. `PROJECT_STATUS.md`
2. `CHANGELOG.md`
3. `docs/ARCHITECTURE.md` si le flux technique change.
4. `docs/DATA_MODEL.md` si le schéma ou les colonnes importantes changent.
5. `docs/EXTRACTION_CATALOG.md` si les champs ou extracteurs changent.
6. `docs/DECISIONS.md` si une décision d’architecture a été prise.

Puis exécuter :

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Règle de documentation

Si une information importante n’existe que dans une conversation, elle n’est pas encore fiable. Elle doit être reportée dans le dépôt.

## Règle de commit

Avant tout commit :

- vérifier les fichiers modifiés ;
- vérifier qu’aucun PDF réel ou donnée personnelle n’est ajouté ;
- vérifier qu’aucune clé `.env` n’est commitée ;
- mentionner dans le message de commit le sprint ou la décision concernée.
