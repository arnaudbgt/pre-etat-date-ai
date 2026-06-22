# Catalogue des champs du pré-état daté

## 1. Objectif du catalogue

Ce catalogue définit le contrat fonctionnel des données que les futurs sprints devront extraire, rapprocher, afficher et intégrer au pré-état daté.

Il sert à :

- stabiliser les identifiants techniques avant l'extraction ;
- distinguer les valeurs brutes, normalisées et validées ;
- associer chaque champ à ses documents sources probables ;
- préciser les règles minimales d'extraction et de contrôle ;
- anticiper les champs douteux, manquants ou incohérents ;
- guider l'interface de vérification et la génération du PDF ;
- préparer le stockage dans `extracted_fields` et `extracted_field_sources`.

Le catalogue définit des exigences produit, pas une qualification juridique. Le caractère « obligatoire » signifie obligatoire pour le document produit par le MVP, sous réserve de validation du PRD et d'une revue juridique ultérieure.

### Sources utilisées

Le catalogue est fondé sur :

- `PROJECT_MEMORY.md` : provenance, confiance, validation utilisateur et informations prioritaires ;
- `DOCUMENT_CLASSIFICATION_RULES.md` : classes documentaires et indices disponibles ;
- `UI_UX_GUIDELINES.md` : statuts Confirmé, Douteux, Manquant et Incohérent ;
- `DATABASE_SCHEMA.md` : représentation des valeurs, sources et modifications manuelles ;
- la liste minimale de champs fournie avec la demande de création du présent document.

`docs/PRD-v1.md` est cité comme source de vérité attendue, mais ce fichier n'existe pas dans le dépôt à la date de rédaction. Les points qui nécessitent son arbitrage sont regroupés en fin de document.

## 2. Convention de nommage des `field_id`

### 2.1 Format

- `snake_case` ASCII uniquement ;
- nom stable, descriptif et indépendant du libellé visible ;
- aucune numérotation ni version dans l'identifiant ;
- pas de préfixe de section, la section étant stockée séparément ;
- unités absentes de l'identifiant lorsque le type les impose ;
- suffixe `_amount` pour un montant monétaire ;
- suffixe `_date`, `_start` ou `_end` pour les dates ;
- suffixe `_status` pour une valeur contrôlée ;
- suffixe `_percentage` pour un pourcentage ;
- nom pluriel pour une liste d'objets.

Les identifiants imposés par le besoin sont conservés, notamment `seller_name`, `lot_number`, `last_ago_date` et `last_age_date`.

### 2.2 Types autorisés

| Type | Représentation attendue |
| --- | --- |
| `text` | Chaîne UTF-8 normalisée, valeur brute conservée dans la source |
| `number` | Nombre décimal sans unité dans la valeur |
| `amount` | Montant décimal en euros, jamais un entier en centimes dans `normalized_value` |
| `date` | Date ISO `YYYY-MM-DD`, sans inventer le jour ou le mois manquant |
| `boolean` | `true`, `false` ou absence ; aucune déduction à partir du silence d'un document |
| `list` | Tableau ordonné de chaînes ou d'objets homogènes |
| `object` | Objet structuré conforme au contrat décrit dans ce catalogue |

### 2.3 Niveaux de présence

- **Obligatoire** : nécessaire à la production finale du MVP ; en l'absence de valeur, la finalisation est bloquée jusqu'à saisie ou arbitrage explicite.
- **Recommandé** : attendu lorsque la source existe ; en l'absence de valeur, le champ reste `missing` et l'utilisateur doit confirmer la réserve.
- **Optionnel** : enrichit le document ; en l'absence de valeur, il est omis ou présenté comme non communiqué sans bloquer.

### 2.4 Risque

- **Faible** : erreur facilement visible, impact limité ou information descriptive.
- **Moyen** : erreur susceptible d'altérer la compréhension du dossier ou une période de référence.
- **Élevé** : identité, lot, dette, montant, travaux, procédure ou emprunt pouvant modifier sensiblement le document final.

### 2.5 Règles transversales d'extraction

1. Conserver la valeur brute et la source avant toute normalisation.
2. Ne jamais transformer une absence en zéro, `false` ou « néant ».
3. Associer les montants à leur libellé, leur date, leur période et leur signe.
4. Conserver le signe comptable original avant de produire une interprétation débiteur/créditeur.
5. Croiser plusieurs sources ; une correction utilisateur ne supprime pas la provenance initiale.
6. Si deux sources contemporaines se contredisent, utiliser `inconsistent`, jamais la valeur la plus élevée ou la plus récente sans règle explicite.
7. Si une lecture est plausible mais insuffisamment fiable, utiliser `uncertain`.
8. Toute valeur saisie ou corrigée par l'utilisateur doit porter `manually_edited = true`.
9. Un document composite ne vaut comme source que pour les pages où le champ apparaît réellement.
10. Les extraits justificatifs restent courts ; le texte OCR complet n'est pas conservé.

### 2.6 Abréviations des sources

