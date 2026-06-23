# Catalogue technique d’extraction

Dernière mise à jour : 2026-06-23

Ce document liste les champs réellement pris en charge par les extracteurs déterministes actuels. Le catalogue produit complet reste `docs/FIELD_CATALOG.md`.

## Versions

- `simple-rules-v1` : Sprint 4A
- `financial-rules-v1` : Sprint 4B
- `complex-rules-v1` : Sprint 4C

## Champs extraits

| field_id | Description métier | Sprint | Extracteur responsable | Version | Statut actuel |
| --- | --- | --- | --- | --- | --- |
| `syndic_name` | Nom du syndic | 4A | simple | `simple-rules-v1` | actif |
| `syndic_manager` | Gestionnaire de copropriété | 4A | simple | `simple-rules-v1` | actif |
| `syndic_address` | Adresse du syndic | 4A | simple | `simple-rules-v1` | actif |
| `syndic_phone` | Téléphone du syndic | 4A | simple | `simple-rules-v1` | actif |
| `syndic_email` | Email du syndic | 4A, renforcé 5.2 | simple | `simple-rules-v1` | actif |
| `property_address` | Adresse de la copropriété | 4A, renforcé 5.2 | simple | `simple-rules-v1` | actif |
| `approval_date` | Date d’approbation des comptes | 4A, renforcé 5.2 | simple | `simple-rules-v1` | actif |
| `last_ago_date` | Date de la dernière AG ordinaire | 4A, renforcé 5.2 | simple | `simple-rules-v1` | actif |
| `last_age_date` | Date de la dernière AG extraordinaire | 4A | simple | `simple-rules-v1` | actif |
| `syndic_mandate_start` | Début du mandat du syndic | 4A | simple | `simple-rules-v1` | actif |
| `syndic_mandate_end` | Fin du mandat du syndic | 4A | simple | `simple-rules-v1` | actif |
| `account_statement_date` | Date du relevé de compte | 4B | financial | `financial-rules-v1` | actif |
| `current_balance_amount` | Solde actuel du vendeur | 4B | financial | `financial-rules-v1` | actif |
| `current_balance_label` | Nature du solde | 4B | financial | `financial-rules-v1` | actif |
| `unpaid_charges_amount` | Charges impayées | 4B | financial | `financial-rules-v1` | actif |
| `treasury_advance_amount` | Avance de trésorerie | 4B | financial | `financial-rules-v1` | actif |
| `seller_financial_comment` | Commentaire sur la situation financière | 4B | financial | `financial-rules-v1` | actif |
| `current_quarter` | Trimestre en cours | 4B | financial | `financial-rules-v1` | actif |
| `annual_budget_amount` | Budget prévisionnel annuel | 4B | financial | `financial-rules-v1` | actif |
| `budget_vote_date` | Date de vote du budget | 4B | financial | `financial-rules-v1` | actif |
| `works_fund_quarterly_contribution` | Cotisation trimestrielle au fonds travaux | 4B | financial | `financial-rules-v1` | actif |
| `works_fund_annual_amount` | Cotisation annuelle au fonds travaux | 4B | financial | `financial-rules-v1` | actif |
| `works_fund_budget_percentage` | Pourcentage du budget affecté au fonds travaux | 4B | financial | `financial-rules-v1` | actif |
| `works_fund_seller_share_amount` | Part du fonds travaux rattachée aux lots | 4B | financial | `financial-rules-v1` | actif |
| `works_fund_seller_share_date` | Date de la part du fonds travaux | 4B | financial | `financial-rules-v1` | actif |
| `voted_paid_works` | Travaux votés et payés | 4C | complex | `complex-rules-v1` | actif |
| `future_works_calls` | Appels de fonds travaux futurs | 4C | complex | `complex-rules-v1` | actif |
| `voted_not_called_works` | Travaux votés non encore appelés | 4C | complex | `complex-rules-v1` | actif |
| `legal_proceedings_description` | Procédures concernant la copropriété | 4C | complex | `complex-rules-v1` | actif |
| `collective_loan` | Emprunt collectif en cours | 4C | complex | `complex-rules-v1` | actif |
| `ppt_status` | Statut du plan pluriannuel de travaux | 4C | complex | `complex-rules-v1` | actif |
| `collective_dpe_status` | Statut du DPE collectif | 4C | complex | `complex-rules-v1` | actif |
| `dtg_status` | Statut du diagnostic technique global | 4C | complex | `complex-rules-v1` | actif |

## Champs du catalogue produit non encore extraits

Ces champs existent dans `docs/FIELD_CATALOG.md` mais ne sont pas encore dans `src/lib/extraction/simple/catalog.ts` :

- `date_etablissement`
- `lieu_etablissement`
- `seller_name`
- `seller_address`
- `seller_account_number`
- `property_reference`
- `total_tantiemes`
- `lot_number`
- `lot_description`
- `lot_tantiemes`
- `charge_lines`
- `voted_paid_works` est extrait comme liste/objet simplifié, mais la structure finale reste à stabiliser pour le PDF.
- `payment_method`
- `accounting_period_start`
- `accounting_period_end`
- `last_approved_period_start`
- `last_approved_period_end`
- `annex_documents`

## Règles transversales

- Les extracteurs ne modifient jamais les champs `manually_edited=true`.
- Les sources sont limitées à des extraits courts.
- Les valeurs contradictoires doivent rester `uncertain` ou `inconsistent` selon le niveau moteur.
- Aucun champ financier n’est inventé ou extrapolé.
- Aucun statut positif/négatif complexe n’est déduit d’un silence documentaire.
