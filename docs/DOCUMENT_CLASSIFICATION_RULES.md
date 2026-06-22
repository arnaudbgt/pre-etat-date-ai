# Règles de classification documentaire

## 1. Objet

Ce document définit les règles de reconnaissance des documents de copropriété du MVP. Il constitue une spécification fonctionnelle pour un futur moteur de classification ; il ne décrit ni prompt, ni fournisseur d'IA, ni implémentation technique.

Types reconnus :

- `appel_de_fonds` ;
- `releve_coproprietaire` ;
- `pv_ag` ;
- `annexe_comptable` ;
- `reglement_copropriete` ;
- `fiche_synthetique` ;
- `dtg` ;
- `ppt` ;
- `dpe_collectif` ;
- `autre`.

Les exemples d'intitulés attribués à des syndics ou logiciels sont indicatifs. Les modèles changent selon l'agence, le logiciel, l'année et le paramétrage du gestionnaire. La marque du syndic est un indice contextuel de poids nul : elle ne doit jamais suffire à classer un document.

## 2. Prétraitement logique attendu

Avant l'application des règles, le texte utilisé pour la reconnaissance doit être normalisé sans altérer le document source :

- passage en minuscules ;
- normalisation des apostrophes, espaces et ligatures ;
- conservation d'une version avec accents et d'une version sans accents ;
- rapprochement du singulier et du pluriel ;
- tolérance aux césures de fin de ligne ;
- tolérance aux erreurs OCR courantes : `0/O`, `1/I/l`, `AG/A.G.`, `DPE/D.P.E.` ;
- analyse renforcée de la première page, des titres, en-têtes et pieds de page ;
- détection séparée des tableaux, numéros de résolutions, montants, dates et numéros de lots.

Un mot isolé tel que « charges », « travaux », « copropriété » ou « assemblée » n'est jamais discriminant.

## 3. Modèle commun de score

Chaque classe ciblée reçoit un score brut compris entre 0 et 100.

| Signal | Pondération indicative |
| --- | ---: |
| Intitulé exact ou quasi exact en première page | +35 |
| Expression fortement discriminante | +15, au maximum deux fois |
| Mot-clé positif complémentaire | +4, au maximum cinq fois |
| Indice structurel majeur | +10, au maximum deux fois |
| Indice structurel secondaire | +5, au maximum deux fois |
| Mot-clé négatif fort | −25 |
| Mot-clé négatif faible | −8 |
| Structure incompatible | −20 |

Le score final est borné entre 0 et 100. La répétition d'un même terme dans les en-têtes ou pieds de page ne compte qu'une fois.

### Seuils de décision

| Score | Interprétation |
| --- | --- |
| 85–100 | Classification très probable |
| 70–84 | Classification probable |
| 50–69 | Classification incertaine, vérification nécessaire |
| 0–49 | Classe non retenue |

Une classe ciblée est retenue automatiquement uniquement si :

1. son score atteint 70 ;
2. elle possède au moins un intitulé discriminant ou deux indices structurels majeurs ;
3. elle devance la deuxième classe d'au moins 15 points.

Dans le cas contraire, le statut de classification est incertain. Si aucune classe ciblée n'atteint 50, le document est classé `autre`.

### Documents composites

Un appel de fonds peut contenir un extrait de compte ; une convocation peut contenir des annexes comptables ou un projet de PPT. La classe principale est déterminée par le titre et la fonction de la première section, puis par la proportion de pages. La présence d'une annexe embarquée ne doit pas écraser la nature du document principal.

Si deux ensembles de pages possèdent chacun un titre propre et des structures fortement discriminantes, le document doit être signalé comme composite. Son découpage éventuel relève d'un traitement futur.

---

## 4. `appel_de_fonds`

### Mots-clés positifs

- appel de fonds ;
- avis d'appel de fonds ;
- appel de provisions ;
- avis d'échéance ;
- montant à régler ;
- montant exigible ;
- date d'exigibilité ;
- provisions pour charges courantes ;
- provisions travaux ;
- fonds travaux ;
- budget prévisionnel ;
- votre quote-part ;
- tantièmes ;
- coupon de paiement ;
- prochain appel.

### Mots-clés négatifs

- procès-verbal ;
- convocation à l'assemblée générale ;
- ordre du jour ;
- annexe 1, annexe 2, annexe 3, annexe 4 ou annexe 5 en titre principal ;
- état financier après répartition ;
- règlement de copropriété ;
- diagnostic de performance énergétique ;
- plan pluriannuel de travaux ;
- solde de tout compte uniquement, sans somme appelée ni échéance future.