| Code | Document |
| --- | --- |
| `AF` | `appel_de_fonds` |
| `RC` | `releve_coproprietaire` |
| `PV` | `pv_ag` |
| `AC` | `annexe_comptable` |
| `RCP` | `reglement_copropriete` |
| `FS` | `fiche_synthetique` |
| `DTG` | `dtg` |
| `PPT` | `ppt` |
| `DPE` | `dpe_collectif` |
| `USER` | saisie ou validation directe de l'utilisateur |

## 3. Catalogue détaillé

Dans chaque sous-section, la valeur de `section` de tous les champs correspond exactement au titre technique indiqué.

### 3.1 `identification_vendeur`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `date_etablissement` | Date d'établissement | `date` | Obligatoire | USER, date de génération | établi le, date d'établissement | Utiliser la date choisie au moment de la validation finale ; ne pas confondre avec la date d'un document source. | Moyen | Bloquer la finalisation et proposer la date du jour, à confirmer. |
| `lieu_etablissement` | Lieu d'établissement | `text` | Recommandé | USER | fait à, établi à, lieu | Saisie utilisateur ; normaliser commune et code postal sans géocodage automatique. | Faible | Afficher « Non renseigné » et demander confirmation. |
| `seller_name` | Nom du vendeur | `text` | Obligatoire | AF, RC, USER | copropriétaire, destinataire, monsieur, madame, indivision, SCI | Extraire le destinataire propriétaire ; conserver tous les cotitulaires dans l'ordre ; ne pas déduire depuis l'email. | Élevé | Bloquer et demander une saisie explicite. |
| `seller_address` | Adresse du vendeur | `text` | Recommandé | AF, RC, USER | adresse de correspondance, destinataire, chez | Distinguer l'adresse postale du vendeur de l'adresse de la copropriété et du syndic. | Moyen | Demander la saisie ; conserver le champ `missing` si refus. |
| `seller_account_number` | Numéro de compte copropriétaire | `text` | Recommandé | RC, AF | compte copropriétaire, référence client, compte 450, référence | Conserver les zéros initiaux et séparateurs significatifs ; ne jamais convertir en nombre. | Moyen | Marquer manquant ; ne pas bloquer si vendeur et lots sont identifiés. |

### 3.2 `identification_immeuble`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `property_address` | Adresse de la copropriété | `text` | Obligatoire | FS, RCP, AF, RC, USER | copropriété, immeuble sis, adresse, résidence | Privilégier FS ou RCP ; séparer l'adresse du siège du syndic ; normaliser sans perdre bâtiment ou résidence. | Élevé | Bloquer et demander confirmation à partir de l'adresse du projet. |
| `property_reference` | Référence de la copropriété | `text` | Recommandé | AF, RC, AC, FS | référence copropriété, code immeuble, mandant, dossier | Conserver comme texte ; ne pas confondre avec le compte vendeur ou le numéro d'immatriculation. | Moyen | Marquer manquant sans bloquer. |
| `copropriete_name` | Nom de la copropriété | `text` | Recommandé | FS, AF, RC, RCP | résidence, syndicat des copropriétaires, copropriété | Retenir la dénomination officielle la plus complète ; exclure le nom commercial du syndic. | Faible | Utiliser l'adresse comme repère d'affichage, sans fabriquer de nom. |
| `copropriete_registration_number` | Numéro d'immatriculation | `text` | Recommandé | FS | numéro d'immatriculation, registre national, RNC | Extraire uniquement depuis une fiche synthétique ou un identifiant explicitement qualifié ; conserver le format. | Moyen | Marquer manquant et recommander la fiche synthétique. |
| `total_tantiemes` | Total des tantièmes de la copropriété | `number` | Recommandé | RCP, AC, FS | total tantièmes, dix-millièmes, millièmes, parties communes générales | Associer le total à la clé générale ; ne pas additionner des clés spéciales hétérogènes. | Moyen | Marquer manquant ; ne pas recalculer depuis quelques lots. |
| `building_count` | Nombre de bâtiments | `number` | Optionnel | FS, RCP, DTG, DPE | nombre de bâtiments, bâtiment A, bâtiment B | Compter uniquement si la source indique clairement le périmètre de la copropriété. | Faible | Omettre. |
| `total_lot_count` | Nombre total de lots | `number` | Recommandé | FS, RCP | nombre total de lots, lots principaux, lots secondaires | Conserver le total officiel ; ne pas substituer le nombre de lots d'habitation. | Moyen | Marquer manquant et recommander FS ou RCP. |
| `construction_year` | Année de construction | `number` | Optionnel | FS, DTG, DPE, RCP | année de construction, période de construction, immeuble édifié | N'accepter une année précise que si elle est explicite ; une période reste en valeur brute et ne devient pas une année arbitraire. | Faible | Omettre. |

### 3.3 `lots_vendus`

