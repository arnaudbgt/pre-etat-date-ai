# Analyse fonctionnelle - Pré-état daté

## Parcours utilisateur V1

1. Le vendeur arrive sur le site.
2. Il renseigne les informations de base : nom, email, adresse du bien, numéro de lot si connu.
3. Il téléverse un premier document, idéalement un appel de fonds.
4. Le système identifie le type de document et extrait les premières informations.
5. Le système affiche les documents encore nécessaires.
6. Le vendeur téléverse les documents complémentaires.
7. L’IA extrait les données champ par champ.
8. Le système génère un pré-état daté structuré.
9. Les champs incertains ou manquants sont mis en évidence.
10. Le vendeur peut télécharger le PDF.

## Documents demandés V1

### Obligatoires ou fortement recommandés

- Dernier appel de fonds trimestriel.
- Avant-dernier appel de fonds.
- Relevé individuel du compte copropriétaire.
- Dernier procès-verbal d’assemblée générale approuvant les comptes.
- Annexe comptable ou document mentionnant le fonds travaux.

### Optionnels

- PV d’AG des deux années précédentes.
- Règlement de copropriété.
- Etat descriptif de division.
- Carnet d’entretien.
- Diagnostic technique global si disponible.

## Rubriques du pré-état daté

1. Identification de l’immeuble.
2. Coordonnées du copropriétaire cédant.
3. Numéros des lots concernés.
4. Partie financière : sommes dues par le vendeur.
5. Sommes dont le syndicat pourrait être débiteur envers le vendeur.
6. Sommes incombant au nouvel acquéreur.
7. Annexe quote-part N-1 / N-2.
8. Informations diverses : impayés, dette fournisseurs, fonds travaux.

## Gestion des incertitudes

Chaque champ extrait doit disposer de :

- valeur proposée ;
- document source ;
- page source si disponible ;
- score de confiance ;
- statut : confirmé, incertain, manquant, incohérent.

## Règle de génération

Le PDF final doit afficher clairement les données extraites et indiquer les champs manquants ou à vérifier.
