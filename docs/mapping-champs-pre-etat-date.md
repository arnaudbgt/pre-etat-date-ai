# Mapping des champs - Pré-état daté

## Principes

Chaque champ du pré-état daté doit être associé à :

- un identifiant interne ;
- un libellé cible ;
- une source prioritaire ;
- des sources alternatives ;
- des mots-clés ;
- une règle d’extraction ;
- un niveau de risque ;
- un comportement si le champ est absent.

## A - Identification

| ID | Champ | Source prioritaire | Sources alternatives | Risque |
|---|---|---|---|---|
| A1 | Adresse immeuble | Appel de fonds | PV AG, relevé copropriétaire | Faible |
| A2 | Nom copropriété | Appel de fonds | PV AG | Faible |
| A3 | Nom vendeur | Relevé copropriétaire | Appel de fonds | Faible |
| A4 | Adresse vendeur | Relevé copropriétaire | Appel de fonds | Faible |
| A5 | Numéros de lots | Relevé copropriétaire | Appel de fonds, état descriptif | Moyen |
| A6 | Nom syndic | Appel de fonds | PV AG | Faible |
| A7 | Date de clôture des comptes | PV AG | Annexes comptables | Moyen |

## B - Sommes dues par le vendeur

| ID | Champ | Source prioritaire | Mots-clés | Risque |
|---|---|---|---|---|
| B1 | Provisions exigibles budget prévisionnel | Relevé copropriétaire | solde débiteur, reste à payer, appel de fonds | Faible |
| B2 | Dépenses hors budget exigibles | Relevé copropriétaire | travaux, appel exceptionnel, hors budget | Moyen |
| B3 | Charges impayées exercices antérieurs | Relevé copropriétaire | impayé, solde antérieur, report | Faible |
| B4 | Sommes exigibles du fait de la vente | Relevé copropriétaire | article 33, mutation, vente | Elevé |
| B5 | Avances constituant la réserve | Relevé copropriétaire | avance, réserve, fonds de roulement | Moyen |
| B6 | Provisions spéciales | Relevé copropriétaire | provision spéciale, avance | Moyen |
| B7 | Avances représentant un emprunt | Relevé copropriétaire | emprunt, avance emprunt | Elevé |
| B8 | Prêt quote-part vendeur exigible | PV AG / appel travaux | prêt, emprunt, quote-part | Elevé |
| B9 | Condamnations ou autres causes | PV AG | condamnation, contentieux | Elevé |
| B10 | Honoraires syndic document | Tarif syndic / facture | pré-état daté, honoraires, mutation | Moyen |

## C - Sommes dues au vendeur par le syndicat

| ID | Champ | Source prioritaire | Mots-clés | Risque |
|---|---|---|---|---|
| C1 | Avances constituant la réserve | Relevé copropriétaire | avance permanente, réserve, fonds de roulement | Moyen |
| C2 | Provisions spéciales | Relevé copropriétaire | provision spéciale | Moyen |
| C3 | Avances emprunt | Relevé copropriétaire | emprunt, avance | Elevé |
| C4 | Provisions encaissées postérieures | Relevé copropriétaire | période postérieure, déchéance du terme | Elevé |
| C5 | Solde créditeur exercice antérieur | Relevé copropriétaire | solde créditeur, avoir, crédit | Faible |

## D - Sommes incombant au nouvel acquéreur

| ID | Champ | Source prioritaire | Mots-clés | Risque |
|---|---|---|---|---|
| D1 | Reconstitution avances | Même source que C1 | avance, reconstitution | Faible |
| D2 | Provisions futures budget prévisionnel T+1 | Dernier appel de fonds | trimestre, échéance, provision | Faible |
| D3 | Provisions futures budget prévisionnel T+2 | Dernier appel de fonds | trimestre, échéance, provision | Moyen |
| D4 | Provisions futures budget prévisionnel T+3 | Dernier appel de fonds | trimestre, échéance, provision | Moyen |
| D5 | Dépenses hors budget futures | Appel travaux / PV AG | travaux votés, appel futur, hors budget | Moyen |

## E - Annexe quote-part N-1 / N-2

| ID | Champ | Source prioritaire | Mots-clés | Risque |
|---|---|---|---|---|
| E1 | Quote-part appelée budget N-1 | Décompte annuel charges | appelé, budget prévisionnel | Moyen |
| E2 | Quote-part réelle budget N-1 | Décompte annuel charges | réel, régularisation, répartition | Moyen |
| E3 | Quote-part appelée hors budget N-1 | Décompte annuel charges | travaux, hors budget, appelé | Moyen |
| E4 | Quote-part réelle hors budget N-1 | Décompte annuel charges | travaux, réel, répartition | Moyen |
| E5 | Quote-part appelée budget N-2 | Décompte annuel charges | appelé, budget prévisionnel | Moyen |
| E6 | Quote-part réelle budget N-2 | Décompte annuel charges | réel, régularisation, répartition | Moyen |
| E7 | Quote-part appelée hors budget N-2 | Décompte annuel charges | travaux, hors budget, appelé | Moyen |
| E8 | Quote-part réelle hors budget N-2 | Décompte annuel charges | travaux, réel, répartition | Moyen |

## F - Informations diverses copropriété

| ID | Champ | Source prioritaire | Mots-clés | Risque |
|---|---|---|---|---|
| F1 | Existence impayés copropriété | PV AG / annexe comptable | impayés copropriétaires, débiteurs, créances | Faible |
| F2 | Montant impayés copropriété | PV AG / annexe comptable | impayés, créances, débiteurs | Faible |
| F3 | Existence dette fournisseurs | Annexe comptable | fournisseurs, dettes, passif | Faible |
| F4 | Montant dette fournisseurs | Annexe comptable | fournisseurs, dettes, passif | Faible |
| F5 | Existence fonds travaux | Appel de fonds / annexe comptable | fonds travaux, ALUR | Faible |
| F6 | Part fonds travaux rattachée au lot | Appel de fonds / annexe comptable | part fonds travaux, lot principal | Moyen |
| F7 | Dernière cotisation fonds travaux | Appel de fonds | cotisation fonds travaux, ALUR | Faible |

## Comportement par défaut

- Si le champ est trouvé dans une source prioritaire avec un montant clair : statut confirmé.
- Si le champ est trouvé dans une source alternative : statut incertain.
- Si plusieurs montants contradictoires sont trouvés : statut incohérent.
- Si aucun montant n’est trouvé : statut manquant.