« Relevé de compte » est un signal négatif faible seulement lorsqu'il constitue le titre principal. Il n'est pas négatif lorsqu'il désigne un tableau secondaire inclus dans l'appel.

### Indices structurels

- première page adressée nominativement à un copropriétaire ;
- identification de la copropriété, du copropriétaire et de ses lots ;
- date d'édition, période et date d'exigibilité proches du titre ;
- tableau de rubriques de charges avec budget, tantièmes et quote-part ;
- montant total immédiatement payable clairement mis en évidence ;
- coordonnées bancaires, mandat SEPA, talon ou coupon de règlement ;
- distinction entre charges courantes, travaux, avances et fonds travaux ;
- présence possible d'un court relevé de compte en fin de document.

### Expressions fréquentes

- « Nous vous prions de bien vouloir régler la somme de… » ;
- « Cet appel est exigible le… » ;
- « Total appel copropriétaire » ;
- « Solde antérieur à l'appel » ;
- « Provision du trimestre » ;
- « Appel budget du … au … » ;
- « Votre quote-part selon la clé de répartition » ;
- « À régler avant le… ».

### Score de confiance spécifique

- +35 si le titre principal contient « appel de fonds », « avis d'appel » ou « appel de provisions » ;
- +15 pour l'association montant à régler + date d'exigibilité ;
- +15 pour un tableau budget/tantièmes/quote-part ;
- +10 pour un coupon, un IBAN ou une instruction de paiement ;
- −25 si « procès-verbal » ou « convocation » est le titre principal ;
- plafonner à 65 si aucun montant demandé et aucune date d'exigibilité ne sont détectés.

### Variantes de syndics et logiciels

- syndics traditionnels : « Appel de fonds », « Avis d'appel de fonds », « Appel trimestriel » ;
- Matera : « Appel de fonds » accompagné de tableaux de provisions, solde antérieur et fonds travaux ;
- Vilogi : appel comprenant identification, détail budgétaire, montant dû, extrait de compte et coupon ;
- Val Compta ou syndic bénévole : noms de fichiers du type `APPEL_DU_[date]_[compte]_[nom].pdf` ;
- logiciels Septeo/ICS et équivalents : « Appel de provisions », parfois suivi d'un « extrait de compte » sur une page séparée ;
- grands réseaux : variantes « avis d'échéance copropriété » ou « appel de charges », à accepter seulement avec les indices financiers attendus.

---

## 5. `releve_coproprietaire`

### Mots-clés positifs

- relevé de compte copropriétaire ;
- compte individuel ;
- situation de compte ;
- extrait de compte ;
- historique du compte ;
- détail des écritures ;
- solde antérieur ;
- solde débiteur ;
- solde créditeur ;
- débit ;
- crédit ;
- libellé de l'opération ;
- règlement ;
- reprise de solde ;
- compte 450 ou 450-1 ;
- période du … au ….

### Mots-clés négatifs

- montant à régler avant le ;
- appel exigible le ;
- prochain appel de fonds ;
- procès-verbal ;
- résolution soumise au vote ;
- état financier après répartition ;
- diagnostic ;
- règlement de copropriété.

Les écritures « appel de fonds » dans le corps d'un relevé sont normales et ne constituent pas un titre d'appel de fonds.

### Indices structurels

- tableau chronologique comportant plusieurs écritures ;
- colonnes date, libellé, débit, crédit et solde ;
- solde d'ouverture et solde à la date d'édition ;
- identification d'un copropriétaire, d'un compte et de lots ;
- alternance d'appels, règlements, régularisations et reprises de solde ;
- période comptable souvent plus longue qu'un trimestre ;
- absence de coupon ou d'instruction principale de paiement.

### Expressions fréquentes

- « Relevé de compte sur la période du… au… » ;
- « Solde de votre compte à ce jour » ;
- « Détail de vos opérations » ;
- « À nouveau / reprise de solde » ;
- « Règlement par virement / prélèvement » ;
- « Régularisation de charges » ;
- « Total mouvements débit / crédit ».

### Score de confiance spécifique

- +35 pour un titre « relevé de compte », « compte individuel » ou « situation de compte » ;
- +20 pour un tableau date/libellé/débit/crédit/solde ;
- +10 si au moins trois écritures de dates différentes sont détectées ;
- −20 si un montant unique exigible et une échéance dominent la première page ;
- plafonner à 60 en présence d'une seule écriture sans historique ni solde.

### Variantes de syndics et logiciels

