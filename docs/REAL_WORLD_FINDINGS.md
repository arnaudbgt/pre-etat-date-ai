# Retours de tests sur dossiers réels

## 1. Objectif

Ce document sert à suivre les essais réalisés sur de vrais dossiers de copropriété, anonymisés ou conservés hors dépôt.

Il a trois fonctions :

- mesurer la qualité réelle du moteur sur des documents variés ;
- identifier les cas limites non couverts par les tests synthétiques ;
- prioriser les corrections à apporter aux moteurs de classification, extraction et cohérence.

Ce document ne doit jamais contenir de PDF source, de texte complet extrait, de données personnelles identifiantes, de coordonnées bancaires, d'adresses complètes non anonymisées ou de noms de copropriétaires réels.

## 2. Règles de confidentialité

### 2.1 Données autorisées

Peuvent être notés ici :

- un identifiant interne anonymisé de dossier ;
- le type de syndic ou logiciel si utile ;
- le nombre de documents testés ;
- les types documentaires présents ;
- les champs attendus, trouvés ou manquants ;
- des extraits très courts, anonymisés, uniquement si nécessaires à la compréhension d'un problème ;
- des scores, statuts et décisions du moteur.

### 2.2 Données interdites

Ne jamais inscrire :

- nom réel d'un vendeur ou copropriétaire ;
- adresse complète réelle ;
- numéro de compte copropriétaire réel ;
- IBAN, coordonnées bancaires ou référence de paiement ;
- texte OCR complet ;
- contenu complet d'une résolution, procédure ou annexe ;
- lien vers des PDF stockés dans un espace non sécurisé ;
- chemin local personnel contenant des informations sensibles.

### 2.3 Convention d'anonymisation

Utiliser des valeurs de substitution stables :

| Donnée réelle | Format anonymisé recommandé |
| --- | --- |
| Dossier | `RW-YYYY-NNN` |
| Copropriété | `Copropriété A`, `Copropriété B` |
| Vendeur | `Vendeur A` |
| Adresse | `Adresse immeuble A`, `Ville A` |
| Syndic | `Syndic réseau national`, `Syndic indépendant`, `Syndic bénévole` |
| Montant | conserver le montant seulement si nécessaire au test, sinon `montant A` |
| Date | conserver si utile au contrôle, sinon `date A` |

## 3. Protocole de test

### 3.1 Préparation du dossier

Pour chaque dossier réel :

1. attribuer un identifiant anonymisé ;
2. vérifier que les PDF ne seront pas commités ;
3. noter la liste des documents disponibles ;
4. identifier manuellement la vérité attendue pour les champs critiques ;
5. lancer l'upload et la classification ;
6. lancer l'extraction déterministe ;
7. lancer le moteur de cohérence ;
8. comparer les résultats moteur avec la vérité attendue ;
9. noter les écarts et corrections proposées.

### 3.2 Documents à couvrir

Essayer de tester progressivement :

- appel de fonds ;
- relevé copropriétaire ;
- procès-verbal d'assemblée générale ;
- annexes comptables ;
- règlement de copropriété ;
- fiche synthétique ;
- DTG ;
- PPT ;
- DPE collectif ;
- documents ambigus ou composites.

### 3.3 Vérification manuelle

Chaque champ contrôlé doit être comparé à une lecture humaine.

Notation recommandée :

- `OK` : valeur correcte, statut cohérent ;
- `PARTIAL` : valeur partiellement correcte ou trop peu contextualisée ;
- `WRONG` : valeur incorrecte ;
- `MISSING` : valeur présente dans le dossier mais non détectée ;
- `OVEREXTRACTED` : valeur inventée, extrapolée ou extraite hors contexte ;
- `NEEDS_REVIEW` : cas ambigu nécessitant arbitrage produit ou juridique.

## 4. Structure de notation

### 4.1 Échelle de qualité par champ

| Note | Signification | Exemple |
| --- | --- | --- |
| `A` | Exact et bien sourcé | champ confirmé avec source pertinente |
| `B` | Correct mais prudence nécessaire | valeur juste, statut `uncertain` acceptable |
| `C` | Partiel | valeur partielle, source ou contexte incomplet |
| `D` | Incorrect | mauvaise valeur ou mauvais document source |
| `E` | Dangereux | hallucination, extrapolation, interprétation juridique ou montant inventé |

### 4.2 Gravité d'un problème

| Gravité | Description | Action attendue |
| --- | --- | --- |
| `P0` | Risque bloquant ou dangereux | corriger avant tout usage réel |
| `P1` | Erreur sur champ critique | corriger au sprint suivant |
| `P2` | Erreur gênante mais contournable | planifier |
| `P3` | Amélioration de robustesse | backlog |

### 4.3 Catégories de problème

| Catégorie | Description |
| --- | --- |
| `classification` | type documentaire incorrect ou trop incertain |
| `text_layer` | PDF sans texte exploitable ou texte très dégradé |
| `simple_extraction` | erreur sur identification, syndic, dates simples |
| `financial_extraction` | erreur sur montants, signes, périodes ou libellés financiers |
| `complex_extraction` | erreur sur travaux, procédures, emprunt, PPT, DTG, DPE |
| `consistency` | mauvais statut global ou contradiction mal détectée |
| `source_quality` | source insuffisante, extrait peu utile ou mauvaise page |
| `field_catalog` | champ mal défini ou absent du catalogue |
| `ux_review` | besoin d'aide utilisateur ou wording de réserve |

## 5. Tableau par dossier

| Dossier | Date test | Origine / syndic | Documents testés | Documents classifiés | Champs contrôlés | Completion rate | Confidence score | Statut report | Résultat global | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| `RW-YYYY-001` | À compléter | À compléter | 0 | 0 | 0 | 0 | 0 | `draft` | À compléter | À compléter |