Les champs de lots sont des listes synchronisées. L'élément d'index `n` de chaque liste se rapporte au même lot. Ce choix doit être arbitré face à une future structure unique `lots[]` ; voir les ambiguïtés finales.

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `lot_number` | Numéro des lots vendus | `list` | Obligatoire | RCP, AF, RC, USER | lot n°, numéro de lot, lots détenus, groupe de lots | Produire une liste de textes ; conserver suffixes et lots composés ; croiser RCP et documents individuels. | Élevé | Bloquer et demander les numéros de lots. |
| `lot_description` | Désignation des lots | `list` | Recommandé | RCP, AF, RC | appartement, cave, parking, garage, local, nature du lot | Aligner avec `lot_number` ; privilégier la désignation juridique du RCP. | Moyen | Marquer l'élément concerné manquant, sans inventer depuis le numéro. |
| `lot_tantiemes` | Tantièmes des lots | `list` | Obligatoire | RCP, AF, AC | tantièmes, millièmes, quote-part, parties communes | Associer chaque valeur à sa clé de répartition ; ne pas agréger général et spécial. | Élevé | Bloquer ou exiger validation explicite si la valeur est indisponible. |
| `lot_building` | Bâtiment des lots | `list` | Optionnel | RCP, AF, RC | bâtiment, bât., entrée | Aligner avec les lots ; conserver les codes alphanumériques. | Faible | Omettre l'élément. |
| `lot_floor` | Étage des lots | `list` | Optionnel | RCP, AF | étage, niveau, rez-de-chaussée, sous-sol | Conserver le libellé lisible et une normalisation textuelle ; ne pas convertir RDC en 0 sans besoin validé. | Faible | Omettre l'élément. |
| `lot_charge_keys` | Clés de charges des lots | `list` | Optionnel | RCP, AF, AC | clé de répartition, charges générales, ascenseur, chauffage | Liste d'objets `{lot_number, key_label, tantiemes, total_key_tantiemes}` ; ne mélanger aucune clé. | Moyen | Omettre et signaler que la répartition détaillée n'a pas été trouvée. |

### 3.4 `syndic`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `syndic_name` | Nom du syndic | `text` | Obligatoire | FS, AF, RC, PV | syndic, représentant légal, administrateur de biens | Privilégier FS et document le plus récent ; distinguer l'agence locale du groupe commercial. | Moyen | Bloquer et demander le nom actuel. |
| `syndic_manager` | Gestionnaire de copropriété | `text` | Optionnel | AF, RC, PV | gestionnaire, principal de copropriété, interlocuteur | Extraire une personne seulement si son rôle est explicite ; ne pas retenir le comptable. | Faible | Omettre. |
| `syndic_address` | Adresse du syndic | `text` | Recommandé | FS, AF, RC, PV | adresse du syndic, siège, agence | Distinguer adresse du syndic, siège du syndicat et adresse de l'immeuble. | Moyen | Marquer manquant et demander vérification. |
| `syndic_phone` | Téléphone du syndic | `text` | Optionnel | AF, RC, PV | téléphone, tél., standard | Normaliser pour affichage français sans modifier l'indicatif international. | Faible | Omettre. |
| `syndic_email` | Email du syndic | `text` | Optionnel | AF, RC, PV | email, courriel, contact | Valider la forme ; préférer l'adresse liée à la copropriété à une adresse générique. | Faible | Omettre. |
| `syndic_mandate_start` | Début du mandat du syndic | `date` | Recommandé | PV | mandat du syndic, durée du mandat, prend effet, désignation | Extraire depuis la résolution adoptée la plus récente ; ne pas utiliser la date de l'AG par défaut. | Moyen | Marquer manquant et recommander le dernier PV d'AG. |
| `syndic_mandate_end` | Fin du mandat du syndic | `date` | Recommandé | PV | échéance du mandat, prendra fin, au plus tard, durée | Conserver la date explicitement votée ; contrôler qu'elle est postérieure au début. | Moyen | Marquer manquant et demander vérification. |

### 3.5 `situation_financiere_vendeur`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `account_statement_date` | Date du relevé de compte | `date` | Obligatoire | RC | relevé au, arrêté au, date d'édition, situation au | Retenir la date de situation du solde, pas une date d'écriture isolée. | Élevé | Bloquer l'usage du solde jusqu'à saisie ou nouvelle pièce. |
| `current_balance_amount` | Solde actuel du vendeur | `amount` | Obligatoire | RC, AF | solde à ce jour, solde du compte, nouveau solde, total du relevé | Extraire montant et signe ensemble ; conserver la valeur brute et vérifier avec débit/crédit. | Élevé | Bloquer et demander un relevé ou une saisie validée. |
| `current_balance_label` | Nature du solde | `text` | Obligatoire | RC, AF | débiteur, créditeur, à payer, en votre faveur | Valeur contrôlée `debiteur`, `crediteur`, `nul`, `uncertain` ; ne pas inférer sans convention comptable fiable. | Élevé | Bloquer l'interprétation même si un montant isolé existe. |
| `unpaid_charges_amount` | Charges impayées | `amount` | Obligatoire | RC, AF | impayé, arriéré, dette, reste dû, relance | Ne pas assimiler automatiquement tout solde débiteur à un impayé ; exiger un libellé ou des échéances dépassées. | Élevé | Statut manquant ; demander vérification explicite, jamais mettre zéro. |
| `treasury_advance_amount` | Avance de trésorerie | `amount` | Recommandé | AF, RC, AC | avance de trésorerie, avance permanente, réserve, compte 1031 | Distinguer avance remboursable, provisions et fonds travaux. | Élevé | Marquer manquant ; ne pas mettre zéro. |
| `seller_financial_comment` | Commentaire sur la situation financière | `text` | Optionnel | RC, AF, USER | observation, commentaire, litige, règlement récent | Synthèse factuelle, sourcée et éditable ; aucune conclusion juridique automatique. | Moyen | Omettre. |
| `payment_method` | Mode de paiement habituel | `text` | Optionnel | AF, RC, USER | prélèvement, virement, chèque, TIP, mandat SEPA | Valeur contrôlée `prelevement`, `virement`, `cheque`, `autre`, `unknown` ; ne pas extraire un simple IBAN comme preuve du mode choisi. | Faible | Omettre. |