- cabinets professionnels : « Relevé de compte copropriétaire » ou « Situation comptable individuelle » ;
- logiciels Septeo/ICS : « Extrait de compte » ou relevé joint à un appel de fonds ;
- Vilogi : « Relevé de compte du copropriétaire » avec écritures de régularisation ;
- Matera : tableau récapitulatif expliquant le solde, parfois inclus dans l'appel de fonds ;
- grands réseaux : « Compte de charges », « Compte travaux » ou « Historique de compte » ;
- syndics bénévoles : tableau libre issu d'un logiciel comptable, parfois sans logo mais avec colonnes débit/crédit.

---

## 6. `pv_ag`

### Mots-clés positifs

- procès-verbal ;
- procès verbal ;
- assemblée générale ;
- assemblée générale ordinaire ;
- assemblée générale extraordinaire ;
- feuille de présence ;
- président de séance ;
- secrétaire de séance ;
- scrutateur ;
- résolution n° ;
- résultat du vote ;
- adoptée ;
- rejetée ;
- abstentions ;
- opposants ;
- tantièmes présents ou représentés ;
- heure d'ouverture ;
- heure de clôture.

### Mots-clés négatifs

- convocation à l'assemblée générale ;
- vous êtes convoqué ;
- pouvoir à retourner ;
- formulaire de vote par correspondance vierge ;
- projet de résolution sans résultat ;
- ordre du jour seul ;
- compte rendu du conseil syndical ;
- relevé de décisions sans votes ni séance.

### Indices structurels

- date, heure et lieu d'une assemblée déjà tenue ;
- désignation du président, du secrétaire et éventuellement des scrutateurs ;
- résolutions numérotées suivies de résultats de vote ;
- décompte « pour / contre / abstention » en voix ou tantièmes ;
- mentions des copropriétaires absents, opposants ou non représentés ;
- signatures ou emplacement de signature du bureau ;
- pagination longue, fréquemment accompagnée d'annexes et de devis.

### Expressions fréquentes

- « L'assemblée générale, après en avoir délibéré… » ;
- « Cette résolution est adoptée à la majorité de l'article… » ;
- « Sont présents ou représentés… » ;
- « Le président constate que l'assemblée peut valablement délibérer » ;
- « Vote pour / vote contre / abstention » ;
- « Plus aucune question n'étant à l'ordre du jour, la séance est levée… ».

### Score de confiance spécifique

- +35 si « procès-verbal » et « assemblée générale » figurent dans le titre ;
- +15 si le bureau de séance est désigné ;
- +20 si plusieurs résolutions comportent chacune un résultat de vote ;
- −30 si le titre principal est « convocation » ;
- −20 si les résolutions sont seulement « proposées » ou « soumises » sans résultat ;
- plafonner à 60 sans résultat de vote ni indication d'une séance passée.

### Variantes de syndics et logiciels

- cabinets professionnels : « Procès-verbal de l'assemblée générale ordinaire du… » ;
- grands réseaux : « Procès-verbal AG », « PV de l'assemblée générale » ;
- syndics bénévoles : « Compte rendu de l'AG » ; cette variante exige des résultats de vote pour éviter les faux positifs ;
- plateformes numériques : export structuré avec une fiche par résolution et des badges « adoptée/rejetée » ;
- AG dématérialisées : mentions du vote électronique ou du formulaire de vote par correspondance dépouillé.

---

## 7. `annexe_comptable`

### Mots-clés positifs

- annexe 1 ;
- annexe 2 ;
- annexe 3 ;
- annexe 4 ;
- annexe 5 ;
- état financier après répartition ;
- comptes de gestion générale ;
- budget prévisionnel ;
- opérations courantes ;
- travaux et opérations exceptionnelles ;
- travaux non clôturés ;
- situation de trésorerie ;
- créances ;
- dettes ;
- provisions et avances ;
- charges et produits ;
- exercice clos ;
- clés de répartition.

### Mots-clés négatifs

- relevé de compte copropriétaire ;
- votre compte individuel ;
- montant à régler ;
- appel exigible ;
- grand livre détaillé ;
- balance générale seule ;
- facture ;
- relevé bancaire ;
- budget isolé sans numéro d'annexe ni comptes annuels.

### Indices structurels

- titre numéroté « Annexe 1 » à « Annexe 5 » ;
- tableaux denses couvrant l'ensemble du syndicat, non un seul copropriétaire ;
- comparaison exercice clos, exercice précédent et budget voté ;
- numéros de comptes issus du plan comptable de copropriété ;
- colonnes approuvé, réalisé, budget ou à voter ;
- succession possible des cinq annexes réglementaires dans un même PDF ;
- totaux équilibrés et présentation en euros à deux décimales.