### Colonnes

- **Dossier** : identifiant anonymisé.
- **Date test** : date du test manuel.
- **Origine / syndic** : typologie anonymisée.
- **Documents testés** : nombre total de PDF utilisés.
- **Documents classifiés** : documents avec classification exploitable.
- **Champs contrôlés** : nombre de champs relus manuellement.
- **Completion rate** : score retourné par le moteur de cohérence.
- **Confidence score** : score retourné par le moteur de cohérence.
- **Statut report** : `draft`, `preview` ou `ready`.
- **Résultat global** : synthèse humaine courte.
- **Notes** : remarques anonymisées.

## 6. Tableau par champ

| Dossier | `field_id` | Valeur attendue anonymisée | Valeur moteur anonymisée | Statut moteur | Confidence | Source moteur | Note | Gravité | Problème | Correction proposée |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| `RW-YYYY-001` | `current_balance_amount` | À compléter | À compléter | `missing` | 0 | À compléter | À compléter | À compléter | À compléter | À compléter |

### Champs critiques à contrôler en priorité

| Priorité | Champs |
| --- | --- |
| Très importante | `property_address`, `seller_name`, `lot_number`, `current_balance_amount`, `unpaid_charges_amount`, `annual_budget_amount`, `works_fund_seller_share_amount`, `legal_proceedings_description`, `collective_loan` |
| Importante | `syndic_name`, `syndic_email`, `account_statement_date`, `current_quarter`, `budget_vote_date`, `ppt_status`, `dtg_status`, `collective_dpe_status` |
| Secondaire | `syndic_phone`, `syndic_manager`, `payment_method`, `seller_financial_comment` |

## 7. Métriques globales

À mettre à jour après chaque campagne de tests.

| Métrique | Valeur | Commentaire |
| --- | ---: | --- |
| Dossiers testés | 0 | À compléter |
| Documents testés | 0 | À compléter |
| Documents classifiés correctement | 0 | À compléter |
| Documents classifiés `uncertain` à juste titre | 0 | À compléter |
| Documents mal classifiés | 0 | À compléter |
| Champs contrôlés manuellement | 0 | À compléter |
| Champs exacts | 0 | À compléter |
| Champs partiels | 0 | À compléter |
| Champs incorrects | 0 | À compléter |
| Champs présents mais manqués | 0 | À compléter |
| Champs dangereux / extrapolés | 0 | Doit rester à 0 |
| Completion rate moyen | 0 | À compléter |
| Confidence score moyen | 0 | À compléter |

### Indicateurs dérivés

| Indicateur | Formule |
| --- | --- |
| Taux de classification correcte | documents classifiés correctement / documents testés |
| Taux d'extraction exacte | champs exacts / champs contrôlés |
| Taux de champs manqués | champs présents mais manqués / champs contrôlés |
| Taux d'erreurs critiques | problèmes `P0` + `P1` / champs contrôlés |
| Taux de danger | champs dangereux ou extrapolés / champs contrôlés |

## 8. Problèmes rencontrés

| ID | Date | Dossier | Catégorie | Gravité | Description anonymisée | Cause probable | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RW-PB-001` | À compléter | `RW-YYYY-001` | À compléter | À compléter | À compléter | À compléter | `open` |

### Statuts de suivi

| Statut | Signification |
| --- | --- |
| `open` | problème observé, non traité |
| `investigating` | analyse en cours |
| `planned` | correction décidée |
| `fixed` | correction implémentée |
| `verified` | correction vérifiée sur dossier réel |
| `wont_fix` | écart accepté ou hors périmètre |

## 9. Corrections à apporter au moteur

| ID | Priorité | Moteur concerné | Correction proposée | Critère d'acceptation | Tests à ajouter | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| `RW-FIX-001` | À compléter | À compléter | À compléter | À compléter | À compléter | `planned` |

### Types de corrections attendues

- ajouter un mot-clé positif ou négatif ;
- ajuster une pondération de classification ;
- ajouter une règle de contexte ;
- améliorer la normalisation d'une date, d'un montant ou d'une valeur contrôlée ;
- renforcer la détection de contradiction ;
- abaisser ou relever une confiance ;
- créer un nouveau test déterministe ;
- modifier le catalogue de champs si une ambiguïté produit revient souvent.

## 10. Journal de campagne

| Campagne | Période | Objectif | Dossiers inclus | Résultat | Décision |
| --- | --- | --- | --- | --- | --- |
| `RW-CAMP-001` | À compléter | Première lecture sur dossiers réels | À compléter | À compléter | À compléter |

## 11. Checklist avant correction

Avant de modifier le moteur à partir d'un retour réel :

- [ ] le dossier est anonymisé ou non commité ;
- [ ] le problème est reproductible ;
- [ ] le champ attendu est conforme à `FIELD_CATALOG.md` ;
- [ ] la règle ne crée pas d'extrapolation ;
- [ ] la correction n'oblige pas à stocker le texte complet ;
- [ ] la correction n'introduit pas d'interprétation juridique ;
- [ ] un test déterministe peut être ajouté ;
- [ ] la gravité est évaluée.

## 12. Décisions et arbitrages à suivre

| Sujet | Décision attendue | Impact | Statut |
| --- | --- | --- | --- |
| Gestion des documents composites | Définir s'il faut découper ou seulement signaler | Classification, extraction | À arbitrer |
| PDFs sans couche texte | Confirmer la stratégie avant OCR éventuel | Couverture réelle | À arbitrer |
| Champs non encore extraits | Prioriser les prochains champs déterministes | Completion rate | À arbitrer |
| Réserves visibles utilisateur | Définir wording et seuils de blocage | UX, PDF final | À arbitrer |