### 3.6 `charges_copropriete`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `current_quarter` | Trimestre en cours | `text` | Recommandé | AF | trimestre, période, T1, T2, T3, T4, exigible | Normaliser en `T1` à `T4` avec année ; si période non trimestrielle, conserver la période textuelle. | Moyen | Marquer manquant sans déduire uniquement depuis la date du jour. |
| `annual_budget_amount` | Budget prévisionnel annuel | `amount` | Recommandé | AC, PV, AF | budget prévisionnel, budget voté, exercice | Privilégier AC ou résolution adoptée ; distinguer budget de la copropriété et quote-part vendeur. | Élevé | Marquer manquant et recommander annexes ou PV. |
| `budget_vote_date` | Date de vote du budget | `date` | Recommandé | PV | budget adopté, vote du budget, résolution | Utiliser la date de l'AG ayant adopté le budget, avec résultat de vote positif. | Moyen | Marquer manquant. |
| `charge_lines` | Détail des charges | `list` | Recommandé | AF, AC | rubrique de charges, dépenses, base de répartition, quote-part | Liste `{label, period, total_amount, seller_amount, allocation_key, lot_numbers}` ; ne pas fusionner des libellés différents. | Moyen | Conserver un total s'il existe et signaler le détail manquant. |
| `current_quarter_call_amount` | Appel du trimestre en cours | `amount` | Recommandé | AF | total appel, provision du trimestre, à régler | Extraire le montant de l'appel courant, hors dette antérieure si le document les distingue. | Élevé | Marquer manquant ; ne pas calculer depuis le total dû global. |
| `accounting_period_start` | Début de l'exercice comptable courant | `date` | Recommandé | AC, FS, AF | exercice du, début d'exercice, période | Extraire le début de l'exercice courant identifié ; contrôler la cohérence avec la fin. | Moyen | Marquer manquant. |
| `accounting_period_end` | Fin de l'exercice comptable courant | `date` | Recommandé | AC, FS, AF | exercice au, clôture, fin d'exercice | Extraire la fin du même exercice que `accounting_period_start`. | Moyen | Marquer manquant. |
| `last_approved_period_start` | Début du dernier exercice approuvé | `date` | Recommandé | AC, PV | exercice clos, comptes approuvés, période du | Relier à la résolution d'approbation et non au budget futur. | Moyen | Marquer manquant et recommander PV plus annexes. |
| `last_approved_period_end` | Fin du dernier exercice approuvé | `date` | Recommandé | AC, PV | exercice clos au, clôture, comptes approuvés | Contrôler qu'elle précède ou égale la date d'approbation. | Moyen | Marquer manquant. |
| `approval_date` | Date d'approbation des comptes | `date` | Recommandé | PV | approbation des comptes, résolution adoptée | Date de l'AG où la résolution a été adoptée ; ne pas utiliser la date d'édition des annexes. | Moyen | Marquer manquant. |

### 3.7 `fonds_travaux`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `works_fund_quarterly_contribution` | Cotisation trimestrielle au fonds travaux | `amount` | Recommandé | AF, RC | fonds travaux, cotisation trimestrielle, provision fonds | Extraire la quote-part vendeur du trimestre ; distinguer du total copropriété. | Moyen | Marquer manquant, jamais zéro. |
| `works_fund_annual_amount` | Cotisation annuelle au fonds travaux | `amount` | Recommandé | AF, AC, PV | cotisation annuelle, fonds travaux annuel | Privilégier la valeur explicitement annuelle ; sinon calcul autorisé seulement à partir de toutes les échéances homogènes et signalé comme calculé. | Moyen | Marquer manquant. |
| `works_fund_budget_percentage` | Pourcentage du budget affecté au fonds travaux | `number` | Optionnel | PV, AC | pourcentage fonds travaux, cotisation minimale, % du budget | Stocker le nombre sans symbole `%` ; relier à l'exercice et au budget de référence. | Moyen | Omettre. |
| `works_fund_seller_share_amount` | Part du fonds travaux rattachée aux lots | `amount` | Obligatoire | AF, RC, AC | part fonds travaux, quote-part rattachée au lot, compte 105 | Distinguer le solde attaché aux lots des appels déjà payés ; croiser les lots concernés et la date. | Élevé | Bloquer ou faire confirmer explicitement l'indisponibilité de la donnée. |
| `works_fund_seller_share_date` | Date de la part du fonds travaux | `date` | Recommandé | AF, RC, AC | situation au, après approbation, arrêté au | Associer à la date de situation du montant ; ne pas reprendre la date du PDF par défaut. | Moyen | Marquer manquant et afficher le montant comme non daté. |
| `works_fund_total_amount` | Montant total du fonds travaux de la copropriété | `amount` | Optionnel | AC, FS, PV | total fonds travaux, compte 105, solde fonds | Ne pas confondre avec la part vendeur ou la cotisation annuelle. | Moyen | Omettre. |