### Expressions fréquentes

- « État financier après répartition à la date de clôture » ;
- « Compte de gestion générale de l'exercice clos réalisé » ;
- « Budget prévisionnel de l'exercice à venir » ;
- « Comptes de gestion pour opérations courantes » ;
- « État des travaux et opérations exceptionnelles votés non encore clôturés » ;
- « Solde en attente sur travaux ».

### Score de confiance spécifique

- +35 pour un titre explicite « annexe comptable » ou « annexe [1–5] » ;
- +20 si au moins deux intitulés réglementaires d'annexes sont détectés ;
- +15 pour une structure exercice/réalisé/budget avec comptes numérotés ;
- −25 si le document concerne explicitement un seul compte copropriétaire ;
- −20 pour une simple facture ou un relevé bancaire ;
- plafonner à 65 si aucun numéro d'annexe ni intitulé réglementaire n'est présent.

### Variantes de syndics et logiciels

- éditions réglementaires : « Annexe 1 – État financier après répartition » jusqu'à « Annexe 5 – Travaux non clôturés » ;
- Citya et autres cabinets professionnels : regroupement des cinq annexes dans les « comptes annuels » ;
- logiciels de syndic : « États comptables », « Dossier de comptes », « Comptes de la copropriété » ;
- syndics bénévoles : tableaux simplifiés ; ils ne sont classés ici que si la structure des annexes réglementaires reste reconnaissable ;
- pièces jointes de convocation : annexes précédées d'une page de garde ou intégrées à un PDF composite.

---

## 8. `reglement_copropriete`

### Mots-clés positifs

- règlement de copropriété ;
- état descriptif de division ;
- EDD ;
- modificatif au règlement de copropriété ;
- acte modificatif ;
- division de l'immeuble ;
- désignation des parties communes ;
- parties privatives ;
- tantièmes de copropriété ;
- quote-part des parties communes ;
- destination de l'immeuble ;
- jouissance des parties communes ;
- lots de copropriété ;
- servitudes ;
- publié au service de publicité foncière ;
- notaire.

### Mots-clés négatifs

- règlement intérieur ;
- charte de l'immeuble ;
- livret d'accueil ;
- contrat de syndic ;
- procès-verbal ;
- appel de fonds ;
- diagnostic ;
- projet de règlement non signé ou non publié.

### Indices structurels

- acte juridique long, structuré en titres, chapitres et articles ;
- désignation cadastrale et description détaillée de l'ensemble immobilier ;
- liste de nombreux lots avec bâtiment, étage, nature et tantièmes ;
- tableaux de répartition des parties communes générales ou spéciales ;
- mentions notariales, références de publication et dates d'actes ;
- clauses relatives à l'usage, la destination, l'administration et la répartition des charges ;
- présence possible de plans et d'actes modificatifs successifs.

### Expressions fréquentes

- « Le présent règlement de copropriété a pour objet… » ;
- « État descriptif de division » ;
- « Les parties privatives comprennent… » ;
- « Les parties communes générales comprennent… » ;
- « Le lot numéro… comprend… et les …/10 000èmes » ;
- « Destination de l'immeuble » ;
- « Répartition des charges communes » ;
- « Reçu par Maître…, notaire… ».

### Score de confiance spécifique

- +40 pour un titre « règlement de copropriété » ;
- +20 pour l'association état descriptif de division + lots + tantièmes ;
- +10 pour les mentions notariales et de publicité foncière ;
- −35 si le titre est « règlement intérieur » ;
- −20 si le document comporte moins de deux pages et aucune désignation de lots ;
- un modificatif publié est classé dans cette catégorie avec un indicateur de variante « modificatif ».

### Variantes de syndics et producteurs

- extranet de syndic : « Règlement de copropriété », « RCP + EDD » ou « Règlement et modificatifs » ;
- études notariales : « État descriptif de division et règlement de copropriété » ;
- documents anciens numérisés : « Cahier des charges et règlement de copropriété » ;
- actes postérieurs : « Modificatif à l'état descriptif de division », « Acte modificatif au règlement » ;
- syndics bénévoles : copie scannée parfois dépourvue de nom de fichier explicite, identifiable par sa structure notariale.

---

## 9. `fiche_synthetique`

### Mots-clés positifs

- fiche synthétique de la copropriété ;
- registre national des copropriétés ;
- registre d'immatriculation ;
- numéro d'immatriculation ;
- date de dernière mise à jour ;
- identification du syndicat des copropriétaires ;
- représentant légal ;
- organisation juridique ;
- données financières ;
- nombre total de lots ;
- lots à usage d'habitation ;
- exercice comptable ;
- impayés ;
- fonds travaux ;
- procédure d'administration provisoire.

### Mots-clés négatifs

- certificat d'immatriculation seul ;
- formulaire d'immatriculation vierge ;
- carnet d'entretien ;
- fiche immeuble commerciale ;
- fiche signalétique interne du syndic ;
- état daté ;
- diagnostic technique ;
- fiche synthétique d'un appareil ou d'un logement.

### Indices structurels

- document court, généralement organisé en rubriques synthétiques ;
- identification, organisation juridique, caractéristiques techniques et données financières ;
- numéro d'immatriculation au registre national ;
- nombre de bâtiments, lots principaux, lots d'habitation et stationnements ;
- dates de début et de fin d'exercice comptable ;
- informations sur les procédures, dettes fournisseurs, impayés et fonds travaux ;
- date annuelle de mise à jour.

### Expressions fréquentes

- « Fiche synthétique de la copropriété » ;
- « Données d'identification du syndicat des copropriétaires » ;
- « Numéro d'immatriculation au registre national » ;
- « Représentant légal de la copropriété » ;
- « Nombre de lots à usage d'habitation » ;
- « Montant des impayés par les copropriétaires » ;
- « Présence d'un fonds de travaux ».

### Score de confiance spécifique

- +40 pour le titre exact ;
- +20 pour un numéro d'immatriculation associé aux rubriques identification/finances ;
- +15 si au moins quatre familles de données réglementaires sont présentes ;
- −30 pour un simple certificat d'immatriculation ;
- −25 si le mot « fiche synthétique » concerne un équipement, un diagnostic ou une offre commerciale ;
- plafonner à 60 sans numéro d'immatriculation ni identification du syndicat.

### Variantes de syndics et producteurs

- registre national : « Fiche synthétique de la copropriété » ;
- extranets Foncia, Citya, Nexity et autres réseaux : classement fréquent sous « Documents de l'immeuble », sans modification nécessaire du titre interne ;
- Matera et syndics en ligne : téléchargement sous un nom de fichier simplifié contenant « fiche-synthetique » ;
- syndics bénévoles : export du registre ou reproduction des rubriques dans un PDF ;
- attention aux « fiches immeuble » propres aux logiciels de gestion, qui ne sont pas des fiches synthétiques réglementaires.

---

## 10. `dtg`

### Mots-clés positifs

- diagnostic technique global ;
- DTG ;
- état apparent des parties communes ;
- état technique de l'immeuble ;
- analyse des améliorations possibles ;
- situation du syndicat au regard de ses obligations ;
- évaluation sommaire du coût ;
- liste des travaux nécessaires ;
- conservation de l'immeuble ;
- performance énergétique ;
- échéancier de travaux ;
- bureau d'études ;
- thermicien ;
- pathologie du bâtiment.

### Mots-clés négatifs

- dossier de diagnostic technique ;
- dossier technique amiante ;
- diagnostic termites ;
- diagnostic plomb ;
- DPE individuel ;
- simple audit énergétique ;
- plan pluriannuel de travaux en titre principal ;
- décision d'engager un DTG dans un PV, sans rapport joint ;
- devis pour la réalisation d'un DTG.

### Indices structurels

- rapport établi par un professionnel du bâtiment ou bureau d'études ;
- description et inspection des façades, toitures, structures, réseaux et équipements communs ;
- état apparent, désordres, photographies et niveau d'urgence ;
- analyse de la situation de la copropriété au regard de ses obligations ;
- volet énergétique ou renvoi vers un DPE/audit ;
- liste de travaux avec estimations financières et horizon pluriannuel ;
- méthodologie, visite sur site, réserves et annexes techniques.

### Expressions fréquentes

- « Diagnostic technique global de la copropriété » ;
- « État apparent des parties communes et équipements communs » ;
- « Analyse des améliorations possibles de la gestion technique et patrimoniale » ;
- « Évaluation sommaire du coût et liste des travaux nécessaires » ;
- « Scénario de travaux à dix ans » ;
- « Synthèse des pathologies observées » ;
- « Priorité urgente / court terme / moyen terme ».

### Score de confiance spécifique

- +40 pour le titre développé « diagnostic technique global » ;
- +20 pour une inspection multi-composants avec photographies et pathologies ;
- +15 pour une liste chiffrée de travaux à plusieurs horizons ;
- −25 si « DTG » apparaît uniquement dans une résolution d'AG ou un devis ;
- −25 pour un dossier regroupant seulement plusieurs diagnostics réglementaires ;
- plafonner à 65 sans état du bâti ni préconisations de travaux.