### 3.8 `travaux_votes`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `voted_paid_works` | Travaux votés et payés | `list` | Recommandé | PV, AF, RC, AC | travaux votés, appelé, réglé, clôturé | Liste d'objets travaux ; exiger résolution, objet, montant vendeur ou global, état payé et source. | Élevé | Marquer manquant ; ne pas conclure « aucun travaux ». |
| `future_works_calls` | Appels de fonds travaux futurs | `list` | Obligatoire | PV, AF, AC | échéancier, appels à venir, exigible le, travaux | Extraire chaque échéance avec date, objet, montant et périmètre ; exclure les échéances déjà passées sauf impayées. | Élevé | Bloquer ou demander confirmation explicite qu'aucun appel futur n'est connu. |
| `voted_not_called_works` | Travaux votés non encore appelés | `list` | Obligatoire | PV, AC | voté non appelé, non encore exigible, solde à appeler | Relier la résolution au budget et aux appels déjà émis ; ne pas déduire uniquement d'un devis approuvé. | Élevé | Bloquer ou demander confirmation explicite. |
| `works_comment` | Commentaire sur les travaux | `text` | Optionnel | PV, PPT, DTG, USER | observation, calendrier, réserve | Synthèse factuelle des ambiguïtés ; ne pas mélanger travaux seulement recommandés et travaux votés. | Moyen | Omettre. |

Pour les trois listes de travaux, l'objet minimal est : `{title, resolution_number, vote_date, total_amount, seller_amount, call_dates, payment_status, source_document}`. Les propriétés indisponibles restent absentes, jamais à zéro.

### 3.9 `procedures`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `legal_proceedings_description` | Procédures concernant la copropriété | `text` | Obligatoire | FS, PV | procédure judiciaire, administration provisoire, difficulté, assignation, contentieux | Reprendre une description factuelle, la juridiction ou nature si explicite, et la date de source ; aucune interprétation juridique. | Élevé | Demander confirmation ; ne jamais produire automatiquement « aucune procédure ». |
| `legal_proceedings_status` | Statut des procédures | `text` | Recommandé | FS, PV | en cours, clôturée, suspendue, jugement, assignation | Valeur contrôlée `none_confirmed`, `ongoing`, `closed`, `unknown`; `none_confirmed` exige une source explicite et datée. | Élevé | `unknown` et avertissement visible. |
| `collective_loan` | Emprunt collectif en cours | `boolean` | Obligatoire | PV, AC, AF | emprunt collectif, prêt collectif, adhésion, remboursement | `true` ou `false` uniquement sur mention explicite ; le silence produit une absence. | Élevé | Bloquer ou demander confirmation explicite. |
| `collective_loan_description` | Description de l'emprunt collectif | `object` | Recommandé | PV, AC, AF | capital, durée, taux, échéance, organisme prêteur | Objet `{lender, purpose, vote_date, initial_amount, remaining_amount, end_date}` ; ne renseigner que les propriétés sourcées. | Élevé | Si `collective_loan=true`, afficher une réserve obligatoire. |
| `collective_loan_seller_amount` | Part vendeur restant due sur l'emprunt | `amount` | Recommandé | AF, RC, AC | quote-part emprunt, capital restant dû, échéances restantes | Associer au vendeur, aux lots et à une date de situation ; distinguer échéance périodique et capital restant. | Élevé | Si emprunt confirmé, marquer manquant et exiger vérification. |