### Variantes de syndics et producteurs

- bureaux d'études : « Diagnostic technique global – Rapport final » ;
- architectes : « Audit global de l'immeuble / DTG » ;
- opérateurs de rénovation : « DTG avec audit énergétique » ;
- extranets de syndics : noms abrégés `DTG.pdf`, parfois rangés parmi les diagnostics techniques ;
- syndics bénévoles : devis intitulé « proposition DTG » à ne pas confondre avec le rapport effectivement réalisé.

---

## 11. `ppt`

Cette classe couvre le projet de plan pluriannuel de travaux (`PPPT`) et le plan adopté (`PPT`). Le futur moteur doit conserver cette distinction comme sous-type, sans créer deux classes principales.

### Mots-clés positifs

- projet de plan pluriannuel de travaux ;
- plan pluriannuel de travaux ;
- PPPT ;
- PPT ;
- programme de travaux sur dix ans ;
- échéancier des travaux ;
- hiérarchisation des travaux ;
- estimation du coût des travaux ;
- sauvegarde de l'immeuble ;
- santé et sécurité des occupants ;
- économies d'énergie ;
- réduction des émissions de gaz à effet de serre ;
- scénario de travaux ;
- année 1 à année 10.

### Mots-clés négatifs

- plan de travaux d'une entreprise ;
- planning de chantier ;
- plan architectural ;
- devis isolé ;
- fonds travaux seul ;
- résolution d'adoption du PPT sans étude jointe ;
- DTG en titre principal sans programme pluriannuel autonome ;
- plan prévisionnel d'entretien non chiffré.

### Indices structurels

- liste de travaux organisée sur une période de dix ans ;
- priorités, années ou horizons temporels ;
- estimation financière par poste et coût total ;
- justification par conservation, sécurité ou performance énergétique ;
- description de scénarios ou bouquets de travaux ;
- récapitulatif annuel et articulation possible avec le fonds travaux ;
- mention de présentation ou d'adoption en assemblée générale.

### Expressions fréquentes

- « Projet de plan pluriannuel de travaux » ;
- « Travaux nécessaires à la sauvegarde de l'immeuble » ;
- « Échéancier recommandé sur les dix prochaines années » ;
- « Estimation sommaire du coût des travaux » ;
- « Scénario 1 / scénario 2 » ;
- « Priorité 1 : immédiat ; priorité 2 : moyen terme » ;
- « Plan adopté par l'assemblée générale du… ».

### Score de confiance spécifique

- +40 pour le titre « projet de plan pluriannuel de travaux » ou « plan pluriannuel de travaux » ;
- +20 pour un échéancier couvrant plusieurs années avec coûts par poste ;
- +15 pour la combinaison conservation/sécurité/performance énergétique ;
- −25 si le terme apparaît uniquement dans un PV ou une convocation ;
- −20 pour un planning de chantier concernant un seul marché déjà voté ;
- plafonner à 65 sans échéancier ni chiffrage pluriannuel.

### Variantes de syndics et producteurs

- bureaux d'études : « PPPT – Projet de plan pluriannuel de travaux » ;
- architectes : « Plan patrimoine à 10 ans » ou « Programme pluriannuel prévisionnel » ;
- syndics : « Projet PPT soumis à l'AG » puis « PPT adopté » ;
- Citya et autres réseaux : usage possible de l'acronyme `PPPT` dans les convocations et espaces documentaires ;
- logiciels de syndic : nom de fichier abrégé `PPT`, qui nécessite les indices d'échéancier pour éviter la confusion avec une présentation PowerPoint.

---

## 12. `dpe_collectif`

### Mots-clés positifs

- diagnostic de performance énergétique collectif ;
- DPE collectif ;
- DPE immeuble ;
- bâtiment d'habitation collectif ;
- consommation énergétique ;
- émissions de gaz à effet de serre ;
- énergie primaire ;
- kWhEP/m²/an ;
- kg CO2/m²/an ;
- étiquette énergie ;
- étiquette climat ;
- classe énergétique ;
- numéro ADEME ;
- diagnostiqueur certifié ;
- systèmes collectifs de chauffage ;
- recommandations d'amélioration énergétique.

### Mots-clés négatifs

- appartement ;
- maison individuelle ;
- logement n° ;
- lot n° en objet principal ;
- DPE individuel ;
- audit énergétique réglementaire ;
- étude thermique ;
- diagnostic technique global en titre principal ;
- diagnostic vierge ou exemple ;
- attestation RE2020.