### 3.10 `informations_complementaires`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `last_ago_date` | Date de la dernière AG ordinaire | `date` | Recommandé | PV | assemblée générale ordinaire, AGO, procès-verbal | Retenir la date de séance du PV ordinaire le plus récent. | Moyen | Marquer manquant et recommander le dernier PV. |
| `last_age_date` | Date de la dernière AG extraordinaire | `date` | Optionnel | PV | assemblée générale extraordinaire, AGE, spéciale | Retenir uniquement une AG explicitement extraordinaire ou spéciale ; son absence peut être normale. | Moyen | Omettre, sans conclure qu'aucune AGE n'a eu lieu. |
| `ppt_status` | Statut du plan pluriannuel de travaux | `text` | Recommandé | PPT, PV, FS | PPPT, PPT, adopté, rejeté, en cours | Valeur contrôlée `not_identified`, `study_pending`, `project_available`, `adopted`, `rejected`, `not_applicable`, `unknown`; PV requis pour adopté/rejeté. | Moyen | `unknown` et recommandation du PPT ou PV. |
| `collective_dpe_status` | Statut du DPE collectif | `text` | Recommandé | DPE, PV, FS | DPE collectif, réalisé, en cours, voté, valable | Valeur contrôlée `available`, `ordered`, `expired`, `not_identified`, `not_applicable`, `unknown`; ne pas utiliser un DPE individuel. | Moyen | `unknown` et recommandation du DPE collectif. |
| `dtg_status` | Statut du diagnostic technique global | `text` | Recommandé | DTG, PV, FS | DTG, diagnostic technique global, réalisé, voté | Valeur contrôlée `available`, `ordered`, `rejected`, `not_identified`, `not_applicable`, `unknown`; un devis seul vaut au mieux `ordered` si voté. | Moyen | `unknown` et recommandation du DTG ou PV. |
| `fiche_synthetique_date` | Date de mise à jour de la fiche synthétique | `date` | Optionnel | FS | dernière mise à jour, fiche synthétique, date d'établissement | Utiliser la date explicitement associée à la fiche, non la date de téléchargement. | Faible | Omettre. |
| `technical_diagnostics_comment` | Commentaire sur les diagnostics collectifs | `text` | Optionnel | DTG, DPE, PPT, USER | validité, réserve, diagnostic, recommandation | Synthèse factuelle et sourcée ; ne pas convertir les recommandations en obligations non établies. | Moyen | Omettre. |
| `additional_information_comment` | Informations complémentaires | `text` | Optionnel | Tous, USER | observation, information, réserve | Réserver aux informations pertinentes sans champ dédié ; exiger une source ou une saisie utilisateur identifiée. | Moyen | Omettre. |

### 3.11 `annexes`

| `field_id` | Libellé utilisateur | Type | Présence | Sources probables | Mots-clés utiles | Règles d'extraction | Risque | Si absent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `annex_documents` | Documents annexés au pré-état daté | `list` | Recommandé | Tous | annexe, pièce jointe, document source | Liste `{document_id, filename, document_type, document_date, included}` ; ne jamais inclure le contenu binaire en base. | Faible | Présenter « Aucun document annexé » seulement après choix utilisateur. |
| `recognized_documents` | Documents reconnus | `list` | Recommandé | Métadonnées de classification | type détecté, confiance, document | Liste des identifiants, noms, types et scores ; ne pas exposer les détails techniques inutiles dans le PDF. | Faible | Signaler que le dossier ne peut pas être analysé. |
| `missing_documents` | Documents recommandés manquants | `list` | Recommandé | Résultat de complétude | document manquant, recommandé, à fournir | Déduire depuis les champs nécessaires non couverts, avec motif ; ne pas affirmer qu'une pièce est légalement obligatoire sans règle validée. | Moyen | Liste vide uniquement si la couverture a été évaluée. |
| `report_reservations` | Réserves du rapport | `list` | Obligatoire | Champs et contrôles de cohérence | douteux, manquant, incohérent, modifié | Générer depuis tous les champs non confirmés et corrections utilisateur ; chaque réserve référence le `field_id` concerné. | Élevé | Bloquer si des champs non confirmés existent mais qu'aucune réserve n'est produite. |

## 4. Contrats des valeurs complexes

### 4.1 `charge_lines`

Chaque élément contient autant que possible :

- `label: text` ;
- `period_start: date` ;
- `period_end: date` ;
- `total_amount: amount` ;
- `seller_amount: amount` ;
- `allocation_key: text` ;
- `lot_numbers: list` ;
- `source_document: text`.

### 4.2 Listes de travaux

Chaque élément de `voted_paid_works`, `future_works_calls` et `voted_not_called_works` contient :

- `title: text` ;
- `resolution_number: text` ;
- `vote_date: date` ;
- `total_amount: amount` ;
- `seller_amount: amount` ;
- `call_dates: list` ;
- `payment_status: text` ;
- `source_document: text`.

### 4.3 `collective_loan_description`

- `lender: text` ;
- `purpose: text` ;
- `vote_date: date` ;
- `initial_amount: amount` ;
- `remaining_amount: amount` ;
- `end_date: date` ;
- `source_document: text`.

### 4.4 `annex_documents`

- `document_id: text` ;
- `filename: text` ;
- `document_type: text` ;
- `document_date: date` ;
- `included: boolean`.

## 5. Matrice synthétique

La « source prioritaire » indique le premier document à consulter, sans supprimer le besoin de croisement.

| `field_id` | Section | Obligatoire | Source prioritaire | Risque |
| --- | --- | --- | --- | --- |
| `date_etablissement` | `identification_vendeur` | Oui | USER | Moyen |
| `lieu_etablissement` | `identification_vendeur` | Non — recommandé | USER | Faible |
| `seller_name` | `identification_vendeur` | Oui | AF | Élevé |
| `seller_address` | `identification_vendeur` | Non — recommandé | AF | Moyen |
| `seller_account_number` | `identification_vendeur` | Non — recommandé | RC | Moyen |
| `property_address` | `identification_immeuble` | Oui | FS | Élevé |
| `property_reference` | `identification_immeuble` | Non — recommandé | AF | Moyen |
| `copropriete_name` | `identification_immeuble` | Non — recommandé | FS | Faible |
| `copropriete_registration_number` | `identification_immeuble` | Non — recommandé | FS | Moyen |
| `total_tantiemes` | `identification_immeuble` | Non — recommandé | RCP | Moyen |
| `building_count` | `identification_immeuble` | Non — optionnel | FS | Faible |
| `total_lot_count` | `identification_immeuble` | Non — recommandé | FS | Moyen |
| `construction_year` | `identification_immeuble` | Non — optionnel | FS | Faible |
| `lot_number` | `lots_vendus` | Oui | RCP | Élevé |
| `lot_description` | `lots_vendus` | Non — recommandé | RCP | Moyen |
| `lot_tantiemes` | `lots_vendus` | Oui | RCP | Élevé |
| `lot_building` | `lots_vendus` | Non — optionnel | RCP | Faible |
| `lot_floor` | `lots_vendus` | Non — optionnel | RCP | Faible |
| `lot_charge_keys` | `lots_vendus` | Non — optionnel | RCP | Moyen |
| `syndic_name` | `syndic` | Oui | FS | Moyen |
| `syndic_manager` | `syndic` | Non — optionnel | AF | Faible |
| `syndic_address` | `syndic` | Non — recommandé | FS | Moyen |
| `syndic_phone` | `syndic` | Non — optionnel | AF | Faible |
| `syndic_email` | `syndic` | Non — optionnel | AF | Faible |
| `syndic_mandate_start` | `syndic` | Non — recommandé | PV | Moyen |
| `syndic_mandate_end` | `syndic` | Non — recommandé | PV | Moyen |
| `account_statement_date` | `situation_financiere_vendeur` | Oui | RC | Élevé |
| `current_balance_amount` | `situation_financiere_vendeur` | Oui | RC | Élevé |
| `current_balance_label` | `situation_financiere_vendeur` | Oui | RC | Élevé |
| `unpaid_charges_amount` | `situation_financiere_vendeur` | Oui | RC | Élevé |
| `treasury_advance_amount` | `situation_financiere_vendeur` | Non — recommandé | AF | Élevé |
| `seller_financial_comment` | `situation_financiere_vendeur` | Non — optionnel | RC | Moyen |
| `payment_method` | `situation_financiere_vendeur` | Non — optionnel | AF | Faible |
| `current_quarter` | `charges_copropriete` | Non — recommandé | AF | Moyen |
| `annual_budget_amount` | `charges_copropriete` | Non — recommandé | AC | Élevé |
| `budget_vote_date` | `charges_copropriete` | Non — recommandé | PV | Moyen |
| `charge_lines` | `charges_copropriete` | Non — recommandé | AF | Moyen |
| `current_quarter_call_amount` | `charges_copropriete` | Non — recommandé | AF | Élevé |
| `accounting_period_start` | `charges_copropriete` | Non — recommandé | AC | Moyen |
| `accounting_period_end` | `charges_copropriete` | Non — recommandé | AC | Moyen |
| `last_approved_period_start` | `charges_copropriete` | Non — recommandé | AC | Moyen |
| `last_approved_period_end` | `charges_copropriete` | Non — recommandé | AC | Moyen |
| `approval_date` | `charges_copropriete` | Non — recommandé | PV | Moyen |
| `works_fund_quarterly_contribution` | `fonds_travaux` | Non — recommandé | AF | Moyen |
| `works_fund_annual_amount` | `fonds_travaux` | Non — recommandé | AF | Moyen |
| `works_fund_budget_percentage` | `fonds_travaux` | Non — optionnel | PV | Moyen |
| `works_fund_seller_share_amount` | `fonds_travaux` | Oui | RC | Élevé |
| `works_fund_seller_share_date` | `fonds_travaux` | Non — recommandé | RC | Moyen |
| `works_fund_total_amount` | `fonds_travaux` | Non — optionnel | AC | Moyen |
| `voted_paid_works` | `travaux_votes` | Non — recommandé | PV | Élevé |
| `future_works_calls` | `travaux_votes` | Oui | PV | Élevé |
| `voted_not_called_works` | `travaux_votes` | Oui | PV | Élevé |
| `works_comment` | `travaux_votes` | Non — optionnel | PV | Moyen |
| `legal_proceedings_description` | `procedures` | Oui | FS | Élevé |
| `legal_proceedings_status` | `procedures` | Non — recommandé | FS | Élevé |
| `collective_loan` | `procedures` | Oui | PV | Élevé |
| `collective_loan_description` | `procedures` | Non — recommandé | PV | Élevé |
| `collective_loan_seller_amount` | `procedures` | Non — recommandé | RC | Élevé |
| `last_ago_date` | `informations_complementaires` | Non — recommandé | PV | Moyen |
| `last_age_date` | `informations_complementaires` | Non — optionnel | PV | Moyen |
| `ppt_status` | `informations_complementaires` | Non — recommandé | PPT | Moyen |
| `collective_dpe_status` | `informations_complementaires` | Non — recommandé | DPE | Moyen |
| `dtg_status` | `informations_complementaires` | Non — recommandé | DTG | Moyen |
| `fiche_synthetique_date` | `informations_complementaires` | Non — optionnel | FS | Faible |
| `technical_diagnostics_comment` | `informations_complementaires` | Non — optionnel | DTG | Moyen |
| `additional_information_comment` | `informations_complementaires` | Non — optionnel | USER | Moyen |
| `annex_documents` | `annexes` | Non — recommandé | Métadonnées | Faible |
| `recognized_documents` | `annexes` | Non — recommandé | Métadonnées | Faible |
| `missing_documents` | `annexes` | Non — recommandé | Complétude | Moyen |
| `report_reservations` | `annexes` | Oui | Champs extraits | Élevé |