La présence d'un numéro de lot n'est pas éliminatoire si le périmètre explicite reste l'ensemble du bâtiment.

### Indices structurels

- périmètre portant sur un immeuble ou plusieurs bâtiments de copropriété ;
- étiquettes énergie et climat graduées de A à G ;
- consommations conventionnelles et émissions rapportées au mètre carré ;
- description de l'enveloppe et des systèmes collectifs ;
- numéro d'enregistrement ADEME et date de validité ;
- identification et certification du diagnostiqueur ;
- recommandations de travaux ou bouquets d'amélioration ;
- surfaces et caractéristiques globales du bâtiment plutôt que d'un seul logement.

### Expressions fréquentes

- « Diagnostic de performance énergétique du bâtiment collectif » ;
- « Ce diagnostic a été réalisé pour l'ensemble de l'immeuble » ;
- « Consommation conventionnelle d'énergie primaire » ;
- « Émissions de gaz à effet de serre » ;
- « Montants estimés des dépenses annuelles d'énergie » ;
- « Recommandations visant à améliorer la performance énergétique » ;
- « Numéro d'enregistrement ADEME ».

### Score de confiance spécifique

- +40 pour « DPE collectif » ou « bâtiment d'habitation collectif » dans le titre ;
- +20 pour les deux étiquettes A–G et leurs unités réglementaires ;
- +15 pour un numéro ADEME et l'identification d'un diagnostiqueur ;
- −30 si le périmètre est explicitement un appartement, une maison ou un lot unique ;
- −20 si le document est un audit énergétique sans format DPE ;
- plafonner à 65 si le périmètre collectif n'est pas explicite.

### Variantes de syndics et producteurs

- diagnostiqueurs certifiés : « DPE bâtiment collectif », « DPE immeuble collectif » ;
- bureaux d'études : « Diagnostic de performance énergétique à l'échelle de la copropriété » ;
- extranets de syndics : fichiers abrégés `DPE_collectif.pdf` ou classés dans « Diagnostics parties communes » ;
- gestionnaires : « DPE copropriété » ;
- attention aux DPE individuels transmis par erreur avec les documents du lot : ils doivent rester `autre`.

---

## 13. `autre`

`autre` est une classe de rejet contrôlé, et non une catégorie documentaire homogène.

### Mots-clés positifs

Les termes suivants renforcent `autre` lorsqu'ils apparaissent comme titre principal :

- convocation à l'assemblée générale ;
- ordre du jour ;
- formulaire de vote par correspondance vierge ;
- pouvoir ;
- carnet d'entretien ;
- contrat de syndic ;
- devis ;
- facture ;
- relevé bancaire ;
- attestation d'assurance ;
- état daté ;
- pré-état daté déjà constitué ;
- certificat d'immatriculation seul ;
- diagnostic amiante, plomb, termites ou gaz ;
- DPE individuel ;
- règlement intérieur ;
- bail ;
- titre de propriété ;
- taxe foncière ;
- pièce d'identité ;
- document illisible ou page blanche.

### Mots-clés négatifs

Tous les intitulés exacts et indices structurels majeurs d'une classe ciblée sont négatifs pour `autre` :

- appel de fonds avec montant exigible ;
- relevé chronologique débit/crédit/solde ;
- procès-verbal avec résultats de vote ;
- annexe comptable réglementaire ;
- règlement de copropriété et état descriptif de division ;
- fiche synthétique réglementaire ;
- rapport DTG ;
- échéancier PPPT/PPT ;
- DPE portant explicitement sur le bâtiment collectif.

### Indices structurels

- aucune structure correspondant aux neuf classes ciblées ;
- contenu relevant d'un contrat, courrier, devis, facture ou diagnostic hors périmètre ;
- document trop court, incomplet ou illisible pour être reconnu ;
- assemblage hétérogène sans document principal identifiable ;
- résultat ambigu entre plusieurs classes, avec scores faibles.

### Expressions fréquentes

- « Convocation à l'assemblée générale » ;
- « Bon pour pouvoir » ;
- « Devis valable jusqu'au… » ;
- « Facture n°… » ;
- « Contrat de syndic » ;
- « État daté – mutation d'un lot » ;
- « Diagnostic de performance énergétique – appartement » ;
- « Règlement intérieur de l'immeuble ».

### Score de confiance spécifique

Le score de `autre` repose sur le meilleur score obtenu par les classes ciblées :