## 6. Contrôles de cohérence prioritaires

- `current_balance_amount` doit être interprété avec `current_balance_label` et `account_statement_date`.
- `unpaid_charges_amount` ne peut être dérivé automatiquement du seul solde débiteur.
- `lot_number`, `lot_description`, `lot_tantiemes`, `lot_building` et `lot_floor` doivent conserver le même ordre et la même cardinalité lorsqu'ils sont renseignés.
- `syndic_mandate_end` doit être postérieur à `syndic_mandate_start`.
- `accounting_period_end` doit être postérieur à `accounting_period_start`.
- `last_approved_period_end` doit être postérieur à `last_approved_period_start` et ne pas être postérieur à `approval_date`.
- `works_fund_seller_share_amount` doit être accompagné d'une date ou affiché explicitement comme non daté.
- `future_works_calls` et `voted_not_called_works` ne doivent pas contenir la même échéance dans le même état.
- `collective_loan=false` est incompatible avec une description ou un montant vendeur non nul.
- les statuts `adopted`, `rejected` ou `ordered` doivent posséder une source décisionnelle datée.
- tout champ `uncertain`, `missing`, `inconsistent` ou `manually_edited` doit produire une entrée dans `report_reservations` lorsqu'il affecte le PDF final.

## 7. Ambiguïtés à arbitrer

1. **PRD absent** — `docs/PRD-v1.md` doit confirmer le périmètre, les champs juridiquement nécessaires et les règles bloquantes.
2. **Lots vendus** — les trois identifiants imposés `lot_number`, `lot_description` et `lot_tantiemes` sont définis comme listes synchronisées. Une structure canonique unique `lots[]` serait moins fragile et doit être arbitrée avant l'implémentation.
3. **AGO et AGE** — `last_ago_date` est interprété comme dernière assemblée générale ordinaire et `last_age_date` comme dernière assemblée générale extraordinaire. Cette signification doit être confirmée.
4. **Zéro contre absence** — les montants financiers ne deviennent jamais zéro par défaut. Le produit doit décider dans quels cas une mention explicite « néant » autorise une valeur zéro confirmée.
5. **Solde comptable** — les conventions de signe varient selon les éditions. Le couple montant/libellé doit rester obligatoire tant qu'une convention fiable par source n'est pas définie.
6. **Procédures** — la portée exacte des procédures attendues et la possibilité d'afficher « aucune procédure » nécessitent une règle juridique et une source datée.
7. **Travaux** — les frontières entre travaux payés, appelés, non appelés et simplement recommandés doivent être validées sur des exemples réels de PV et annexes comptables.
8. **PPT, DTG et DPE collectif** — les valeurs `not_applicable` nécessitent des critères réglementaires hors du présent corpus documentaire.
9. **Emprunt collectif** — le niveau de détail requis dans le PDF final n'est pas précisé par les documents disponibles.
10. **Annexes** — il faut décider si `annex_documents` désigne une liste de références, des pièces réellement jointes au PDF, ou les deux avec un indicateur `included`.
11. **Champs supplémentaires** — les champs ajoutés au-delà de la liste minimale doivent être confirmés par le PRD avant d'être rendus obligatoires dans un sprint d'extraction.

## 8. Gouvernance du catalogue

- Toute modification d'un `field_id` après stockage de données nécessite une migration ou une règle de compatibilité.
- Un libellé utilisateur peut évoluer sans modifier le `field_id`.
- L'ajout d'un champ doit préciser section, type, présence, sources, extraction, risque et comportement d'absence.
- Un changement de niveau de risque ou de caractère obligatoire doit être documenté comme décision produit.
- Le catalogue doit rester synchronisé avec les types de documents reconnus et les statuts d'interface.
- Les seuils de confiance et règles d'extraction seront complétés après constitution d'un corpus anonymisé.