- 95 si le document possède un titre hors périmètre explicite et qu'aucune classe ciblée ne dépasse 30 ;
- 80 si aucune classe ciblée ne dépasse 40 ;
- 60 si le meilleur score ciblé se situe entre 41 et 49 ;
- 50 et statut « à vérifier » si plusieurs classes ciblées sont ambiguës ;
- ne jamais attribuer automatiquement `autre` à un document illisible : utiliser un motif distinct `insufficient_text` avec vérification requise.

### Variantes de syndics et logiciels

- grands réseaux : convocations, contrats, attestations, courriers et pièces de mutation issus de leurs extranets ;
- syndics en ligne : exports unitaires aux noms courts ou assemblages ZIP convertis en PDF ;
- syndics bénévoles : scans sans titre, tableurs imprimés ou courriers libres ;
- diagnostiqueurs : DPE individuels et diagnostics techniques sans rapport avec les parties communes ;
- notaires : état daté, titre de propriété et actes de vente, qui restent hors des classes documentaires d'entrée.

---

## 14. Règles de départage prioritaires

| Ambiguïté | Règle de départage |
| --- | --- |
| Appel de fonds / relevé copropriétaire | Montant futur exigible et instructions de paiement → appel ; historique multi-écritures et solde à date → relevé. |
| PV d'AG / convocation | Résultats de vote et séance passée → PV ; ordre du jour et résolutions proposées → autre. |
| Annexe comptable / relevé copropriétaire | Comptes globaux du syndicat et annexes 1–5 → annexe ; compte d'une personne avec débit/crédit → relevé. |
| Règlement de copropriété / règlement intérieur | Acte notarié, lots et tantièmes → règlement de copropriété ; règles de vie sans division juridique → autre. |
| Fiche synthétique / certificat d'immatriculation | Rubriques techniques, juridiques et financières → fiche ; simple preuve d'immatriculation → autre. |
| DTG / PPT | Diagnostic global du bâti et pathologies → DTG ; échéancier chiffré de travaux à dix ans → PPT. |
| DTG / DPE collectif | Inspection technique multi-composants → DTG ; format réglementaire énergie/climat A–G → DPE collectif. |
| PPT / PV d'AG | Rapport autonome avec programme et coûts → PPT ; simple résolution d'adoption → PV. |
| DPE collectif / DPE individuel | Périmètre immeuble et systèmes collectifs → collectif ; appartement, maison ou lot unique → autre. |

## 15. Informations à conserver avec le résultat

Le futur résultat de classification devra comporter au minimum :

- la classe proposée ;
- le score final ;
- la deuxième classe et son score ;
- l'écart entre les deux scores ;
- les signaux positifs déclenchés ;
- les signaux négatifs déclenchés ;
- les indices structurels observés ;
- le caractère simple ou composite du PDF ;
- un motif explicite lorsque la classe est `autre` ;
- le statut `confirmed`, `uncertain` ou `insufficient_text` de la classification.

## 16. Validation avant mise en production

Ces règles devront être calibrées sur un corpus anonymisé couvrant plusieurs syndics, logiciels, régions, années et qualités de scan. Les seuils ne pourront être considérés comme validés qu'après mesure d'une matrice de confusion par classe.

Le jeu de validation devra notamment contenir :

- des appels de fonds intégrant un relevé de compte ;
- des convocations contenant des projets de résolution et annexes ;
- des PV accompagnés de devis ou de formulaires de vote ;
- les cinq annexes comptables isolées et regroupées ;
- des règlements anciens et leurs modificatifs ;
- des certificats d'immatriculation proches des fiches synthétiques ;
- des DTG intégrant un volet énergétique et un programme de travaux ;
- des PPPT annexés à des PV ;
- des DPE collectifs et individuels du même immeuble ;
- des documents hors périmètre et des scans de mauvaise qualité.

Objectifs minimaux recommandés : précision globale supérieure à 90 %, rappel par classe supérieur à 85 %, et aucun passage automatique en confiance élevée pour un document `insufficient_text`.

## 17. Références documentaires

- Service Public, missions du syndic et documents accessibles aux copropriétaires : fiche synthétique, règlement, PV, comptes individuels et appels de fonds ;
- Service Public, assemblée générale des copropriétaires et formalisation des décisions ;
- Légifrance, règles comptables des syndicats de copropriétaires et distinction entre charges, provisions et avances ;
- Anah, guides relatifs à la rénovation énergétique, au DTG et au plan pluriannuel de travaux ;
- exemples publics d'éditions de logiciels et syndics, notamment Matera, Vilogi, Val Compta, Septeo/ICS et IzySyndic.
